
//////////////////////////////////////////////////////////
// 🔑 API KEY GOES HERE (LINE 6)
//////////////////////////////////////////////////////////

const AI_KEY = "PASTE_YOUR_API_KEY_HERE";

//////////////////////////////////////////////////////////

function run(){

  const input = document.getElementById("input").value;
  const out = document.getElementById("output");

  let result = CAS(input);

  out.textContent = result;

  if(input.startsWith("plot")){
    plot(input.replace("plot","").trim());
  }
}
