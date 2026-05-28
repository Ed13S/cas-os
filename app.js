const AI_KEY = "AIzaSyBCHRBH-Nr8_T9u76TuNsM-KCkyFp2qMUM";

function run(){

  const input=document.getElementById("input").value;

  document.getElementById("output").textContent =
    CAS(input) + "\n\n" + explain(input);

  if(input.startsWith("plot"))
    plot(input.replace("plot","").trim());
}
