function run(){
  const input = document.getElementById("input").value;

  const result = CAS(input);

  document.getElementById("output").textContent =
    "CAS_OS OUTPUT:\n" + result + "\n\n" + explain(input);

  if(input.startsWith("plot"))
    plot(input.replace("plot","").trim());

  if(input.includes("physics"))
    document.getElementById("output").textContent += "\n\n" + physics(input);

  if(input.includes("chemistry"))
    document.getElementById("output").textContent += "\n\n" + chemistry(input);
}
