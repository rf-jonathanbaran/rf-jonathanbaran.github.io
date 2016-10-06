"use strict";
define(function() { 

  		var OID = {
			// pkcs 1
			RsaEncryption : "1.2.840.113549.1.1.1",
			// pkcs 7
			Data : "1.2.840.113549.1.7.1",
			SignedData : "1.2.840.113549.1.7.2",
			EnvelopedData : "1.2.840.113549.1.7.3",
			SignedAndEnvelopedData : "1.2.840.113549.1.7.4",
			DigestedData : "1.2.840.113549.1.7.5",
			EncryptedData : "1.2.840.113549.1.7.6",
			// pkcs 9
			ContentType : "1.2.840.113549.1.9.3",
			MessageDigest  : "1.2.840.113549.1.9.4",
			SigningTime : "1.2.840.113549.1.9.5",
			Countersignature : "1.2.840.113549.1.9.6"
		}

    var CERT_OID = {
        "2.5.4.6": "C",
        "2.5.4.11": "OU",
        "2.5.4.10": "O",
        "2.5.4.3": "CN",
        "2.5.4.7": "L",
        "2.5.4.8": "S",
        "2.5.4.12": "T",
        "2.5.4.42": "GN",
        "2.5.4.43": "I",
        "2.5.4.4": "SN",
        "1.2.840.113549.1.9.1": "E-mail"
    };

  function berToJavaScript(byteArray) {
      "use strict";
      var result = {};
      var position = 0;

      result.cls              = getClass();
      result.structured       = getStructured();
      result.tag              = getTag();
      var length              = getLength(); // As encoded, which may be special value 0

      if (length === 0x80) {
          length = 0;
          while (byteArray[position + length] !== 0 || byteArray[position + length + 1] !== 0) {
              length += 1;
          }
          result.byteLength   = position + length + 2;
          result.contents     = byteArray.subarray(position, position + length);
      } else {
          result.byteLength   = position + length;
          result.contents     = byteArray.subarray(position, result.byteLength);
      }

      result.raw              = byteArray.subarray(0, result.byteLength); // May not be the whole input array
      return result;

      function getClass() {
          var cls = (byteArray[position] & 0xc0) / 64;
          // Consumes no bytes
          return cls;
      }

      function getStructured() {
          var structured = ((byteArray[0] & 0x20) === 0x20);
          // Consumes no bytes
          return structured;
      }

      function getTag() {
          var tag = byteArray[0] & 0x1f;
          position += 1;
          if (tag === 0x1f) {
              tag = 0;
              while (byteArray[position] >= 0x80) {
                  tag = tag * 128 + byteArray[position] - 0x80;
                  position += 1;
              }
              tag = tag * 128 + byteArray[position] - 0x80;
              position += 1;
          }
          return tag;
      }

      function getLength() {
          var length = 0;

          if (byteArray[position] < 0x80) {
              length = byteArray[position];
              position += 1;
          } else {
              var numberOfDigits = byteArray[position] & 0x7f;
              position += 1;
              length = 0;
              for (var i=0; i<numberOfDigits; i++) {
                  length = length * 256 + byteArray[position];
                  position += 1;
              }
          }
          return length;
      }
  }

  function parseCertificate(byteArray) {
      var asn1 = berToJavaScript(byteArray);
      if (asn1.cls !== 0 || asn1.tag !== 16 || !asn1.structured) {
          throw new Error("This can't be an X.509 certificate. Wrong data type.");
      }

      var cert = {asn1: asn1};  // Include the raw parser result for debugging
      var pieces = berListToJavaScript(asn1.contents);
      var contentType = berObjectIdentifierValue(pieces[0].contents);
      if(contentType == OID.SignedData) {
        if (pieces[1].cls !== 2 || pieces[1].tag !== 0 || !pieces[1].structured) {
            throw new Error("Bad signed data. Not a SEQUENCE.");
        }
        cert.SignedData = parseSignedData(pieces[1].contents);
      }

      return cert;
  }

  function parseSignedData(byteArray) {
      var dataSeq = berListToJavaScript(byteArray);
      var sig = {asn1: dataSeq};   // Useful for debugging
      sig.results = [];
      dataSeq.forEach(function(o) {
        if(o.cls !== 0 || o.tag !== 16 || !o.structured) {
            throw new Error("Bad signed data. Sequence element wrong type");
        }
        var pieces = berListToJavaScript(o.contents);
        var entry = { asn1: pieces };
        sig.results.push(entry);
        if(pieces.length < 4 || pieces.length > 6) {
            throw new Error("Bad signed data. Expected SEQ > 4 and < 6. Found "+pieces.length);
        }
        var signerSets = berListToJavaScript(pieces[pieces.length-1].contents);
        entry.signers = [];
        signerSets.forEach(function(ele) {
          entry.signers.push(parseSignerInfo(ele.contents));
        });
      });
      return sig;
  }

  function parseSignerInfo(byteArray) {
      var dataSeq = berListToJavaScript(byteArray);
      var signer = {asn1: dataSeq};
      if(dataSeq.length < 5 || dataSeq.length > 7) {
          throw new Error("Bad signer info. Expected SEQ > 4 and < 6. Found "+pieces.length);
      }
      signer.issuerAndSerialNumber = parseIssuerAndSerialNumber(dataSeq[1].contents);
      return signer;
  }

  function parseIssuerAndSerialNumber(byteArray) {
      var dataSeq = berListToJavaScript(byteArray);
      var issuer = {asn1: dataSeq};
      issuer.Issuer = parseIssuer(dataSeq[0].contents)
      issuer.SerialNumber = new DataView( new Uint8Array(dataSeq[1].contents).buffer ).getInt32(0, false);
      return issuer;
  }

  function parseIssuer(byteArray) {
      var dataSeq = berListToJavaScript(byteArray);
      var issuer = {asn1: dataSeq};
      dataSeq.forEach(function(o) {
        var setComponents = berListToJavaScript(berListToJavaScript(o.contents)[0].contents);
        var OID = berObjectIdentifierValue(setComponents[0].contents);
        var val;
        if(val = CERT_OID[OID]) {
          issuer[val] = berPrintableString(setComponents[1].contents);
        }
      });
      return issuer;
  }

  function berPrintableString(byteArray) {
    var arr = [];
    Array.prototype.push.apply(arr, byteArray);
    return arr.map(x => String.fromCharCode(x)).join("");
  }

  function berListToJavaScript(byteArray) {
      var result = new Array();
      var nextPosition = 0;
      while (nextPosition < byteArray.length) {
          var nextPiece = berToJavaScript(byteArray.subarray(nextPosition));
          result.push(nextPiece);
          nextPosition += nextPiece.byteLength;
      }
      return result;
  }

  function berBitStringValue(byteArray) {
      return {
          unusedBits: byteArray[0],
          bytes: byteArray.subarray(1)
      };
  }

  function berObjectIdentifierValue(byteArray) {
      var oid = Math.floor(byteArray[0] / 40) + "." + byteArray[0] % 40;
      var position = 1;
      while(position < byteArray.length) {
          var nextInteger = 0;
          while (byteArray[position] >= 0x80) {
              nextInteger = nextInteger * 0x80 + (byteArray[position] & 0x7f);
              position += 1;
          }
          nextInteger = nextInteger * 0x80 + byteArray[position];
          position += 1;
          oid += "." + nextInteger;
      }
      return oid;
  }

    return {
      parseCertificate: parseCertificate
    }

});
