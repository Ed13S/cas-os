function explain(input){

  if(input.startsWith("solve"))
    return "Move terms → factor → solve roots";

  if(input.startsWith("diff"))
    return "Power rule applied";

  if(input.startsWith("int"))
    return "Reverse power rule + C";

  return "No steps available";
}
