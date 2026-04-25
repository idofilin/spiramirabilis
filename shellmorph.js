/*
Copyright (C) 2025–2026 Ido Filin. 

This JavaScript code is free software; you can redistribute it
and/or modify it under the terms of the GNU General Public
License as published by the Free Software Foundation; either
version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  
See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { Context, GLNAME, Shader, Program } from "./kangas.js/context.js"
import { Texture } from "./kangas.js/texture.js"
import * as Transform from "./kangas.js/transforms.js"
import { Renderer } from "./kangas.js/renderer.js"
import { batchLoad, ProgressDisplay } from "./kangas.js/load.js"

const canvas = document.getElementById('app-canvas');
const context = new Context(canvas, {alpha:true}, [Shader, Program, Texture, Renderer]);
const canvas2d = document.createElement("canvas");
const gl = context[GLNAME];
const floatRenderExtension = gl.getExtension("EXT_color_buffer_float");

const eps = 1.0e-6;
const twopi = Transform.twopi;
const halfpi = Transform.halfpi;
const rad2deg = Transform.rad2deg;
const sizeof = Transform.sizeof;
const sin60 = Math.sqrt(3)/2;

const renderer = new context.Renderer({indexBytesize: sizeof.uint32});

window.addEventListener("DOMContentLoaded", setupApp, false);

let createImageFlag = false;
let multispiralFlag = false;
let shellDrawFlag = true;
let centerlineFlag = false;
let gencurveFlag = false;
let planispiralFlag = false;
let helixFlag = false;
//let archimedeanFlag = false;
let shellOpacity = 1.0;
function cot(x) {return 1.0/Math.tan(x)};
function acot(x) {return Math.atan(1.0/x)};
let pitchAngle,rollAngle,
	leadAngle0 = Number(document.getElementById('lead0-slider').value), 
	wTilde = Number(document.getElementById('w-slider').value),
	sigma = Number(document.getElementById('sigma-slider').value),
	spiralExpansion,
	leadAngleRate,
	centerBeta, centerAlpha;

async function setupApp(evt) {
	window.removeEventListener(evt.type, setupApp, false);

	let progressShow = new ProgressDisplay();
	document.body.appendChild(progressShow.htmlElement);
	let shaderPrograms = await loadShaderPrograms(progressShow);
	initRendering(shaderPrograms);
	renderer.setDefaultResizer(resizeCanvasCallback);

	/* Setup user interface */
	let button = document.getElementById('fullscreen-button');
	button.onclick = ()=>{canvas.requestFullscreen(canvas)};
	button = document.getElementById('image-render');
	button.onclick = () =>{createImageFlag = true;scene()};

	let slider = document.getElementById('pitch-slider');
	const pitchLabel = document.querySelector('#pitch-label');
	slider.oninput = function(){
		pitchAngle = Number(this.value); 
		pitchLabel.innerHTML=`Pitch angle: ${pitchAngle}&deg;`; 
		scene();};
	slider.oninput()

	slider = document.getElementById('roll-slider');
	const rollLabel = document.querySelector('#roll-label');
	slider.oninput = function(){
		rollAngle = Number(this.value); 
		rollLabel.innerHTML=`Roll angle: ${rollAngle}&deg;`; 
		scene();};
	slider.oninput()

	slider = document.getElementById('lead0-slider');
	const leadLabel = document.querySelector('#lead0-label');
	slider.oninput = function(){
		leadAngle0 = Number(this.value); 
		recalcDerivedCoilingParams();
		leadLabel.innerHTML=`&#x1D706&#x2080;: ${leadAngle0}, ${(leadAngle0*rad2deg).toPrecision(3)}&deg;`; 
		scene();};
	slider.oninput()

	slider = document.getElementById('w-slider');
	const wslideLabel = document.querySelector('#w-label');
	slider.oninput = function(){
		wTilde = Number(this.value); 
		recalcDerivedCoilingParams();
		wslideLabel.innerHTML=`&#x1D464;&#x0303;: ${wTilde}, &#x1D6FE;=${spiralExpansion.toPrecision(3)}`; 
		scene();};
	slider.oninput()

	slider = document.getElementById('sigma-slider');
	const sigmaLabel = document.querySelector('#sigma-label');
	slider.oninput = function(){
		sigma = Number(this.value); 
		recalcDerivedCoilingParams();
		sigmaLabel.innerHTML=`&#x1D70E;: ${sigma}, d&#x1D706;/d&#x1D703;=${leadAngleRate.toPrecision(3)}`; 
		scene();};
	slider.oninput()


	let checkboxElmnt = document.querySelector("#multispiral-check"); checkboxElmnt.checked=false;
	checkboxElmnt.onclick = function(){
		multispiralFlag=this.checked;
		scene();
	};
	const multiSpiralCheck = checkboxElmnt;

	checkboxElmnt = document.querySelector("#shelldraw-check");
	checkboxElmnt.checked=true;
	checkboxElmnt.onclick = function(){
		shellDrawFlag=this.checked;
		scene();
	};
	const shellDrawCheck = checkboxElmnt;

	checkboxElmnt = document.querySelector("#centerline-check");
	checkboxElmnt.checked=false;
	checkboxElmnt.onclick = function(){
		centerlineFlag=this.checked;
		scene();
	};
	const centerlineCheck = checkboxElmnt;

	checkboxElmnt = document.querySelector("#gencurve-check");
	checkboxElmnt.checked=false;
	checkboxElmnt.onclick = function(){
		gencurveFlag=this.checked;
		scene();
	};
	const genCurveCheck = checkboxElmnt;

	checkboxElmnt = document.querySelector("#planispiral-check");
	checkboxElmnt.checked=false;
	checkboxElmnt.onclick = function(){
		planispiralFlag=this.checked;
		scene();
	};
	const planispiralCheck = checkboxElmnt;

	checkboxElmnt = document.querySelector("#helix-check");
	checkboxElmnt.checked=false;
	checkboxElmnt.onclick = function(){
		helixFlag=this.checked;
		scene();
	};
	const helixCheck = checkboxElmnt;

	checkboxElmnt = document.querySelector("#archishell-check");
	checkboxElmnt.checked=false;
	checkboxElmnt.disabled=true;
	/*
	checkboxElmnt.onclick = function(){
		archimedeanFlag=this.checked;
		scene();
	};
	*/

	slider = document.getElementById('opacity-slider');
	const opacLabel = document.querySelector('#opacity-label');
	slider.oninput = function(){
		shellOpacity = Number(this.value); 
		opacLabel.innerHTML=`Shell opacity: ${shellOpacity}`; 
		scene();};
	slider.oninput()
}

