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

in vec2 coord;

out vec3 positVec;
out vec3 normalVec;
out vec2 thetaphi;

uniform vec2 lambda;
uniform float thetaFactor;
uniform float expansionRate;
uniform float beta;
uniform float S0;
uniform float dilation;
uniform float revolutionOffset;
uniform float zOffset;
uniform mat4 projmatrix;
uniform mat4 rotmatrix;
//uniform int archimedes;
uniform int circhelix;

float solutionXcoord(float theta, float c, float gamma, float lambda) {
/* This is taken from symbolic math solution, using GNU Octave and SymPy */
    return -pow(c, 4.0)*cos(lambda)*cos(theta) + pow(c, 3.0)*gamma*sin(lambda)*cos(theta) - 2.0*pow(c, 3.0)*sin(lambda)*sin(theta) - pow(c, 2.0)*pow(gamma, 2.0)*cos(lambda)*cos(theta) - 3.0*pow(c, 2.0)*gamma*sin(theta)*cos(lambda) + c*pow(gamma, 3.0)*sin(lambda)*cos(theta) + 3.0*c*gamma*sin(lambda)*cos(theta) + 2.0*c*sin(lambda)*sin(theta) - pow(gamma, 3.0)*sin(theta)*cos(lambda) + pow(gamma, 2.0)*cos(lambda)*cos(theta) - gamma*sin(theta)*cos(lambda) + cos(lambda)*cos(theta);
}

float solutionYcoord(float theta, float c, float gamma, float lambda) {
/* This is taken from symbolic math solution, using GNU Octave and SymPy */
    return -pow(c, 4.0)*sin(theta)*cos(lambda) + pow(c, 3.0)*gamma*sin(lambda)*sin(theta) + 2.0*pow(c, 3.0)*sin(lambda)*cos(theta) - pow(c, 2.0)*pow(gamma, 2.0)*sin(theta)*cos(lambda) + 3.0*pow(c, 2.0)*gamma*cos(lambda)*cos(theta) + c*pow(gamma, 3.0)*sin(lambda)*sin(theta) + 3.0*c*gamma*sin(lambda)*sin(theta) - 2.0*c*sin(lambda)*cos(theta) + pow(gamma, 3.0)*cos(lambda)*cos(theta) + pow(gamma, 2.0)*sin(theta)*cos(lambda) + gamma*cos(lambda)*cos(theta) + sin(theta)*cos(lambda);
}

vec3 rotateXYZonAxis(vec3 xyz, vec3 axis, float ang) {
    float cang = cos(ang);
    float sang = sin(ang);
	return xyz*cang + cross(axis, xyz)*sang + 
           axis*dot(axis, xyz)*(1.0-cang);
}

void main()
{
	float g = expansionRate;
	float lead0 = lambda.x;
	float c = lambda.y;
	float theta = (coord.x + revolutionOffset)*thetaFactor;
	float phi = coord.y;
	
	float s = S0*exp(g*theta);
	float lead = lead0 + c*theta;
	vec2 revVec = vec2(cos(theta), sin(theta));
	float xydenom = pow(c,4.0) + 
			2.0*pow(c,2.0)*pow(g,2.0) - 
			2.0*pow(c,2.0) + 
			pow(g,4.0) + 
			2.0*pow(g,2.0) + 1.0;
	float xcoordFactor = solutionXcoord(theta, c, g, lead);
	float ycoordFactor = solutionYcoord(theta, c, g, lead);
	vec3 spiral = g*s * 
			vec3(xcoordFactor/xydenom, ycoordFactor/xydenom,
				sqrt(1.0-c*c)*(c*cos(lead) - g*sin(lead))/(pow(c,2.0)+pow(g,2.0)))
			+ vec3(0.0, 0.0, zOffset);

/*
	if (bool(archimedes)) {
		theta = theta*0.8;
		float R = s;
		float r = R * sin(beta);
		spiral = vec3( r*vec2(cos(theta), sin(theta)), 
							-(1.3*r*r/tan(beta)/tan(beta)) )  + 
						vec3(0.0, 0.0, zOffset);
	}
*/

	if (bool(circhelix)) {
		float tanLeadAng = tan(lead0);
		float scale = projmatrix[3][3];
		float helixR = 0.25*scale;
		s = 0.75*scale;
		spiral = vec3( helixR*revVec, -tanLeadAng*helixR*theta ) + 
						vec3(0.0, 0.0, scale);
	}

	vec3 apertureMargin = rotateXYZonAxis(
			vec3(revVec*0.0, 0.0) + vec3( cos(phi)*revVec, sin(phi) ),
			vec3(revVec,0.0), -lead);
	vec3 gencurvepoint = dilation*s*apertureMargin;
    positVec = spiral + gencurvepoint;
	gl_Position =  projmatrix * rotmatrix * vec4(positVec, 1.0);
	normalVec = (rotmatrix * vec4( apertureMargin, 1.0) ).xyz ;     
	thetaphi = vec2(theta, phi);
}

