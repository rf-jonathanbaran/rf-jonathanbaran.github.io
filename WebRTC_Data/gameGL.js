"use strict";
var context, canvas, webRTC;

var gl;

var camera = mat4.create();
var mvMatrix = mat4.create();
var pMatrix = mat4.create();

var p1XY = new Float32Array([ 0, 0.75, 180 ]);
var p2XY = new Float32Array([ 0, 0.75, 180 ]);

var previousT = -1;
var keyboardBuffer = [];

var KEY_A = 65;
var KEY_S = 83;
var KEY_D = 68;
var KEY_W = 87;

var fragment_shader_src = "precision mediump float;"
		+ "precision mediump int;"
		+ "uniform sampler2D uSampler;"
		+ "varying vec2 vTextureCoord;"
		+ "void main(void)"
		+ "{"
		+ "  vec4 textureColor = texture2D(uSampler, vec2(vTextureCoord.s, 1.0 - vTextureCoord.t));"
		+ "  gl_FragColor = textureColor;"
		// + " gl_FragColor = vec4(1.,1.,1.,0);"
		+ "}";

var vertext_shader_src = "precision mediump float;"
		+ "precision mediump int;  "

		+ "attribute vec3 aVertexPosition;" + "attribute vec2 aTextureCoord;"

		+ "uniform mat4 uMVMatrix;" + "uniform mat4 uPMatrix;"

		+ "varying vec2 vTextureCoord;"

		+ "void main(void)" + "{"
		+ "  gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);"
		+ "  vTextureCoord = aTextureCoord;" + "}";

var Reader = {};

Reader.getAJAX = function(address,data)
{
  var result = null;
  if(data != null)
     address+=data;
  $.ajax({async: false,url: address, dataType: "text",success: function (data, textStatus) {result = data;}});
  return result;
}

Reader.getJSON = function(address,data)
  {
    var ret;
    var ajaxParam = {
       'url': address+data,
       'type':'GET',
       'dataType': 'json',
       'async': false
       };
    ajaxParam.success = function(data){ret = data;};
    $.ajax(ajaxParam);

    return ret;
  }
Reader.getImage = function(address,data,callback)
{
  var ret = new Image();
  ret.src = address+data;
  //alert(address+data);
  ret.onload = function(){callback(ret)};
  return ret;
}

function GL_Texture(linear) {
	this.TEXTURE_ID = gl.createTexture();
	this.src = "";
	this.bind = function(uSamplerIDX, channel, channel_index) {
		gl.activeTexture(channel);
		gl.bindTexture(gl.TEXTURE_2D, this.TEXTURE_ID);
		gl.uniform1i(uSamplerIDX, channel_index);
	}
	var TEXID = this.TEXTURE_ID;
	this.load = function(IMG) {
		this.src = IMG.src;
		gl.bindTexture(gl.TEXTURE_2D, TEXID);
		gl
				.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
						gl.UNSIGNED_BYTE, IMG);
		// gl.generateMipmap(gl.TEXTURE_2D);
		if (linear == null)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		else
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.bindTexture(gl.TEXTURE_2D, null);
	};
}

function initGL(canvas) {
	try {
		gl = canvas.getContext("experimental-webgl");
		gl.enable(gl.DEPTH_TEST);
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	} catch (e) {
	}
	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
	}
}
function getShader(gl, shaderScript, type) {
	var shader = gl.createShader(type);

	gl.shaderSource(shader, shaderScript);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}
	return shader;
}
var shaderProgram;
function initShaders() {
	var fragmentShader = getShader(gl, fragment_shader_src, gl.FRAGMENT_SHADER);
	var vertexShader = getShader(gl, vertext_shader_src, gl.VERTEX_SHADER);
	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}
	gl.useProgram(shaderProgram);
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram,
			"aVertexPosition");
	shaderProgram.vertexTextureAttribute = gl.getAttribLocation(shaderProgram,
			"aTextureCoord");

	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	gl.enableVertexAttribArray(shaderProgram.vertexTextureAttribute);

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram,
			"uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram,
			"uMVMatrix");
	shaderProgram.textureSampler = gl.getUniformLocation(shaderProgram,
			"uSampler")
}

function gameKeyDown(e) {
	keyboardBuffer[e.keyCode] = true;
}

function gameKeyUp(e) {
	keyboardBuffer[e.keyCode] = false;
}

function updateLogic(deltaT) {
	var updatedPos = false;
	var updatedRot = false;
	if (keyboardBuffer[KEY_A]) {
		p1XY[2] += 2;
		updatedRot = true;
	}
	if (keyboardBuffer[KEY_D]) {
		p1XY[2] -= 2;
		updatedRot = true;
	}
	var velocity = 0;
	if (keyboardBuffer[KEY_W]) {
		velocity += .750;
		updatedPos = true;
	}
	if (keyboardBuffer[KEY_S]) {
		velocity -= .750;
		updatedPos = true;
	}
	var dX = Math.cos(p1XY[2] / 180 * Math.PI);
	var dY = Math.sin(p1XY[2] / 180 * Math.PI);

	var nextX = p1XY[0] + dX * velocity * deltaT;
	var nextY = p1XY[1] + dY * velocity * deltaT;
	var dist = nextX * nextX + nextY * nextY;
	if (dist < 1 && dist > 0.25) {
		p1XY[0] = nextX;
		p1XY[1] = nextY;
	} else {
		updatedPos = false;
	}
	return updatedRot || updatedPos;
}