async function loadShaderPrograms(progress) {
	const urls = new Map([
		["gencurve.vsh", "shellgeometry" ], 
		["shelleffects.fsh", "shelleffects"],
	]);
	let shaderTexts = await batchLoad( urls, progress, "Loading shaders" );
	let shellprog = new context.Program(shaderTexts.shellgeometry, shaderTexts.shelleffects);
	return { shell: shellprog } ;
}

const fbosize = 1024;
let shaders;
let cleanupIsSet = false;
const thetaN = 512;
const phiN = 256;
function initRendering (progs) {
	shaders = progs;
	const shellVData = shellVertices(thetaN, phiN, maxTheta);
	renderer.addVertexData("shellcoords", {
		data: shellVData.coords,
		attributes : [{coord:2}],
		bytesize : sizeof.float32,
	});
	renderer.addVertexData("shellindices", {
		buffertype:"index",
		data: shellVData.indices,
		bytesize: sizeof.uint32,
	});
	renderer.updateBuffers();
	
	gl.frontFace(gl.CCW);
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.DEPTH_TEST);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.enable(gl.BLEND);
	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.clearDepth(1.0);
	gl.flush();

	resizeCanvasCallback();
	//console.log(gl.drawingBufferWidth);
	scene();

	if (!cleanupIsSet) {
		//console.log("Setup cleanup");
		context.cleanup.push(
			renderer, 
			shaders,	
		);
		cleanupIsSet = true;
	}
}

