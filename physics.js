function physics(input){

  input = input.toLowerCase();

  if(input.includes("f=m*a"))
    return "F = m × a";

  if(input.includes("v=u+at"))
    return "v = u + at";

  return "Physics module active (basic)";
}
