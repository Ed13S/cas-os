function physics(input){
  input = input.toLowerCase();

  if(input.includes("f=m*a")) return "CAS_OS Physics: F = m × a";
  if(input.includes("v=u+at")) return "CAS_OS Physics: v = u + at";

  return "CAS_OS Physics module active.";
}
