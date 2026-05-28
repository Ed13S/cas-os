function explain(input){
  if(input.startsWith("solve"))
    return "Step 1: Rearrange\nStep 2: Standard form\nStep 3: Factor or quadratic formula\nStep 4: Solve roots";

  if(input.startsWith("diff"))
    return "Step 1: Power rule\nStep 2: Multiply exponent\nStep 3: Reduce power";

  if(input.startsWith("int"))
    return "Step 1: Increase exponent\nStep 2: Divide\nStep 3: Add constant";

  return "CAS_OS: No step breakdown available.";
}
