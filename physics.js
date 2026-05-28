function physics(input){
  input = input.toLowerCase();
  try{
    if(input.includes("f=m*a")) return "Force F = m*a. Plug in values to compute.";
    if(input.includes("v=u+at")) return "Velocity v = u + a*t. Substitute known values.";
    return "Physics engine supports kinematics formulas.";
  }catch(e){return e.message;}
}
