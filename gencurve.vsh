/*
Copyright (C) 2025 Ido Filin. 

This GLSL code is free software; you can redistribute it
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

precision highp float;
#define PI 3.141592653589793238462643383279502884

in vec2 coord;

out vec3 positVec;
out vec3 normalVec;
out vec2 thetaphi;

uniform float k;
uniform float R0;
uniform float beta;
uniform float apertureSize;
uniform float revolutionOffset;
uniform mat4 projmatrix;
uniform mat4 rotmatrix;
uniform int archimedes;

const float zOffset = 0.85;
void main()
{
	float theta = coord.x + revolutionOffset;
	float phi = coord.y;
	
	float R = R0*exp(k*theta);
	vec3 spiral = R * vec3( sin(beta)*vec2(cos(theta), sin(theta)) , -cos(beta)) + vec3(0.0, 0.0, zOffset);
	if (bool(archimedes)) {
		theta = theta*0.8;
		R = 1.1 + (k/2.9/0.8*theta);
		float r = R * sin(beta);
		spiral = vec3( r*vec2(cos(theta), sin(theta)), 
							-(1.3*r*r/tan(beta)/tan(beta)) ) 
						+ vec3(0.0, 0.0, zOffset);
	}

	vec3 gencurvepoint = apertureSize*R*sin(beta) * vec3( cos(phi)*vec2(cos(theta), sin(theta)) , sin(phi));
    positVec = spiral + gencurvepoint;
	gl_Position =  projmatrix * rotmatrix * vec4(positVec, 1.0);
	normalVec = (rotmatrix * vec4( vec3( cos(phi)*vec2(cos(theta), sin(theta)) , sin(phi)), 1.0) ).xyz ;     
	thetaphi = vec2(theta,phi);
}

