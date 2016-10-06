"use strict";
requirejs(["blob/util", "pkcs"],function(blobUtil, pkcs) {

  function configureFileDragDrop(ele, regex, func) {
    ele.ondragover = function(ev){ev.preventDefault()}
    ele.drop_funcs = ele.drop_funcs ||[];
    ele.drop_funcs.push({regex:new RegExp(regex),func:func});
    ele.ondrop = function(ev) {
      ev.preventDefault();
      var data = ev.dataTransfer;
      if(data.files && data.files.length > 0) {
        var files = [];
        ele.drop_funcs.forEach(function(o){
          o.valid = true
        });
        for(var i =0; i<data.files.length;i++) {
          files[i]=data.files[i];
          ele.drop_funcs.forEach(function(o){
            o.valid &= o.regex.exec(files[i].name)&&1
          });
        }
        ele.drop_funcs.forEach(function(o){
          if(o.valid){
            o.func(files);
          }
        });
      }
    }
  }
  var CHUNK_TYPES =  {
        RES_NULL_TYPE               : 0x0000,
        RES_STRING_POOL_TYPE        : 0x0001,
        RES_TABLE_TYPE              : 0x0002,
        RES_XML_TYPE                : 0x0003,

        // Chunk types in RES_XML_TYPE
        RES_XML_FIRST_CHUNK_TYPE    : 0x0100,
        RES_XML_START_NAMESPACE_TYPE: 0x0100,
        RES_XML_END_NAMESPACE_TYPE  : 0x0101,
        RES_XML_START_ELEMENT_TYPE  : 0x0102,
        RES_XML_END_ELEMENT_TYPE    : 0x0103,
        RES_XML_CDATA_TYPE          : 0x0104,
        RES_XML_LAST_CHUNK_TYPE     : 0x017f,
        // This contains a uint32_t array mapping strings in the string
        // pool back to resource identifiers.  It is optional.
        RES_XML_RESOURCE_MAP_TYPE   : 0x0180,

        // Chunk types in RES_TABLE_TYPE
        RES_TABLE_PACKAGE_TYPE      : 0x0200,
        RES_TABLE_TYPE_TYPE         : 0x0201,
        RES_TABLE_TYPE_SPEC_TYPE    : 0x0202,
        RES_TABLE_LIBRARY_TYPE      : 0x0203
    };

  function readChunks(u8) {
    var position = 0;
    var chunks = []

    while(position < u8.byteLength) {
      var type = u8.getInt16(position+0, true);
      var headerSize = u8.getInt16(position+2, true);
      var size = u8.getInt32(position+4, true);

      //console.log(type, headerSize, size);

      var header = new DataView(u8.buffer, u8.byteOffset + position, headerSize);
      var data = new DataView(u8.buffer, u8.byteOffset + position + headerSize, size - headerSize);
      chunks.push({ type: type, header: header, data : data });
      position+=size;
    }
    return chunks;
  }
  function get16BitString(u8, offset, length) {
      var resp = "";
      for(var i=0;i<length;i++) {
        resp += String.fromCharCode(u8.getInt16(offset+i*2, true));
      }
      return resp;
  }

  function parseStringPool(chunk) {
    var poolHeader = {
      stringCount: chunk.header.getInt32(8+0, true),
      styleCount: chunk.header.getInt32(8+4, true),
      flags: chunk.header.getInt32(8+8, true),
      stringsStart: chunk.header.getInt32(8+12, true),
      stylesStart: chunk.header.getInt32(8+16, true)
    };
    //console.log(poolHeader);
    var poolStart = poolHeader.stringsStart-chunk.header.byteLength;
    var poolOffsets = [];
    var strings = [];
    for(var i=0;i<poolHeader.stringCount;i++) {
      var offset = chunk.data.getInt32(i*4, true);
      var strLength = chunk.data.getInt16(poolStart+offset, true);
      var str = get16BitString(chunk.data, poolStart+offset+2, strLength);
      var entry = {
          offset: offset,
          length: strLength,
          value: str
      };
      //console.log(entry);
      poolOffsets.push(entry);
      strings.push(str);
    }
    var out = document.getElementById("out");

    var ul = document.createElement("ul");
    strings.forEach(function (s) {
      var li = document.createElement("li");
      li.textContent = s;
      ul.appendChild(li);
    });
    out.innerHTML = "";
    out.appendChild(ul);
    stringPool = poolOffsets;
  }

  var stringPool = [];
  var resourceMapping = [];

  function parseXML(buffer) {
    var chunks = readChunks(buffer);
    chunks.forEach(function(c) {
      switch(c.type) {
        case CHUNK_TYPES.RES_XML_TYPE: {
          parseXML(c.data);
        }
        break;
        case CHUNK_TYPES.RES_STRING_POOL_TYPE: {
          parseStringPool(c);
        }
        break;
        case RES_XML_RESOURCE_MAP_TYPE: {
          parseResourceMapping(c);
        }
      }
    });

  }

  configureFileDragDrop(document.getElementById("out"),"\\.apk",function(files) {
    if(files.length > 0) {
      blobUtil.readBlobAsArrayBuffer(files[0]).
        then(JSZip.loadAsync).
        then(function (zip) {
          zip.file("META-INF/CERT.RSA").async("arraybuffer").
            then(function(buffer) {
              return pkcs.parseCertificate(new Uint8Array(buffer));
            }).then(function(cert_info) {
              zip.file("AndroidManifest.xml").async("arraybuffer").
              then(function(buffer) {
                var signer = cert_info.SignedData.results[0].signers[0];
                var issuer = signer.issuerAndSerialNumber.Issuer;
                parseXML(new DataView(buffer));
                var out = document.getElementById("out");
                out.innerHTML = "<div>Signed by: "+issuer.CN+" - "+issuer.O+" "+issuer.OU+" - "+issuer.L+", "+issuer.S+", "+issuer.C+"</div><hr />"+out.innerHTML;
              })
          });
          
        });
    }
  });

});
