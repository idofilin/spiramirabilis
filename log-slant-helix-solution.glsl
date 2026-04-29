float solutionXcoord(float theta, float c, float gamma, float lambda) {
    return -pow(c, 4.0)*cos(lambda)*cos(theta) + pow(c, 3.0)*gamma*sin(lambda)*cos(theta) - 2.0*pow(c, 3.0)*sin(lambda)*sin(theta) - pow(c, 2.0)*pow(gamma, 2.0)*cos(lambda)*cos(theta) - 3.0*pow(c, 2.0)*gamma*sin(theta)*cos(lambda) + c*pow(gamma, 3.0)*sin(lambda)*cos(theta) + 3.0*c*gamma*sin(lambda)*cos(theta) + 2.0*c*sin(lambda)*sin(theta) - pow(gamma, 3.0)*sin(theta)*cos(lambda) + pow(gamma, 2.0)*cos(lambda)*cos(theta) - gamma*sin(theta)*cos(lambda) + cos(lambda)*cos(theta);
}
float solutionYcoord(float theta, float c, float gamma, float lambda) {
    return -pow(c, 4.0)*sin(theta)*cos(lambda) + pow(c, 3.0)*gamma*sin(lambda)*sin(theta) + 2.0*pow(c, 3.0)*sin(lambda)*cos(theta) - pow(c, 2.0)*pow(gamma, 2.0)*sin(theta)*cos(lambda) + 3.0*pow(c, 2.0)*gamma*cos(lambda)*cos(theta) + c*pow(gamma, 3.0)*sin(lambda)*sin(theta) + 3.0*c*gamma*sin(lambda)*sin(theta) - 2.0*c*sin(lambda)*cos(theta) + pow(gamma, 3.0)*cos(lambda)*cos(theta) + pow(gamma, 2.0)*sin(theta)*cos(lambda) + gamma*cos(lambda)*cos(theta) + sin(theta)*cos(lambda);
}
