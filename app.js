function run(){

  const input = document.getElementById("input").value;

  let result = CAS(input);

  document.getElementById("output").textContent =
    result + "\n\n" + explain(input);

  if(input.startsWith("plot"))
    plot(input.replace("plot","").trim());
}
