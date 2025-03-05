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
const gl = context[GLNAME];
const floatRenderExtension = gl.getExtension("EXT_color_buffer_float");

const twopi = Transform.twopi;
const sizeof = Transform.sizeof;

const renderer = new context.Renderer({indexBytesize: sizeof.uint32});

window.addEventListener("DOMContentLoaded", setupApp, false);

async function setupApp(evt) {
	window.removeEventListener(evt.type, setupApp, false);
	const button = document.getElementById('fullscreen-button');
	button.onclick = ()=>{canvas.requestFullscreen(canvas)};
	const fileSelect = document.getElementById("dataset-select");
	let progressShow = new ProgressDisplay();
	document.body.appendChild(progressShow.htmlElement);
	let shaderPrograms = await loadShaderPrograms(progressShow);
	initRendering(shaderPrograms);
	renderer.setDefaultResizer(resizeCanvasCallback);
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
const fbosize = 128;
let offscreenFBO = null, offscreenTex = Array(4);
let shaders;
let cleanupIsSet = false;
function initRendering (progs) {

	shaders = progs;
	
	const bill_Vertices = new Float32Array([
					 -1.0, -1.0, 0.0, 0.0,
					  1.0, -1.0, 1.0, 0.0,
					  1.0, 1.0, 1.0, 1.0,
					 -1.0, 1.0, 0.0, 1.0,
			]);
	const bill_Indices = new Uint32Array([
				0, 1, 2, 0, 2, 3,
			]);
	renderer.addVertexData("billboard", {
		data: Float32Array.from(bill_Vertices),
		attributes : [{coord:4}],
		bytesize : sizeof.float32,
	});
	renderer.addVertexData("billboardindices", {
		buffertype:"index",
		data: Uint32Array.from(bill_Indices),
		bytesize: sizeof.uint32,
	});

	const shellVData = shellVertices(192, 96, 5.0*twopi);
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
	
	gl.useProgram(shaders.shell[GLNAME]);
	//gl.uniform3f(shaders.shell.fixedColor, 1.0, 1.0, 1.0 );
	gl.uniform1f(shaders.shell.beta, Math.PI/6.0);
	gl.uniformMatrix4fv(shaders.shell.projmatrix, false, projectionMatrix);

	gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
	gl.frontFace(gl.CCW);
	gl.disable(gl.CULL_FACE);
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.DEPTH_TEST);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.disable(gl.BLEND);
	gl.clearColor(0.0, 0.0, 0.0, 0.0);
	gl.clearDepth(1.0);
	gl.flush();

	renderer.animate(shellScene);

	if (!cleanupIsSet) {
		console.log("Setup cleanup");
		context.cleanup.push(
			offscreenFBO, 
			offscreenTex, 
			renderer, 
			shaders,	
		);
		cleanupIsSet = true;
	}
}

function shellScene(timestamp) {
	const offsets = renderer.vertexData;
	let prog = shaders.shell;
	
	const rotMat = Transform.translationYawPitchRoll( 
		[0.0, 0.0, 0.0], 
		[1e-4*Math.E*timestamp, 1e-4*Math.SQRT2*timestamp, 1e-4*Math.PI/2.0*timestamp] );
	gl.uniformMatrix4fv(prog.rotmatrix, false, rotMat);

	gl.useProgram(prog[GLNAME]);
	bindAttributePointer(prog.coord, offsets.shellcoords, offsets.shellcoords.coord);
	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
	gl.drawElements(gl.TRIANGLE_STRIP, offsets.shellindices.data.length, gl.UNSIGNED_INT, offsets.shellindices.byteoffset);

	renderer.animate(shellScene);
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
			theta = j*maxTheta/(numTheta - 1),
			phi = k*twopi/numAperture + ((k==0) && eps|| 0.0);
			return (i%2 == 0) && theta || phi ;
		}
	); 

	const numIndices = numAp*(numTheta-1)*2;
	const shellIndices = Array.from({length: numIndices}, (v,i)=>{
		const denom = 2*numAp,
			j = 1 + Math.trunc(i/denom),
			k = Math.floor(i/2)%numAp;
			return (i%2 == 0) && j*numAp+k || (j-1)*numAp+k ;
		}
	); 

	return { coords: Float32Array.from(shellCoords), indices: Uint32Array.from(shellIndices) };
}

function resizeCanvasCallback (e) {
	//console.log(e);
	gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
	projectionMatrix = calcProjection(context.aspect);
	gl.uniformMatrix4fv(shaders.shell.projmatrix, false, projectionMatrix);
}

function calcProjection (ratio=1.0) {
	let P = Transform.identity();
	P[0] = (ratio < 1.0) ? ratio : 1.0;
	P[5] = (ratio < 1.0) ? 1.0 : 1.0/ratio;
	return P;
}


