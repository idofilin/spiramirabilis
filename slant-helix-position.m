%{
Copyright (C) 2025–2026 Ido Filin. 

This GNU Octave code is free software; you can redistribute it
and/or modify it under the terms of the GNU General Public
License as published by the Free Software Foundation; either
version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  
See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
%}

pkg load symbolic;
syms lambda0 c g s0 gamma theta lambda positive;
syms t x(t) y(t) z(t);
syms C1;

%%%
% Solve ODEs for position vector
odeZ = diff(z,t) == sin(lambda0+c*t)*sqrt(1-c^2)*exp(g*t)*s0*g
odeX = diff(x,t) == (-cos(lambda0+c*t)*sin(t)+c*sin(lambda0+c*t)*cos(t))*exp(g*t)*s0*g
odeY = diff(y,t) == (cos(lambda0+c*t)*cos(t)+c*sin(lambda0+c*t)*sin(t))*exp(g*t)*s0*g

solX = subs(dsolve(odeX),C1,0)
solY = subs(dsolve(odeY),C1,0)
solZ = subs(dsolve(odeZ),C1,0)

%%%
% Generate expressions for LaTeX and GLSL
xydenom = c^4+2*c^2*g^2-2*c^2+g^4+2*g^2+1;
ZtoEq = subs(simplify(solZ), {g,t},{gamma,theta})
XtoEq = subs(simplify(exp(-g*t)/s0/g*xydenom*solX), {g,c*t+lambda0,t},{gamma,lambda,theta})
YtoEq = subs(simplify(exp(-g*t)/s0/g*xydenom*solY), {g,c*t+lambda0,t},{gamma,lambda,theta})
XYdenomtoEq = subs(simplify(xydenom), {g,c*t+lambda0,t},{gamma,lambda,theta})

function [retval] = cleanLatex(txt) 
	retval = regexprep(txt,'(\\left\(|\\right\))','')
endfunction
	
function [retval] = sym2GLSL(txt) 
	retval = regexprep(txt,'(c|gamma)\*\*(\d)','pow($1, $2\.0)')
	retval = regexprep(retval,'(\d)\*','$1\.0\*')
endfunction
	
%%%
% Definitions input file for LaTeX
filename = "log-slant-helix-solution.tex";
fid = fopen (filename, "w");
fputs (fid, "\\newcommand\\logslantsolZ{");
fputs (fid, latex(ZtoEq));
fputs (fid, "}%\n");
fputs (fid, "\\newcommand\\logslantsolX{");
fputs (fid, cleanLatex(latex(XtoEq)));
fputs (fid, "}%\n");
fputs (fid, "\\newcommand\\logslantsolY{");
fputs (fid, cleanLatex(latex(YtoEq)));
fputs (fid, "}%\n");
fputs (fid, "\\newcommand\\logslantsolXYdenom{");
fputs (fid, latex(XYdenomtoEq));
fputs (fid, "}%\n");
fputs (fid, "\\endinput");
fclose (fid);

%%%
% GLSL function definitions, to be included in vertex shader
filename = "log-slant-helix-solution.glsl";
fid = fopen (filename, "w");
fputs (fid, "float solutionXcoord(float theta, float c, float gamma, float lambda) {\n    return ");
fputs (fid, sym2GLSL(char(XtoEq)));
fputs (fid, ";\n}\n");
fputs (fid, "float solutionYcoord(float theta, float c, float gamma, float lambda) {\n    return ");
fputs (fid, sym2GLSL(char(YtoEq)));
fputs (fid, ";\n}\n");
fclose (fid);
