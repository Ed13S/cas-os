function explain(input){
  input = input.trim();
  if(input.startsWith("solve")){
    return ["Step 1: Move terms","Step 2: Set =0","Step 3: Factor or quadratic formula","Step 4: Solve"].join("\n");
  }
  if(input.startsWith("diff")){
    return ["Step 1: Apply power rule d(x^n)=n*x^(n-1)","Step 2: Reduce exponent","Step 3: Multiply coefficient"].join("\n");
  }
  if(input.startsWith("int")){
    return ["Step 1: Increase exponent by 1","Step 2: Divide by new exponent","Step 3: Add constant C"].join("\n");
  }
  return "No step-by-step available.";
}
