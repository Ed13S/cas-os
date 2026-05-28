function run(){
  const input=document.getElementById("input").value;
  const out=document.getElementById("output");
  let result=CAS(input);
  out.textContent="RESULT:\n"+result+"\n\nSTEPS:\n"+explain(input);
  if(input.startsWith("plot")) plot(input.replace("plot","").trim());
}
function askAI(){
  const q=document.getElementById("aiinput").value;
  document.getElementById("aiout").textContent=aiMini(q);
}
function runSci(){
  const q=document.getElementById("physinput").value;
  let r="";
  if(q.toLowerCase().includes("physics")) r=physics(q);
  if(q
