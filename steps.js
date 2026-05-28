function explain(input){

  if(input.startsWith("solve")){
    return `STEP-BY-STEP:
1. Move all terms to one side
2. Simplify to standard form ax^2 + bx + c = 0
3. Factor OR use quadratic formula
4. Solve roots`;
  }

  if(input.startsWith("diff")){
    return `STEP-BY-STEP:
1. Identify exponent rule
2. Multiply exponent
3. Reduce exponent by 1`;
  }

  if(input.startsWith("int")){
    return `STEP-BY-STEP:
1. Increase exponent by 1
2. Divide by new exponent
3. Add constant C`;
  }

  return "No step breakdown available.";
}