const maxTheta =  5.25*twopi;
const centerS0 = 0.05;
const dilation = 0.075;
const centerlineDilation = 0.005625;//0.015*(dilation/0.2);
let zRescale=1.0, zOffset=0.0;
let projectionMatrix;
function shellScene(timestamp) {
	const offsets = renderer.vertexData;
	const prog = shaders.shell;
	const rotMat = Transform.matProd( 
		Transform.translationYawPitchRoll( 
			[0.0, 0.0, 0.0], 
			[pitchAngle*Math.PI/180, 0, 0]),
		Transform.translationYawPitchRoll( 
			[0.0, 0.0, 0.0], 
			[Math.PI, 0 , -rollAngle*Math.PI/180] ));

	let fbo=null;
	if (createImageFlag) 
		fbo = null;
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	if (fbo===null)
		gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
	else
		gl.viewport (0.0, 0.0, fbo.width, fbo.height);
	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

	gl.useProgram(prog[GLNAME]);
	gl.uniformMatrix4fv(prog.rotmatrix, false, rotMat);
	gl.uniform2f(prog.lambda, leadAngle0, leadAngleRate);
	gl.uniform1f(prog.expansionRate, spiralExpansion);
	gl.uniform1f(prog.zOffset, zOffset);
	bindAttributePointer(prog.coord, offsets.shellcoords, offsets.shellcoords.coord);
		
	const illustratioinColorFactor=0.3;
	gl.uniform1f(prog.fixedcolorFactor, illustratioinColorFactor);
	gl.uniform1f(prog.revolutionOffset, +0.0*Math.PI);
	/* Draw centerline */
	if (centerlineFlag) {
		gl.enable(gl.CULL_FACE);
		gl.uniform1f(prog.S0, centerS0);
		gl.uniform1f(prog.beta, centerBeta);
		gl.uniform3f(prog.fixedColor, 1.0, 0.0, 0.0 );
		gl.uniform1f(prog.dilation, centerlineDilation);
		gl.uniform1f(prog.alphaOut, 1.0);
		gl.drawElements(gl.TRIANGLE_STRIP, offsets.shellindices.data.length, gl.UNSIGNED_INT, offsets.shellindices.byteoffset);
	}

	/* Draw planispirals */
	if (planispiralFlag) {
		gl.enable(gl.CULL_FACE);
		gl.uniform1f(prog.alphaOut, 0.85);
		gl.uniform1f(prog.S0, centerS0);
		gl.uniform1f(prog.beta, Math.PI/2.0);
		gl.uniform2f(prog.lambda, 0.0, 0.0);
		gl.uniform3f(prog.fixedColor, 0.0, 0.0, 1.0 );
		gl.uniform1f(prog.dilation, centerlineDilation/1.5);
		gl.uniform1f(prog.zOffset, 0.5*projectionMatrix[15]);
		gl.drawElements(gl.TRIANGLE_STRIP, offsets.shellindices.data.length, gl.UNSIGNED_INT, offsets.shellindices.byteoffset);
		gl.uniform1f(prog.expansionRate, spiralExpansion);
		gl.uniform2f(prog.lambda, leadAngle0, leadAngleRate);
		gl.uniform1f(prog.beta, centerBeta);
		gl.uniform1f(prog.zOffset, zOffset);
	}

	/* Draw a regular circular helix */
	if (helixFlag) {
		gl.enable(gl.CULL_FACE);
		gl.uniform1i(prog.circhelix, true);
		gl.uniform1f(prog.alphaOut, 0.85);
		gl.uniform1f(prog.beta, centerBeta);
		gl.uniform3f(prog.fixedColor, 0.0, 0.0, 1.0 );
		gl.uniform1f(prog.dilation, centerlineDilation*3);
		gl.drawElements(gl.TRIANGLE_STRIP, offsets.shellindices.data.length, gl.UNSIGNED_INT, offsets.shellindices.byteoffset);
		gl.uniform1i(prog.circhelix, false);
	}

	/* Draw shell */
	gl.disable(gl.CULL_FACE);
	gl.uniform1f(prog.S0, centerS0);
	gl.uniform1f(prog.revolutionOffset, - 0.5*Math.PI);
	gl.uniform1f(prog.beta, centerBeta);
	gl.uniform3f(prog.fixedColor, 1.0, 1.0, 1.0 );
	gl.uniform1f(prog.fixedcolorFactor, 0.7);
	gl.uniform1f(prog.dilation, dilation);
	gl.uniform1f(prog.alphaOut, shellOpacity);
	if (multispiralFlag) {
		gl.uniform1i(prog.multispiral, true);
	}
	if (shellDrawFlag) {
		gl.drawElements(gl.TRIANGLE_STRIP,
			offsets.shellindices.data.length,
			gl.UNSIGNED_INT,
			offsets.shellindices.byteoffset); 
	}

	/* Draw generating curve(s) */
	if (gencurveFlag) {
		gl.disable(gl.CULL_FACE);
		gl.uniform3f(prog.fixedColor, 1.0, 0.0, 0.0 );
		gl.uniform1f(prog.fixedcolorFactor, 0.5);
		gl.uniform1f(prog.dilation, dilation);
		gl.uniform1f(prog.alphaOut, 0.9);
		for (let i of Array(30).fill().map((e,i)=>Math.round(2 + Math.E*Math.PI*i + 0.2*i**2))) {
			gl.drawElements(gl.TRIANGLE_STRIP, 
				(phiN+1)*2, 
				gl.UNSIGNED_INT, 
				(phiN+1)*(thetaN - i)*2*sizeof.uint32 + 
					offsets.shellindices.byteoffset
			);
		}
		gl.uniform1f(prog.revolutionOffset, 0.0*Math.PI);
		gl.drawElements(gl.TRIANGLE_STRIP, 
			(phiN+1)*2, 
			gl.UNSIGNED_INT, 
			(phiN+1)*(thetaN - 2 )*2*sizeof.uint32 + offsets.shellindices.byteoffset
		);
	}

	if (createImageFlag) {
		imageFromFBO(fbo);
		createImageFlag = false;
	}

}

