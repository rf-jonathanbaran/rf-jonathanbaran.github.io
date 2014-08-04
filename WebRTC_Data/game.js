"use strict";
var context, canvas, webRTC;
var p1XY = new Float32Array([ 0, 0.25, 180 ]);
var p2XY = new Float32Array([ 0, 0.25, 180 ]);

var previousT = -1;
var keyboardBuffer = [];

var KEY_A = 65;
var KEY_S = 83;
var KEY_D = 68;
var KEY_W = 87;

function gameKeyDown(e) {
	keyboardBuffer[e.keyCode] = true;
}

function gameKeyUp(e) {
	keyboardBuffer[e.keyCode] = false;
}

function updateLogic(deltaT) {
	var updated = false;
	if (keyboardBuffer[KEY_A]) {
		p1XY[2] -= 3;
		updated= true;
	}
	if (keyboardBuffer[KEY_D]) {
		p1XY[2] += 3;
		updated= true;
	}
	var velocity = 0;
	if (keyboardBuffer[KEY_W]) {
		velocity += .2;
		updated= true;
	}
	if (keyboardBuffer[KEY_S]) {
		velocity -= .2;
		updated= true;
	}
	var dX = Math.cos(p1XY[2] / 180 * Math.PI);
	var dY = Math.sin(p1XY[2] / 180 * Math.PI);
	
	p1XY[0]+=dX*velocity*deltaT;
	p1XY[1]+=dY*velocity*deltaT;
	return updated;
}

function gameDraw(t) {
	var px,py,dirX,dirY;
	var deltaT = 0;
	if (previousT > 0) {
		deltaT = t - previousT;
		if(updateLogic(deltaT/1000)) {
			webRTC.sendMessage(p1XY);
		}
	}
	previousT = t;

	context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = "#FF0000";
	
	px = (p1XY[0]+0.5)*canvas.width;
	py = (p1XY[1]+0.5)*canvas.height;
	
	context.beginPath();
	context.arc(px,py,25,0,2*Math.PI);
	context.fill();
	
	dirX = Math.cos(p1XY[2] / 180 * Math.PI);
	dirY = Math.sin(p1XY[2] / 180 * Math.PI);
	context.fillStyle = "#000000";
	context.beginPath();
	context.arc(px+dirX*20,py+dirY*20,5,0,2*Math.PI);
	context.fill();
	
	context.fillStyle = "#00FF00";
	
	px = (p2XY[0]+0.5)*canvas.width;
	py = (p2XY[1]+0.5)*canvas.height;
	
	context.beginPath();
	context.arc(px,py,25,0,2*Math.PI);
	context.fill();
	
	dirX = Math.cos(p2XY[2] / 180 * Math.PI);
	dirY = Math.sin(p2XY[2] / 180 * Math.PI);
	context.fillStyle = "#000000";
	context.beginPath();
	context.arc(px+dirX*20,py+dirY*20,5,0,2*Math.PI);
	context.fill();

	requestAnimationFrame(gameDraw);
}

function gameOnMessage(buff) {
	p2XY.set(new Float32Array(buff));
}

function setupGame(c, rtc) {
	document.onkeydown = gameKeyDown;
	document.onkeyup = gameKeyUp;
	canvas = c;
	context = canvas.getContext('2d');
	webRTC = rtc;
	webRTC.onMessage = gameOnMessage;
	requestAnimationFrame(gameDraw);
}