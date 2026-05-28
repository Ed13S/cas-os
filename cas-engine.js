function CAS(input){
  try {
    input = input.trim();
    if(input.startsWith("solve")){
      return Algebrite.run(`roots(${input.replace("solve","").trim()})`);
    }
    if(input.startsWith("diff")){
      return Algebrite.run(`d(${input.replace("diff","").trim()})`);
    }
    if(input.startsWith("int")){
      return Algebrite.run(`integral(${input.replace("int","").trim()})`);
    }
    if(input.startsWith("factor")){
      return Algebrite.run(`factor(${input.replace("factor","").trim()})`);
    }
    if(input.startsWith("expand")){
      return Algebrite.run(`expand(${input.replace("expand","").trim()})`);
    }
    if(input.startsWith("limit")){
      return Algebrite.run(`limit(${input.replace("limit","").trim()})`);
    }
    if(input.startsWith("taylor")){
      return Algebrite.run(`taylor(${input.replace("taylor","").trim()})`);
    }
    return Algebrite.run(input);
  } catch(e){
    return "CAS ERROR: "+e.message;
  }
}