function bindAttributePointer(attribHandle, buffer, bufferHandle) {
gl.vertexAttribPointer(attribHandle, 
	bufferHandle.size, gl.FLOAT, false, 
	buffer.bytestride, 
	bufferHandle.byteoffset);
}

function shellVertices(numTheta=72, numAperture=24, maxTheta=twopi*3) {
	const numAp = numAperture + 1;
	const numCoords=numAp*numTheta*2;
	const shellCoords = Array.from({length: numCoords}, (v,i)=>{
		const denom = 2*numAp,
			j = Math.trunc(i/denom),
			k = Math.floor(i/2)%numAp,
			theta = j*maxTheta/(numTheta - 1),
			phi = -Math.PI + k*twopi/numAperture + ((k==0) && eps|| 0.0);
			return (i%2 == 0)? theta : phi ;
		}); 
	const numIndices = numAp*(numTheta-1)*2;
	const shellIndices = Array.from({length: numIndices}, (v,i)=>{
		const denom = 2*numAp,
			j = 1 + Math.trunc(i/denom),
			k = Math.floor(i/2)%numAp;
			return (i%2 == 0)? j*numAp+k : (j-1)*numAp+k ;
		}); 
	return { coords: Float32Array.from(shellCoords), indices: Uint32Array.from(shellIndices) };
}

