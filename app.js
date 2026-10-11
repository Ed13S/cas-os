(() => {
  const STORE = "cas-os-document-v2";
  const blank = () => ({version: 1, name: "My Document", active: 0, pages: [
    {type: "calculator", title: "Calculator", rows: [{expression: "", result: ""}]},
    {type: "notes", title: "Notes", text: "Use this page for working, explanations, or copied text."},
    {type: "graph", title: "Graph", expression: "sin(x)", message: ""}
  ]});
  let documentData = load(), selectedRow = 0;

  const $ = s => document.querySelector(s);
  const workspace = $("#workspace");
  const status = $("#saveStatus");
  const name = $("#documentName");

  function load() { try { return JSON.parse(localStorage.getItem(STORE)) || blank(); } catch { return blank(); } }
  function save() {
    localStorage.setItem(STORE, JSON.stringify(documentData));
    name.textContent = documentData.name;
    status.textContent = "Saved";
  }
  function active() { return documentData.pages[documentData.active]; }
  function esc(text) { return String(text ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
  function tabs() {
    return '<nav class="page-tabs">' + documentData.pages.map((p, i) =>
      '<button data-page="' + i + '" class="' + (i === documentData.active ? "active" : "") + '">' + (i + 1) + ': ' + esc(p.title) + '</button>').join("") + '</nav>';
  }
  function render() {
    const page = active();
    let body = "";
    if (page.type === "calculator") body = calculator(page);
    if (page.type === "notes") body = '<section class="page notes-page"><textarea id="notes" aria-label="Notes">' + esc(page.text) + '</textarea></section>';
    if (page.type === "graph") body = graph(page);
    workspace.innerHTML = tabs() + body;
    workspace.querySelectorAll("[data-page]").forEach(b => b.onclick = () => { documentData.active = +b.dataset.page; selectedRow = 0; render(); save(); });
    wirePage(page);
    name.textContent = documentData.name;
  }
  function calculator(page) {
    return '<section class="page calc-page"><div class="page-title">Calculator <span>exact / approximate / symbolic</span></div>' +
      page.rows.map((row, i) => '<div class="math-row ' + (i === selectedRow ? "selected" : "") + '" data-row="' + i + '">' +
      '<span class="row-number">' + (i + 1) + '</span><div><input class="expression" data-row="' + i + '" value="' + esc(row.expression) + '" placeholder="Type an expression"><output>' + esc(row.result) + '</output></div></div>').join("") +
      '<button id="addRow" class="add-row">+ Add calculation</button></section>';
  }
  function graph(page) {
    return '<section class="page graph-page"><div class="page-title">Graph <span>function preview</span></div><label>f(x) = <input id="graphExpression" value="' + esc(page.expression) + '"></label><button id="drawGraph">Draw</button><canvas id="graphCanvas" width="600" height="310"></canvas><output id="graphMessage">' + esc(page.message) + '</output></section>';
  }
  function wirePage(page) {
    if (page.type === "calculator") {
      workspace.querySelectorAll(".expression").forEach(input => {
        input.onfocus = () => selectedRow = +input.dataset.row;
        input.oninput = () => { page.rows[+input.dataset.row].expression = input.value; status.textContent = "Unsaved"; };
        input.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); evaluate(+input.dataset.row); } if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); addRow(); } };
      });
      $("#addRow").onclick = addRow;
      requestAnimationFrame(() => workspace.querySelector('.selected input')?.focus());
    }
    if (page.type === "notes") $("#notes").oninput = e => { page.text = e.target.value; status.textContent = "Unsaved"; save(); };
    if (page.type === "graph") { $("#drawGraph").onclick = () => drawGraph(page); $("#graphExpression").onkeydown = e => { if(e.key === "Enter") drawGraph(page); }; drawGraph(page); }
  }
  function evaluate(index) {
    const row = active().rows[index], expression = row.expression.trim();
    if (!expression) return;
    try {
      let out;
      if (/^(solve|factor|expand|diff|int)\b/.test(expression) && window.Algebrite) {
        const [command, ...terms] = expression.split(/\s+/);
        const x = terms.join(" ");
        const map = {solve: "roots", diff: "d", int: "integral", factor: "factor", expand: "expand"};
        out = Algebrite.run(map[command] + "(" + x.replace(/=/g, "-(").replace(/\)-\(/g, ")-(") + ")");
      } else out = window.math ? math.format(math.evaluate(expression), {precision: 14}) : "Math engine is loading…";
      row.result = out;
    } catch (error) { row.result = "Error: " + error.message; }
    save(); render();
  }
  function addRow() { const p = active(); p.rows.push({expression:"", result:""}); selectedRow = p.rows.length - 1; save(); render(); }
  function insert(value) {
    const input = workspace.querySelector('.selected input') || workspace.querySelector('.expression');
    if (!input) return;
    if (value === "enter") return evaluate(+input.dataset.row);
    if (value === "del") { input.value = input.value.slice(0, input.selectionStart - (input.selectionStart === input.selectionEnd ? 1 : 0)) + input.value.slice(input.selectionEnd); }
    else { const a=input.selectionStart, b=input.selectionEnd; input.value=input.value.slice(0,a)+value+input.value.slice(b); input.setSelectionRange(a+value.length,a+value.length); }
    active().rows[+input.dataset.row].expression = input.value; input.focus(); status.textContent="Unsaved";
  }
  function drawGraph(page) {
    page.expression = $("#graphExpression").value;
    const c = $("#graphCanvas"), ctx = c.getContext("2d"), w = c.width, h = c.height, scale = 32;
    ctx.clearRect(0,0,w,h); ctx.fillStyle="#fafdfd"; ctx.fillRect(0,0,w,h); ctx.strokeStyle="#d4dddd"; ctx.lineWidth=1;
    for(let x=0;x<w;x+=scale){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()} for(let y=0;y<h;y+=scale){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
    ctx.strokeStyle="#65727a"; ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();
    try { ctx.strokeStyle="#16877b";ctx.lineWidth=2;ctx.beginPath(); for(let px=0;px<w;px++){const x=(px-w/2)/scale;const y=math.evaluate(page.expression,{x});const py=h/2-y*scale;if(!Number.isFinite(py))continue;px?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke();page.message="Graph drawn"; } catch(e) {page.message="Graph error: "+e.message;}
    $("#graphMessage").textContent = page.message; save();
  }
  function newPage() {
    const type = prompt("Page type: calculator, notes, or graph", "calculator"); if (!type) return;
    const t = type.toLowerCase();
    if (t === "notes") documentData.pages.push({type:"notes",title:"Notes",text:""});
    else if (t === "graph") documentData.pages.push({type:"graph",title:"Graph",expression:"x^2",message:""});
    else documentData.pages.push({type:"calculator",title:"Calculator",rows:[{expression:"",result:""}]});
    documentData.active=documentData.pages.length-1;save();render();
  }
  $("#newPage").onclick = newPage;
  $("#documents").onclick = () => { $("#nameInput").value=documentData.name; $("#documentDialog").showModal(); };
  $("#rename").onclick = e => { e.preventDefault(); documentData.name=$("#nameInput").value.trim()||"Untitled";save();$("#documentDialog").close();render(); };
  $("#exportDoc").onclick = () => { const blob=new Blob([JSON.stringify(documentData,null,2)],{type:"application/json"}); const a=Object.assign(document.createElement("a"),{href:URL.createObjectURL(blob),download:documentData.name.replace(/[^a-z0-9]+/gi,"-")+".casdoc"});a.click();URL.revokeObjectURL(a.href); };
  $("#importDoc").onchange = e => { const file=e.target.files[0]; if(!file)return; const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!Array.isArray(data.pages))throw Error("missing pages");documentData=data;documentData.active=0;save();render();$("#documentDialog").close();}catch(err){alert("This is not a valid CAS OS document: "+err.message);}};reader.readAsText(file); };
  document.querySelectorAll("[data-key]").forEach(b => b.onclick = () => { if(b.dataset.key==="doc")$("#documents").click(); else if(b.dataset.key==="menu")newPage(); else insert(b.dataset.key); });
  document.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => { if(b.dataset.nav==="left"||b.dataset.nav==="right"){documentData.active=(documentData.active+(b.dataset.nav==="left"?-1:1)+documentData.pages.length)%documentData.pages.length;render();save();} });
  render(); save();
})();