var world = {
	vertex : [ [ 1, 1, 0 ], [ 1, -1, 0 ], [ -1, 1, 0 ], [ -1, 1, 0 ],
			[ 1, -1, 0 ], [ -1, -1, 0 ] ],
	texture : [ [ 1, 1 ], [ 1, 0 ], [ 0, 1 ], [ 0, 1 ], [ 1, 0 ], [ 0, 0 ] ]
};
var ship = {
	vertex : [ [ 0, 1, 0 ], [ 1, -1, 0 ], [ 0, -0.75, .125 ], [ 0, 1, 0 ],
			[ 0, -0.75, .125 ], [ -1, -1, 0 ] ],
	texture : [ [ 1, 1 ], [ 1, 0 ], [ 0, 1 ], [ 0, 1 ], [ 1, 0 ], [ 0, 0 ] ]
};

var sky = {};

function initBuf(buffer, scale) {
	var obj = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, obj);

	var array_buffer = new Float32Array(buffer.length * buffer[0].length);
	var index = 0;
	for ( var i = 0; i < buffer.length; i++) {
		for ( var j = 0; j < buffer[i].length; j++) {
			array_buffer[index++] = buffer[i][j] * scale;
		}
	}

	gl.bufferData(gl.ARRAY_BUFFER, array_buffer, gl.STATIC_DRAW);
	return obj;
}

function initModels() {
	world.pos = initBuf(world.vertex, 2);
	world.uv = initBuf(world.texture, 1);
	world.num_vertex = 6;

	ship.pos = initBuf(ship.vertex, .04);
	ship.uv = initBuf(ship.texture, .1);
	ship.num_vertex = 6;

	world.tex = new GL_Texture(false);
	var img = new Image();
	img.src = "map.jpg";
	img.onload = function() {
		world.tex.load(this);
	};
	
	sky.model = new ObjFile(Reader.getAJAX("skybox.obj", null));
	sky.pos = initBuf([sky.model.vertex],1.75);
	sky.num_vertex = sky.model.vertex.length/3;
	sky.uv = initBuf([sky.model.texture],1);
	sky.tex = new GL_Texture(false);
	var skyTex = new Image();
	skyTex.src = "Morning.png";
	skyTex.onload = function() {
		sky.tex.load(this);
	};
		
}

function drawMap() {
	mat4.identity(mvMatrix);
	mat4.translate(mvMatrix, mvMatrix, [ 0, 0, 0 ]);
	mat4.multiply(mvMatrix, camera, mvMatrix);

	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

	gl.bindBuffer(gl.ARRAY_BUFFER, world.pos);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT,
			false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, world.uv);
	gl.vertexAttribPointer(shaderProgram.vertexTextureAttribute, 2, gl.FLOAT,
			false, 0, 0);

	world.tex.bind(shaderProgram.textureSampler, gl.TEXTURE0, 0);
	gl.drawArrays(gl.TRIANGLES, 0, world.num_vertex);
	
	mat4.identity(mvMatrix);
	mat4.rotate(mvMatrix, mvMatrix, 90 / 180 * Math.PI, [ 1, 0, 0 ]);
	mat4.translate(mvMatrix, mvMatrix, [ 0, 0, -.125 ]);
	mat4.multiply(mvMatrix, camera, mvMatrix);
	
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

	gl.bindBuffer(gl.ARRAY_BUFFER, sky.pos);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT,
			false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, sky.uv);
	gl.vertexAttribPointer(shaderProgram.vertexTextureAttribute, 2, gl.FLOAT,
			false, 0, 0);

	sky.tex.bind(shaderProgram.textureSampler, gl.TEXTURE0, 0);
	gl.drawArrays(gl.TRIANGLES, 0, sky.num_vertex);
}

function drawObj(dat) {
	mat4.identity(mvMatrix);
	mat4.translate(mvMatrix, mvMatrix, [ dat[0], dat[1], 0.00 ]);
	mat4.rotate(mvMatrix, mvMatrix, (dat[2]-90) / 180 * Math.PI, [ 0, 0, 1 ]);
	mat4.multiply(mvMatrix, camera, mvMatrix);

	world.tex.bind(shaderProgram.textureSampler, gl.TEXTURE0, 0);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

	gl.bindBuffer(gl.ARRAY_BUFFER, ship.pos);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT,
			false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, ship.uv);
	gl.vertexAttribPointer(shaderProgram.vertexTextureAttribute, 2, gl.FLOAT,
			false, 0, 0);

	gl.drawArrays(gl.TRIANGLES, 0, ship.num_vertex);
}

function gameDraw(t) {
	var px, py, dirX, dirY;
	var deltaT = 0;
	if (previousT > 0) {
		deltaT = t - previousT;
		if (updateLogic(deltaT / 1000)) {
			webRTC.sendMessage(p1XY);
		}
	}
	previousT = t;

	gl.viewportWidth = canvas.width;
	gl.viewportHeight = canvas.height;
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	mat4.perspective(pMatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.01,
			300.0);
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);

	var dX = Math.cos(p1XY[2] / 180 * Math.PI) * 0.16;
	var dY = Math.sin(p1XY[2] / 180 * Math.PI) * 0.16;

	mat4.lookAt(camera, [ p1XY[0] - dX, p1XY[1] - dY, .05 ], [ p1XY[0] + dX,
			p1XY[1] + dY, 0 ], [ 0, 0, 1 ])
	drawMap();
	drawObj(p1XY);
	drawObj(p2XY);

	requestAnimationFrame(gameDraw);
}

function gameOnMessage(buff) {
	p2XY.set(new Float32Array(buff));
}

function setupGame(c, rtc) {
	document.onkeydown = gameKeyDown;
	document.onkeyup = gameKeyUp;
	canvas = c;
	initGL(canvas);
	initShaders();
	initModels();
	webRTC = rtc;
	webRTC.onmessage = gameOnMessage;
	requestAnimationFrame(gameDraw);
}
