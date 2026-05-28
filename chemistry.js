function chemistry(input){
  input = input.toUpperCase().replace(/\s/g,"");

  if(input === "H2+O2->H2O")
    return "CAS_OS Chemistry: 2H2 + O2 -> 2H2O";

  return "CAS_OS Chemistry module active.";
}
