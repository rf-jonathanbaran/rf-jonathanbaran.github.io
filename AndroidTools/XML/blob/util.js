define(function () {
  function readBlobAsX(X) {
    return function(file) {
      return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.addEventListener("load", function () {
          resolve(reader.result);
        }, false);
        reader.addEventListener("error", function(e){
          reject(e);
        }, false);
        reader["readAs"+X](file);
      });
    }
  }
  return {
    readBlobAsText: readBlobAsX("Text"),
    readBlobAsArrayBuffer: readBlobAsX("ArrayBuffer"),
    readBlobAsDataURL: readBlobAsX("DataURL")
  }
});
