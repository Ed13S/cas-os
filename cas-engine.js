function CAS(input){
  try{
    input = input.trim();

    if(input.startsWith("solve")){
      let eq = input.replace("solve","").trim();
      return "Solve Steps:\n1) Move all terms to one side\n2) Factor or use formula\n3) Solve roots\n\nResult:\n" +
        Algebrite.run(`roots(${eq})`);
    }

    if(input.startsWith("diff")){
      let e = input.replace("diff","").trim();
      return "Derivative Steps:\n1) Apply power rule\n2) Reduce exponent\n\nResult:\n" +
        Algebrite.run(`d(${e})`);
    }

    if(input.startsWith("int")){
      let e = input.replace("int","").trim();
      return "Integral Steps:\n1) Increase power\n2) Divide\n3) +C\n\nResult:\n" +
        Algebrite.run(`integral(${e})`);
    }

    if(input.startsWith("factor")){
      return Algebrite.run(`factor(${input.replace("factor","").trim()})`);
    }

    if(input.startsWith("expand")){
      return Algebrite.run(`expand(${input.replace("expand","").trim()})`);
    }

    return Algebrite.run(input);

  }catch(e){
    return "CAS ERROR: " + e.message;
  }
}
