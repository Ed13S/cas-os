function aiMini(q){
  q=q.toLowerCase();
  if(q.includes("solve")) return "Break equation → isolate variable → factor or quadratic formula → solve roots.";
  if(q.includes("derivative")) return "Power rule: multiply exponent, reduce power by 1.";
  if(q.includes("integral")) return "Reverse power rule + constant C.";
  if(q.includes("physics")) return "Identify formula, substitute known values, solve.";
  if(q.includes("chem")) return "Check atom counts, balance each element.";
  return "Offline AI tutor can explain algebra, calculus, physics, chemistry.";
}
