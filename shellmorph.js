/*
Copyright (C) 2025 Ido Filin. 

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

const twopi = Transform.twopi;
const sizeof = Transform.sizeof;
const sin60 = Math.sqrt(3)/2;

const renderer = new context.Renderer({indexBytesize: sizeof.uint32});

window.addEventListener("DOMContentLoaded", setupApp, false);


//let pitchAngle=70, rollAngle=45;
let pitchAngle=0, rollAngle=135;
let createImageFlag = false;
let multispiralFlag = false;
let gencurveFlag = false;
let archimedeanFlag = false;
let shellOpacity = 1.0;
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
	slider.oninput = function(){pitchAngle = this.value; 
		pitchLabel.innerHTML=`Pitch angle: ${pitchAngle} deg`; 
		scene();};
	slider.oninput()

	slider = document.getElementById('roll-slider');
	const rollLabel = document.querySelector('#roll-label');
	slider.oninput = function(){
		rollAngle = this.value; 
		rollLabel.innerHTML=`Roll angle: ${rollAngle} deg`; 
		scene();};
	slider.oninput()

	let checkboxElmnt = document.querySelector("#multispiral-check"); checkboxElmnt.checked=false;
	checkboxElmnt.onclick = function(){
		multispiralFlag=this.checked;
		scene();
	};
	const multiSpiralCheck = checkboxElmnt;

	checkboxElmnt = document.querySelector("#gencurve-check");
	checkboxElmnt.checked=false;
	checkboxElmnt.onclick = function(){
		gencurveFlag=this.checked;
		scene();
	};
	const genCurveCheck = checkboxElmnt;

	checkboxElmnt = document.querySelector("#archishell-check");
	checkboxElmnt.checked=false;
	checkboxElmnt.onclick = function(){
		multiSpiralCheck.checked=false;
		multispiralFlag=false;
		archimedeanFlag=this.checked;
		if (archimedeanFlag) {
			multiSpiralCheck.setAttribute("disabled","");
		} else {
			multiSpiralCheck.removeAttribute("disabled");
		}
		scene();
	};

	slider = document.getElementById('opacity-slider');
	const opacLabel = document.querySelector('#opacity-label');
	slider.oninput = function(){
		shellOpacity = this.value; 
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

let projectionMatrix = calcProjection(context.aspect);
const fbosize = 1024;
let shaders;
let cleanupIsSet = false;
const thetaN = 512;
const phiN = 256;
function initRendering (progs) {
	shaders = progs;
	const shellVData = shellVertices(thetaN, phiN, 5.0*twopi);
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
	console.log(gl.drawingBufferWidth);
	scene();

	if (!cleanupIsSet) {
		console.log("Setup cleanup");
		context.cleanup.push(
			renderer, 
			shaders,	
		);
		cleanupIsSet = true;
	}
}

const spiralExpansion = 1.0/Math.tan(85.0*twopi/360.0);
const centerBeta = Math.PI/6.5;
//const spiralExpansion = 0.06;
//const centerBeta = Math.PI/30;
const centerR0 =  1.15;
const z0 = centerR0*Math.cos(centerBeta);
const r0 = centerR0*Math.sin(centerBeta);
const RaupW = Math.exp(spiralExpansion*twopi);
const suturePhi = Math.PI/2 + centerBeta - Math.acos(RaupW/2.0);
const suture_z0 = z0 - r0*Math.sin(suturePhi);
const suture_r0 = 1.075*r0*(1 + Math.cos(suturePhi));
const sutureR0 = RaupW*Math.sqrt(suture_z0**2 + suture_r0**2);
const sutureBeta = Math.atan2(suture_r0,suture_z0);
const abaxialBeta = Math.atan2(2*r0, z0);
const abaxialR0 = 2*r0/Math.sin(abaxialBeta);
const abapicalPhi = Math.PI/2*0.95;
const abapicalBeta = Math.atan2(r0*(1.0 + 0.5), z0+r0*sin60);
const abapicalR0 = 1.0*r0*(1.0 + 0.5)/Math.sin(abapicalBeta);
const adapicalR0 = centerR0;
const adapicalBeta = 1.99*centerBeta;
const adaxial_r0 = r0*(1.0 - Math.SQRT1_2);
const adaxial_z0 = z0 - r0*Math.SQRT1_2;
const adaxialBeta = Math.atan2(adaxial_r0, adaxial_z0);
const adaxialR0 = 0.9*RaupW*Math.sqrt(RaupW)*adaxial_z0/Math.cos(adaxialBeta);
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
	gl.uniform1f(prog.k, spiralExpansion);
	bindAttributePointer(prog.coord, offsets.shellcoords, offsets.shellcoords.coord);
		
	/* Draw multispiral helicospirals */
	if (multispiralFlag) {
		gl.enable(gl.CULL_FACE);
		gl.uniform1f(prog.R0, sutureR0);
		gl.uniform1f(prog.beta, sutureBeta);
		gl.uniform3f(prog.fixedColor, 0.0, 0.5, 0.0 );
		gl.uniform1f(prog.fixedcolorFactor, 0.5);
		gl.uniform1f(prog.apertureSize, 0.015);
		gl.uniform1f(prog.alphaOut, 1.0);
		gl.uniform1f(prog.revolutionOffset, +0.15*Math.PI);
		gl.drawElements(gl.TRIANGLE_STRIP, offsets.shellindices.data.length, gl.UNSIGNED_INT, offsets.shellindices.byteoffset);

		gl.uniform1f(prog.R0, abaxialR0);
		gl.uniform1f(prog.beta, abaxialBeta);
		gl.uniform3f(prog.fixedColor, 0.0, 0.0, 0.8 );
		gl.drawElements(gl.TRIANGLE_STRIP, offsets.shellindices.data.length, gl.UNSIGNED_INT, offsets.shellindices.byteoffset);

		gl.uniform1f(prog.R0, adapicalR0);
		gl.uniform1f(prog.beta, adapicalBeta);
		gl.uniform3f(prog.fixedColor, 1.0, 1.0, 0.0 );
		gl.drawElements(gl.TRIANGLE_STRIP, offsets.shellindices.data.length, gl.UNSIGNED_INT, offsets.shellindices.byteoffset);

		gl.uniform1f(prog.R0, abapicalR0);
		gl.uniform1f(prog.beta, abapicalBeta);
		gl.uniform1f(prog.apertureSize, 0.025);
		gl.uniform3f(prog.fixedColor, 0.0, 0.0, 0.0 );
		gl.drawElements(gl.TRIANGLE_STRIP, offsets.shellindices.data.length, gl.UNSIGNED_INT, offsets.shellindices.byteoffset);


	/*
		gl.uniform1f(prog.R0, adaxialR0);
		gl.uniform1f(prog.beta, adaxialBeta);
		gl.uniform3f(prog.fixedColor, 0.0, 0.0, 0.0 );
		gl.uniform1f(prog.apertureSize, 0.05);
		gl.uniform1f(prog.revolutionOffset, +0.35*Math.PI);
		gl.drawElements(gl.TRIANGLE_STRIP, offsets.shellindices.data.length, gl.UNSIGNED_INT, offsets.shellindices.byteoffset);
	*/
	}

	/* Draw centerline */
	if (gencurveFlag) {
		gl.enable(gl.CULL_FACE);
		gl.uniform1f(prog.R0, centerR0);
		gl.uniform1f(prog.beta, centerBeta);
		gl.uniform3f(prog.fixedColor, 1.0, 0.0, 0.0 );
		gl.uniform1f(prog.apertureSize, 0.05);
		gl.uniform1f(prog.fixedcolorFactor, 0.5);
		gl.uniform1f(prog.alphaOut, 1.0);
		gl.uniform1f(prog.revolutionOffset, +0.45*Math.PI);
		gl.drawElements(gl.TRIANGLE_STRIP, offsets.shellindices.data.length, gl.UNSIGNED_INT, offsets.shellindices.byteoffset);
	}

	/* Draw shell */
	gl.disable(gl.CULL_FACE);
	gl.uniform1f(prog.R0, centerR0);
	gl.uniform1f(prog.beta, centerBeta);
	gl.uniform3f(prog.fixedColor, 1.0, 1.0, 1.0 );
	gl.uniform1f(prog.fixedcolorFactor, 0.7);
	gl.uniform1f(prog.apertureSize, 1.0);
	gl.uniform1f(prog.alphaOut, shellOpacity);
	gl.uniform1f(prog.revolutionOffset, 0.0);
	gl.drawElements(gl.TRIANGLE_STRIP, offsets.shellindices.data.length, gl.UNSIGNED_INT, offsets.shellindices.byteoffset);

	/* Draw generating curve(s) */
	if (gencurveFlag) {
		gl.disable(gl.CULL_FACE);
		gl.uniform3f(prog.fixedColor, 1.0, 0.0, 0.0 );
		gl.uniform1f(prog.fixedcolorFactor, 0.5);
		gl.uniform1f(prog.apertureSize, 1.0);
		gl.uniform1f(prog.alphaOut, 0.9);
		for (let i of Array(30).fill().map((e,i)=>Math.round(2 + Math.E*Math.PI*i + 0.2*i**2))) {
			gl.drawElements(gl.TRIANGLE_STRIP, 
				(phiN+1)*2, 
				gl.UNSIGNED_INT, 
				(phiN+1)*(thetaN - i)*2*sizeof.uint32 + offsets.shellindices.byteoffset
			);
		}
		gl.uniform1f(prog.revolutionOffset, 0.15*Math.PI);
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

const eps = 1.0e-6;
function shellVertices(numTheta=72, numAperture=24, maxTheta=twopi*3) {
	const numAp = numAperture + 1;
	const numCoords=numAp*numTheta*2;
	const shellCoords = Array.from({length: numCoords}, (v,i)=>{
		const denom = 2*numAp,
			j = Math.trunc(i/denom),
			k = Math.floor(i/2)%numAp,
			theta = j*maxTheta/(numTheta - 1) - maxTheta,
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
	return P;
}

function imageFromFBO (fbo) {
	if (fbo===null) {
		fbo = {width:fbosize, height:fbosize};
		gl.readBuffer(gl.BACK);
	} else {
		gl.readBuffer(gl.COLOR_ATTACHMENT0);
	}
	const pixels = new Uint8Array(fbo.width * fbo.height * 4)
	gl.readPixels(0, 0, fbo.width, fbo.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

	const flippedpixels = new Uint8ClampedArray(fbo.width * fbo.height * 4)
	for (let row = 1; row <= fbo.height; row++)
		flippedpixels.set(pixels.subarray((row-1)*4*fbo.width, row*4*fbo.width), (fbo.height-row)*fbo.width*4);

	let imgdata = new ImageData(flippedpixels, fbo.width, fbo.height);
	canvas2d.width = fbo.width;
	canvas2d.height = fbo.height;
	let context2d = canvas2d.getContext("2d");
	context2d.putImageData(imgdata, 0, 0);
	let finalimg = new Image();
	finalimg.src = canvas2d.toDataURL("image/png", 1.0);
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


function scene() {
	const prog = shaders.shell;
	gl.uniform1i(prog.archimedes, archimedeanFlag);
	renderer.animate(shellScene);
}
