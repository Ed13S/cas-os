function run(){

  const input = document.getElementById("input").value;
  const out = document.getElementById("output");

  let result = CAS(input);

  out.textContent =
    "RESULT:\n" + result +
    "\n\nSTEPS:\n" + explain(input);

  // GRAPH SUPPORT
  if(input.startsWith("plot")){
    plot(input.replace("plot","").trim());
  }
}

function askAI(){

  const q = document.getElementById("aiinput").value;

  document.getElementById("aiout").textContent =
    aiMini(q);
}

function runSci(){

  const q = document.getElementById("physinput").value;

  let result = "";

  if(q.toLowerCase().includes("physics")){
    result = physics(q);
  }

  else if(q.toLowerCase().includes("chem")){
    result = chemistry(q.replace("chem","").trim());
  }

  else {
    result = "Unknown science command.";
  }

  document.getElementById("sciout").textContent =
    result;
}
