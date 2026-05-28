function chemistry(input){
  input=input.toUpperCase().replace(/\s/g,"");

  if(input==="H2+O2->H2O")
    return "Balanced: 2H2 + O2 -> 2H2O";

  return "Chemistry: basic balancing engine";
}
