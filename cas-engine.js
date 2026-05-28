function CAS(input){
  try{

    input = input.trim();

    if(input.startsWith("solve")){
      let eq = input.replace("solve","").trim();
      return "Solve:\n" + Algebrite.run(`roots(${eq})`);
    }

    if(input.startsWith("diff")){
      let e = input.replace("diff","").trim();
      return "Derivative:\n" + Algebrite.run(`d(${e})`);
    }

    if(input.startsWith("int")){
      let e = input.replace("int","").trim();
      return "Integral:\n" + Algebrite.run(`integral(${e})`);
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
