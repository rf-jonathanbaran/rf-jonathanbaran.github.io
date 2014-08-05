function ObjFile(data)
{
  this.parseVertex = function (array,str)
  {
    array[array.length] = str.replace(/vt?n? /,"").trim().split(/\s+/);
  }
  this.parseFace = function (obj,library,str)
  {
    var points = str.replace(/f\s+/,"").trim().split(/\s+/);
    var tmp = [
      library.vertex_array,
      library.texture_array,
      library.normal_array,
      library.tangent_array
    ];
    var tmp2 = [
      obj.final_v,
      obj.final_vt,
      obj.final_vn,
      obj.final_va
    ];
    vertex_indices = this.vertex_indices;
    points.forEach(function(p, index, array){
    var prop = p.split("/");
    vertex_indices.push(prop[0]*1);
     for(var i=0;i<prop.length;i++)
     {
     var val = prop[i];
     if(val!="")
       tmp2[i].push(tmp[i][val-1]);
     }
    });
  }
  this.loadOBJ = function (str)
  {
    var library = {};
    library.vertex_array = new Array();
    library.normal_array = new Array();
    library.texture_array = new Array();
    library.tangent_array = new Array();

    var obj = {};
    obj.final_v = new Array();
    obj.final_vt = new Array();
    obj.final_vn = new Array();
    obj.final_va = new Array();

    var lines = str.split(/\n/);
    for(i = 0;i<lines.length;i++)
    {
      var line = lines[i];
      if(line.search("v ") != -1)
	this.parseVertex(library.vertex_array,line);
      if(line.search("vt ") != -1)
	this.parseVertex(library.texture_array,line);
      if(line.search("vn ") != -1)
	this.parseVertex(library.normal_array,line);
      if(line.search("f ") != -1)
        this.parseFace(obj,library,line);
    }
	var a;
    for(var i=0;i<obj.final_v.length;i++)
    {
      a = obj.final_v[i];
      this.vertex.push(a[0]*1.0,a[1]*1.0,a[2]*1.0);
    }
    for(var i=0;i<obj.final_v.length;i++)
    {
      a = obj.final_vt[i];
      this.texture.push(a[0]*1.0,a[1]*1.0);
    }
    for(var i=0;i<obj.final_v.length;i++)
    {
      a = obj.final_vn[i];
      this.normals.push(a[0]*1.0,a[1]*1.0,a[2]*1.0);
    }
  }
  this.vertex = new Array();
  this.vertex_indices = new Array();
  this.texture  = new Array();
  this.normals  = new Array();
  this.tangents = new Array();

  this.loadOBJ(data);
}



