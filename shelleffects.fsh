/*
Copyright (C) 2025–2026 Ido Filin. 

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

smooth centroid in vec3 positVec;
smooth centroid in vec3 normalVec;
smooth centroid in vec2 thetaphi;

out vec4 fragment_color;

uniform float fixedcolorFactor;
uniform vec3 fixedColor;
uniform float alphaOut;
uniform int multispiral;

const vec3 lightVector = normalize(vec3(+1.0, +1.0, +1.0));
const vec3 lightcolor = vec3(0.8, 0.8, 0.1);
const vec3 multispiralColors[7] = vec3[](
    vec3(0.2, 0.4, 0.85), 
    vec3(0.86, 0.22, 0.07), 
    vec3(1.0, 0.6, 0.0),
    vec3(0.06, 0.59, 9.09), 
    vec3(0.6, 0.0, 0.6), 
    vec3(1.0, 0.6, 0.77), 
    vec3(0.86, 0.27, 0.46) 
);

void main(void)
{
	vec4 outgoingColor;
	float phi = (thetaphi.y+1.1*PI)/2.0/PI*7.0 + 1.0;
	bool isNotMultispiral = bool(step(0.2,mod(phi*phi/4.8,1.0)) > 0.0);
	bool multispiralFlag = bool(multispiral);
	if (multispiralFlag && isNotMultispiral) {
		discard;
	} else if (multispiralFlag) {
		int multispiralIndex = int(mod(floor(phi+6.0),7.0));
		vec4 multispiralColor = 
				vec4(multispiralColors[multispiralIndex],1.0);
		outgoingColor = multispiralColor;
	} else {
		float directLightFactor = abs(dot(lightVector, normalize(normalVec)));
		vec3 directLightColor = lightcolor*mix(1.0 - directLightFactor, directLightFactor, gl_FrontFacing);
		vec3 shellColor = mix(0.8, 1.0, gl_FrontFacing) * 
			mix( directLightColor, fixedColor, fixedcolorFactor );
		outgoingColor = vec4(shellColor, alphaOut);
	}

	fragment_color = outgoingColor;
	//gl_FragDepth = gl_FragDepth - float(gl_FrontFacing)*1.0e-3;
}
