/*
Copyright (C) 2024 Ido Filin. 

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

in vec3 positVec;
in vec3 normalVec;
in vec2 thetaphi;

out vec4 fragment_color;

const vec3 lightVector = normalize(vec3(+1.0, +1.0, +1.0));
const vec3 lightcolor = vec3(0.8, 0.8, 0.1);
const vec3 ambientcolor = vec3(1.0, 1.0, 1.0);
const float ambiencefactor = 0.5;

void main(void)
{
	float directLightFactor = dot(lightVector, normalize(normalVec));
	vec3 mixedcolor = ambiencefactor*ambientcolor + (1.0-ambiencefactor)*lightcolor*abs(directLightFactor);
	//vec3 mixedcolor = mix(downcolor, upcolor, zfactor);
	fragment_color = mix(0.6, 1.0, gl_FrontFacing) * vec4(
			mixedcolor, 
			smoothstep( 0.5 , 1.0, 1.0 - cos(thetaphi.y))
	);
}
