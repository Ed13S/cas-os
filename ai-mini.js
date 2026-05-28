function physics(input){
  input=input.toLowerCase();

  if(input.includes("f=m*a"))
    return "Force = mass × acceleration";

  if(input.includes("v=u+at"))
    return "Final velocity formula applied";

  return "Physics engine: basic formulas supported";
}