function resizeCanvasCallback (e) {
	if (document.fullscreenElement===null) {
		canvas.width=fbosize;
		canvas.height=fbosize;
	}
	gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
	projectionMatrix = calcProjection(context.aspect);
	gl.useProgram(shaders.shell[GLNAME]);
	gl.uniformMatrix4fv(shaders.shell.projmatrix, false, projectionMatrix);
	scene();
}
function calcProjection (ratio=1.0) {
	let P = Transform.identity();
	P[0] = (ratio < 1.0) ? ratio : 1.0;
	P[5] = (ratio < 1.0) ? 1.0 : 1.0/ratio;
	P[15] = zRescale;
	return P;
}

function imageFromFBO (fbo) {
	let finalimg = new Image();
	finalimg.src = canvas.toDataURL("image/png", 1.0);
	let finalimgAnchor = document.createElement("a");
	finalimgAnchor.setAttribute("href", finalimg.src);
	let finalimgName = 
		"spiramirabilis-"
		+ ((new Date()).toLocaleDateString() + " " 
			+ (new Date()).toLocaleTimeString())
		.replace(/\W+/g,"-")
		+ ".png";
	finalimgAnchor.setAttribute("download", finalimgName);
	finalimgAnchor.appendChild(finalimg);
	let imgContainer = document.querySelector("#final-image-container");
	imgContainer.innerHTML="";
	imgContainer.style.display = "flex";
	imgContainer.appendChild(finalimgAnchor);
}

function clamp(x,xmin,xmax) {return Math.min(Math.max(xmin,x),xmax)};
function recalcDerivedCoilingParams() {	
	let zMin,zMax,rMax,zRange
	spiralExpansion = 1.0/wTilde;
	leadAngleRate = sigma/Math.sqrt(1+sigma**2);
	centerBeta = Math.atan(spiralExpansion / 
			Math.sqrt(1+spiralExpansion**2) *
			cot(leadAngle0));
	centerAlpha = acot(spiralExpansion/Math.sin(centerBeta));
	let c=leadAngleRate, 
		g = spiralExpansion,
		denom = g**2+c**2;
	let Cz = centerS0*(g**2/denom*Math.sin(leadAngle0) -
		c*g/denom*Math.cos(leadAngle0));
	let s = centerS0*Math.exp(g*maxTheta);
	let apsize0 = centerS0*dilation, 
		apsize = s*dilation;
	let leadAngleFin = leadAngle0 + leadAngleRate*maxTheta;
	let apsizeExtra = clamp(Math.abs(leadAngleFin/halfpi),1.0,1.0)*apsize;
	let zCurrent =  s*g * (
		Math.sin(leadAngleFin)*g/denom - 
		c/denom*Math.cos(leadAngleFin));
	let z180 = s*g*c/denom;
	let zBound = s*g/Math.sqrt(denom);
	if (leadAngleFin <= Math.PI) {
		zMax = apsizeExtra + zCurrent;
		zMin = -apsize0;
		zRange = zMax - zMin;
		zRescale = zRange*0.5;
		zOffset = +Cz + 1.0*zRescale;
	} else if (zCurrent >= 0 && leadAngleFin < twopi){
		zMax = apsizeExtra + z180;
		zMin = -apsize0;
		zRange = zMax - zMin;
		zRescale = zRange*0.5;
		zOffset = +Cz + 1.0*zRescale;
	} else {
		zMax = apsizeExtra + z180; 
		zMin = -z180 - apsizeExtra;
		zRange = zMax - zMin;
		zRescale = zRange*0.5;
		zOffset = +Cz;
	}
	resizeCanvasCallback();
	const dispLabel = document.querySelector('#derived-label');
	dispLabel.innerHTML=`&#x1D6FD;=${(centerBeta*rad2deg).toPrecision(3)}&deg;, &#x1D6FC;=${(centerAlpha*rad2deg).toPrecision(3)}&deg;`; 
}

function scene() {
	const prog = shaders.shell;
	//gl.uniform1i(prog.archimedes, archimedeanFlag);
	gl.uniform1i(prog.circhelix, false);
	gl.uniform1i(prog.multispiral, false);
	renderer.animate(shellScene);
}


