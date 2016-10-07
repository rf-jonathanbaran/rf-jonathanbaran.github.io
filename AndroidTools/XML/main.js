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
  function getStringEntry(index) {
    var entry = stringPool[index];
    if(entry) {
      entry = entry.value;
    }
    return entry;
  }
  function parseResourceMapping(chunk) {

  }
  function parseStartNameSpace(chunk) {
    var resp = {};
    resp.prefix = getStringEntry(chunk.data.getInt32(0, true));
    resp.url = getStringEntry(chunk.data.getInt32(4, true));
    return resp;
  }
  function parseEndNameSpace(chunk) {
    var resp = {};
    resp.prefix = getStringEntry(chunk.data.getInt32(0, true));
    resp.url = getStringEntry(chunk.data.getInt32(4, true));
    return resp;
  }
  function parseElementAttributeData(buffer, offset) {
    var resp = {};
    resp.size = buffer.getInt16(offset+0, true);
    resp.zero = buffer.getInt8(offset+2);
    resp.dataType = buffer.getInt8(offset+3);
    resp.data = new DataView(buffer.buffer,buffer.byteOffset+offset+4,resp.size-4);
    return resp;
  }
  function parseElementAttribute(buffer, offset) {
    var resp = {};
    resp.ns = getStringEntry(buffer.getInt32(offset+0, true));
    resp.name = getStringEntry(buffer.getInt32(offset+4, true));
    resp.rawValue = buffer.getInt32(offset+8, true);
    if(resp.rawValue != -1) {
      resp.rawValue = getStringEntry(resp.rawValue);
    }
    resp.data = parseElementAttributeData(buffer, offset+12);
    return { val: resp, offset: offset+12+resp.data.size};
  }

  function parseStartElementType(chunk) {
    var resp = {};
    resp.ns = getStringEntry(chunk.data.getInt32(0, true));
    resp.name = getStringEntry(chunk.data.getInt32(4, true));
    resp.attributeSize = chunk.data.getUint16(10, true);
    resp.attributeCount = chunk.data.getUint16(12, true);
    resp.idIndex = chunk.data.getUint16(14, true);
    resp.classIndex = chunk.data.getUint16(16, true);
    resp.styleIndex = chunk.data.getUint16(18, true);
    resp.attr = {};
    var offset = 20;
    for(var i=0;i<resp.attributeCount;i++) {
      var entry = parseElementAttribute(chunk.data, offset);
      resp.attr[entry.val.name] = entry.val;
      offset = entry.offset;
    }
    return resp;
  }
  function parseEndElementType(chunk) {
    var resp = {};
    resp.ns = getStringEntry(chunk.data.getInt32(0, true));
    resp.name = getStringEntry(chunk.data.getInt32(4, true));
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
        case CHUNK_TYPES.RES_XML_RESOURCE_MAP_TYPE: {
          parseResourceMapping(c);
        }
        break;
        case CHUNK_TYPES.RES_XML_START_NAMESPACE_TYPE: {
          parseStartNameSpace(c);
        }
        break;
        case CHUNK_TYPES.RES_XML_START_ELEMENT_TYPE: {
          var ele = parseStartElementType(c);
          if(ele.name == "manifest") {
            var log = "Build:<br/>"+
              "Package: "+ele.attr.package.rawValue+"<br />"+
              "Version Name: "+ele.attr.versionName.rawValue+"<br />"+
              "Version Code: "+ele.attr.versionCode.data.data.getUint32(0,true)+"<hr />";
            var out = document.getElementById("out");
            out.innerHTML = log + out.innerHTML;
          }
        }
        break;
        case CHUNK_TYPES.RES_XML_END_NAMESPACE_TYPE: {
          parseEndNameSpace(c);
        }
        break;
        case CHUNK_TYPES.RES_XML_End_ELEMENT_TYPE: {
          parseEndElementType(c);
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
