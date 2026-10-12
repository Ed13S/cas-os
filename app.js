(() => {
  const $ = (s) => document.querySelector(s),
    KEY = "cas-os-reliable-v1",
    types = [
      ["calculator", "Calculator", "Arithmetic and CAS"],
      ["graph", "Graphs", "Plot f(x)"],
      ["notes", "Notes", "Plain-text notes"],
      ["tutor", "AI Tutor", "OpenRouter help"],
      ["python", "Python", "Runs with Pyodide"],
      ["spreadsheet", "Lists & Spreadsheet", "Table editor"],
      ["geometry", "Geometry", "Construction notes"],
      ["statistics", "Data & Statistics", "Data notes"],
      ["tns", "TI-Nspire file (.tns)", "Create, open, edit and save .tns"],
    ],
    commands = [
      ["Solve", "solve("],
      ["Factor", "factor("],
      ["Expand", "expand("],
      ["Derivative", "diff("],
      ["Integral", "integral("],
      ["Approximate", "approx("],
      ["AI help", "@ai"],
    ],
    blank = () => ({
      name: "My Document",
      active: 0,
      pages: [{ kind: "calculator", title: "Calculate", rows: [{ input: "", output: "" }] }],
    });
  let doc;
  try {
    doc = JSON.parse(localStorage.getItem(KEY)) || blank();
  } catch {
    doc = blank();
  }
  let selected = 0,
    py = null;
  const esc = (x) =>
      String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]),
    page = () => doc.pages[doc.active],
    persist = () => {
      try {
        localStorage.setItem(KEY, JSON.stringify(doc));
      } catch (e) {
        /* storage full or blocked: keep working, just don't save */
      }
      $("#name").textContent = doc.name || "My Document";
    },
    getKey = () => {
      const typed = $("#apiKey") && $("#apiKey").value.trim();
      if (typed) return typed;
      try {
        return sessionStorage.getItem("cas-os-key") || "";
      } catch (e) {
        return "";
      }
    },
    download = (name, bytes, type) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([bytes], { type: type || "application/octet-stream" }));
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
    b64enc = (u8) => {
      let s = "";
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(s);
    },
    b64dec = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  function render() {
    let p = page(),
      v =
        "<nav>" +
        doc.pages
          .map(
            (x, i) =>
              '<button data-tab="' +
              i +
              '" class="' +
              (i === doc.active ? "on" : "") +
              '">' +
              (i + 1) +
              ". " +
              esc(x.title) +
              "</button>",
          )
          .join("") +
        "</nav>";
    if (p.kind === "calculator")
      v +=
        '<section class="page"><h3>Calculator <small>solve(x^3=27,x) &middot; diff(x^3) &middot; integral(x^2) &middot; factor(x^2-9)</small></h3>' +
        p.rows
          .map(
            (r, i) =>
              '<div class="row ' +
              (i === selected ? "sel" : "") +
              '"><i>' +
              (i + 1) +
              '</i><div><input data-row="' +
              i +
              '" value="' +
              esc(r.input) +
              '" placeholder="Type a calculation"><output>' +
              esc(r.output) +
              "</output>" +
              (r.note ? '<small class="note">' + esc(r.note) + "</small>" : "") +
              "</div></div>",
          )
          .join("") +
        '<button id="addRow">+ Calculation</button></section>';
    else if (p.kind === "graph")
      v +=
        '<section class="page"><h3>Graphs</h3><label>f(x) = <input id="formula" value="' +
        esc(p.formula || "sin(x)") +
        '"></label><button id="draw">Draw</button><canvas id="plot" width="640" height="300"></canvas><output id="graphOut"></output></section>';
    else if (p.kind === "tutor")
      v +=
        '<section class="page"><h3>AI Tutor</h3><input id="apiKey" type="password" placeholder="OpenRouter API key (kept for this tab only)" value="' +
        esc(getKey()) +
        '"><textarea id="question" placeholder="Ask a maths question">' +
        esc(p.question || "") +
        '</textarea><button id="ask">Ask tutor</button><pre id="answer">' +
        esc(p.answer || "") +
        "</pre><small>Plain text only, no LaTex.</small></section>";
    else if (p.kind === "python")
      v +=
        '<section class="page"><h3>Python</h3><textarea id="code" spellcheck="false">' +
        esc(p.code || 'print("Hello from CAS OS")') +
        '</textarea><button id="runPython">Run Python</button><pre id="pythonOut">' +
        esc(p.output || "") +
        "</pre></section>";
    else if (p.kind === "tns")
      v +=
        '<section class="page tns"><h3>TI-Nspire file <small>' +
        esc(p.title) +
        '</small></h3><label>Part <select id="tnsFile">' +
        tnsParts(p)
          .map((x, i) => '<option value="' + i + '"' + (i === (p.sel || 0) ? " selected" : "") + ">" + esc(x.label) + "</option>")
          .join("") +
        '</select></label><textarea id="tnsText" spellcheck="false"></textarea><div class="tnsbar"><button id="tnsSave">Save as .tns</button><button id="tnsAddLua">Add Lua script</button><button id="tnsAddPy">Add Python script</button></div><output id="tnsOut">' +
        esc(p.status || "") +
        "</output><small>Lua scripts and Problem XML can be edited as text. Files made by TI\u2019s own software may be locked parts that are kept as they are.</small></section>";
    else
      v +=
        '<section class="page"><h3>' +
        esc(p.title) +
        '</h3><textarea id="notes" placeholder="Write here">' +
        esc(p.text || "") +
        "</textarea></section>";
    $("#work").innerHTML = v;
    wire();
    persist();
  }
  function wire() {
    document.querySelectorAll("[data-tab]").forEach(
      (b) =>
        (b.onclick = () => {
          doc.active = +b.dataset.tab;
          selected = 0;
          render();
        }),
    );
    let p = page();
    if (p.kind === "calculator") {
      document.querySelectorAll("[data-row]").forEach((x) => {
        x.onfocus = () => (selected = +x.dataset.row);
        x.oninput = () => {
          p.rows[+x.dataset.row].input = x.value;
          persist();
        };
        x.onkeydown = (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            evaluate(+x.dataset.row);
          }
        };
      });
      $("#addRow").onclick = addRow;
    } else if (["notes", "geometry", "statistics", "spreadsheet"].includes(p.kind))
      $("#notes").oninput = (e) => {
        p.text = e.target.value;
        persist();
      };
    else if (p.kind === "graph") $("#draw").onclick = drawGraph;
    else if (p.kind === "tutor") {
      $("#apiKey").oninput = (e) => {
        try {
          sessionStorage.setItem("cas-os-key", e.target.value.trim());
        } catch (err) {
          /* private mode: key just lives in the field */
        }
      };
      $("#ask").onclick = askTutor;
    } else if (p.kind === "tns") wireTns(p);
    else if (p.kind === "python") $("#runPython").onclick = runPython;
  }
  function evaluate(i) {
    const rows = page().rows,
      r = rows[i],
      s = r.input.trim();
    if (!s) return;
    const res = CASEngine.calculate(s, { math, Algebrite });
    r.note = res.notes.join(" ");
    if (res.kind === "question") {
      // plain English, not maths: hand it to the AI tutor instead of the maths parser
      r.output = getKey() ? "Asking the AI tutor\u2026" : "That reads like a question. Add an OpenRouter key on an AI Tutor page (menu > AI help) to ask it here.";
      if (getKey()) {
        const mine = r;
        tutorRequest(res.question)
          .then((t) => (mine.output = t))
          .catch((e) => (mine.output = "AI error: " + e.message))
          .then(() => {
            if (doc.pages.some((pg) => pg.rows && pg.rows.includes(mine))) render();
          });
      }
    } else r.output = res.output;
    if (i === rows.length - 1) rows.push({ input: "", output: "" });
    selected = Math.min(i + 1, rows.length - 1);
    render();
  }
  function addRow() {
    page().rows.push({ input: "", output: "" });
    selected = page().rows.length - 1;
    render();
  }
  function activeInput() {
    return document.querySelector(".sel input") || document.querySelector("[data-row]");
  }
  function insert(v) {
    let x = activeInput();
    if (!x) return;
    let a = x.selectionStart,
      b = x.selectionEnd;
    if (v === "del") x.value = x.value.slice(0, a - (a === b ? 1 : 0)) + x.value.slice(b);
    else x.value = x.value.slice(0, a) + v + x.value.slice(b);
    page().rows[+x.dataset.row].input = x.value;
    x.focus();
    x.setSelectionRange(a + v.length, a + v.length);
  }
  function drawGraph() {
    let p = page(),
      ex = $("#formula").value;
    p.formula = ex;
    const fixed = CASEngine.balanceBrackets(CASEngine.normalize(ex));
    if (fixed.error) {
      $("#graphOut").textContent = "Graph error: " + fixed.error;
      return;
    }
    ex = fixed.text;
    let c = $("#plot"),
      g = c.getContext("2d"),
      w = c.width,
      h = c.height,
      k = 32;
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#fff";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#d2dddd";
    for (let x = 0; x < w; x += k) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
    for (let y = 0; y < h; y += k) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.strokeStyle = "#555";
    g.beginPath();
    g.moveTo(0, h / 2);
    g.lineTo(w, h / 2);
    g.moveTo(w / 2, 0);
    g.lineTo(w / 2, h);
    g.stroke();
    try {
      g.strokeStyle = "#087f73";
      g.lineWidth = 2;
      g.beginPath();
      for (let px = 0; px < w; px++) {
        let x = (px - w / 2) / k,
          y = math.evaluate(ex, { x }),
          py = h / 2 - y * k;
        if (!Number.isFinite(py)) continue;
        px ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.stroke();
      $("#graphOut").textContent = "Graph drawn";
      persist();
    } catch (e) {
      $("#graphOut").textContent = "Graph error: " + e.message;
    }
  }
  async function tutorRequest(q) {
    const key = getKey();
    if (!key) throw Error("Enter your OpenRouter API key first.");
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          {
            role: "system",
            content:
              "You are a maths tutor built into a calculator. The student may type quickly: expect typos and missing closing brackets. " +
              "Work out what they most likely meant, say what you assumed, then answer. Use plain text maths only. No LaTeX.",
          },
          { role: "user", content: q },
        ],
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw Error((j.error && j.error.message) || "Request failed (" + res.status + ")");
    const text = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!text) throw Error("The AI returned an empty answer. Try again.");
    return text;
  }
  async function askTutor() {
    const p = page(),
      q = $("#question").value.trim();
    if (!q) return ($("#answer").textContent = "Type a question first.");
    $("#answer").textContent = "Thinking\u2026";
    try {
      p.answer = await tutorRequest(q);
      p.question = q;
      $("#answer").textContent = p.answer;
      persist();
    } catch (e) {
      $("#answer").textContent = "AI error: " + e.message;
    }
  }
  async function runPython() {
    let p = page(),
      o = $("#pythonOut");
    o.textContent = "Loading Python…";
    try {
      if (!py) {
        await new Promise((ok, bad) => {
          let s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
          s.onload = ok;
          s.onerror = bad;
          document.head.appendChild(s);
        });
        py = await loadPyodide();
      }
      let lines = [];
      py.setStdout({ batched: (x) => lines.push(x) });
      await py.runPythonAsync($("#code").value);
      p.code = $("#code").value;
      p.output = lines.join("\n") || "Done";
      o.textContent = p.output;
      persist();
    } catch (e) {
      o.textContent = "Python error: " + e.message;
    }
  }
  // ---- TI-Nspire (.tns) pages ------------------------------------------------------
  const TNS_STARTER =
    '-- A TI-Nspire Lua program. Save this page as .tns and open it on the calculator.\n' +
    'function on.paint(gc)\n' +
    '  gc:setFont("sansserif", "b", 12)\n' +
    '  gc:drawString("Hello from CAS OS", 10, 10, "top")\n' +
    'end\n';
  // The editable "parts" of a .tns page: the Lua script (if any) and each file in the archive.
  function tnsParts(p) {
    const parts = [];
    if (p.lua != null) parts.push({ label: "Lua script", lua: true });
    p.files.forEach((f, i) => parts.push({ label: f.name + (f.kind === "xml" || f.kind === "text" ? "" : f.kind === "opaque" ? " (locked, kept as is)" : " (binary)"), index: i }));
    return parts;
  }
  function tnsDoc(p) {
    const files = p.files.map((f) => (f.kind === "text" ? { name: f.name, kind: "binary", data: new TextEncoder().encode(f.text) } : f.b64 ? { name: f.name, kind: f.kind, data: b64dec(f.b64), method: f.method, usize: f.usize } : { name: f.name, kind: f.kind, text: f.text, mode: f.mode, header: f.header }));
    if (p.pyName && !files.some((f) => f.name === "Problem1.xml")) files.push(TNS.pythonProblemFile(p.pyName));
    let d = { version: p.version, files };
    if (p.lua != null) {
      const cur = TNS.luaFromDocument(d);
      if (!cur || cur.source !== p.lua) d = cur ? TNS.replaceLua(d, p.lua) : { version: d.version, files: [...files, ...TNS.newLuaDocument(p.lua).files] };
    }
    return d;
  }
  function tnsFromRead(name, d) {
    const p = { kind: "tns", title: name, version: d.version, sel: 0, status: "", lua: null, files: [] };
    const TEXTY = /\.(py|txt|lua|csv)$/i;
    for (const f of d.files) p.files.push(f.kind === "binary" && TEXTY.test(f.name) ? { name: f.name, kind: "text", text: new TextDecoder().decode(f.data) } : f.kind === "xml" ? { name: f.name, kind: "xml", text: f.text, mode: f.mode, header: f.header } : { name: f.name, kind: f.kind, b64: b64enc(f.data), method: f.method });
    const lua = TNS.luaFromDocument(d);
    if (lua) p.lua = lua.source;
    return p;
  }
  function wireTns(p) {
    const sel = $("#tnsFile"),
      box = $("#tnsText"),
      out = $("#tnsOut");
    const show = () => {
      const part = tnsParts(p)[p.sel || 0];
      if (!part) {
        box.value = "";
        box.disabled = true;
        return;
      }
      const f = part.lua ? null : p.files[part.index];
      box.disabled = !!f && f.kind !== "xml" && f.kind !== "text";
      box.value = part.lua ? p.lua : f.kind === "xml" || f.kind === "text" ? f.text : "(" + (f.kind === "opaque" ? "locked" : "binary") + " file, kept exactly as it is)";
    };
    sel.onchange = () => {
      p.sel = +sel.value;
      show();
    };
    box.oninput = () => {
      const part = tnsParts(p)[p.sel || 0];
      if (part.lua) p.lua = box.value;
      else p.files[part.index].text = box.value;
      persist();
    };
    $("#tnsAddLua").onclick = () => {
      if (p.lua == null) p.lua = TNS_STARTER;
      p.sel = 0;
      render();
    };
    $("#tnsAddPy").onclick = () => {
      if (!p.files.some((f) => /\.py$/i.test(f.name))) {
        p.files.push({ name: "program.py", kind: "text", text: "from math import *\nprint(sqrt(2))\n" });
        if (!p.files.some((f) => f.name === "Problem1.xml")) {
          p.pyName = "program.py";
          p.lua = null; // a document runs either a Lua script or a Python script
        }
      }
      p.sel = tnsParts(p).findIndex((x) => !x.lua && /\.py$/i.test(p.files[x.index].name));
      render();
    };
    $("#tnsSave").onclick = async () => {
      try {
        const bytes = await TNS.write(tnsDoc(p));
        download(p.title.replace(/\.tns$/i, "") + ".tns", bytes);
        out.textContent = "Saved " + bytes.length + " bytes.";
      } catch (e) {
        out.textContent = "Could not save: " + e.message;
      }
    };
    show();
  }
  async function openTns(file) {
    const d = await TNS.read(new Uint8Array(await file.arrayBuffer()));
    const p = tnsFromRead(file.name, d);
    doc.pages.push(p);
    doc.active = doc.pages.length - 1;
    render();
  }
  async function exportTnsViewer() {
    const d = TNS.newLuaDocument(TNS.luaFromCasDoc(doc));
    download((doc.name || "CAS OS") + ".tns", await TNS.write(d));
  }

  function addPage(k) {
    let t = types.find((x) => x[0] === k),
      p = { kind: k, title: t[1], rows: [{ input: "", output: "" }] };
    if (["notes", "geometry", "statistics", "spreadsheet"].includes(k)) p.text = "";
    if (k === "graph") p.formula = "sin(x)";
    if (k === "tutor") p = { kind: k, title: "AI Tutor", question: "", answer: "" };
    if (k === "python") p = { kind: k, title: "Python", code: 'print("Hello from CAS OS")', output: "" };
    if (k === "tns") p = { kind: k, title: "new.tns", version: "0500", files: [], lua: TNS_STARTER, sel: 0, status: "" };
    doc.pages.push(p);
    doc.active = doc.pages.length - 1;
    selected = 0;
    render();
  }
  $("#pageTypes").innerHTML = types
    .map((t) => '<button data-kind="' + t[0] + '"><b>' + t[1] + "</b><small>" + t[2] + "</small></button>")
    .join("");
  document.querySelectorAll("[data-kind]").forEach(
    (b) =>
      (b.onclick = () => {
        addPage(b.dataset.kind);
        $("#picker").close();
      }),
  );
  $("#addPage").onclick = () => $("#picker").showModal();
  $("#deletePage").onclick = () => {
    if (doc.pages.length === 1) return alert("A document needs at least one page.");
    if (confirm("Delete this page?")) {
      doc.pages.splice(doc.active, 1);
      doc.active = Math.max(0, doc.active - 1);
      render();
    }
  };
  $("#clear").onclick = () => {
    if (page().kind === "calculator") {
      if (confirm("Clear all calculations on this page?")) {
        page().rows = [{ input: "", output: "" }];
        selected = 0;
        render();
      }
    } else if (confirm("Clear this page?")) {
      page().text = "";
      render();
    }
  };
  $("#docs").onclick = () => {
    $("#docName").value = doc.name;
    $("#documents").showModal();
  };
  $("#rename").onclick = () => {
    doc.name = $("#docName").value.trim() || "Untitled";
    persist();
  };
  $("#newDoc").onclick = () => {
    if (confirm("Start a new empty document?")) {
      doc = blank();
      selected = 0;
      render();
      $("#documents").close();
    }
  };
  $("#export").onclick = () => {
    let a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }));
    a.download = doc.name + ".casdoc";
    a.click();
  };
  $("#import").onchange = (e) => {
    let f = e.target.files[0],
      r = new FileReader();
    if (!f) return;
    r.onload = () => {
      try {
        doc = JSON.parse(r.result);
        if (!Array.isArray(doc.pages)) throw Error("No pages");
        doc.active = 0;
        doc.name = doc.name || "Imported document";
        render();
        $("#documents").close();
      } catch (x) {
        alert("Invalid CAS OS file: " + x.message);
      }
    };
    r.readAsText(f);
  };
  $("#importTns").onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      await openTns(f);
      $("#documents").close();
    } catch (err) {
      alert("Could not open that .tns file: " + err.message);
    }
  };
  $("#exportTns").onclick = async () => {
    try {
      await exportTnsViewer();
    } catch (err) {
      alert("Could not make the .tns file: " + err.message);
    }
  };
  document.querySelectorAll(".close").forEach((x) => (x.onclick = () => x.closest("dialog").close()));
  document.querySelectorAll("[data-insert]").forEach((x) => (x.onclick = () => insert(x.dataset.insert)));
  document.querySelectorAll("[data-action]").forEach(
    (x) =>
      (x.onclick = () => {
        let a = x.dataset.action;
        if (a === "docs") $("#docs").click();
        else if (a === "menu") $("#commands").showModal();
        else if (a === "clear") $("#clear").click();
        else if (a === "del") insert("del");
        else if (a === "enter") {
          let x = activeInput();
          if (x) evaluate(+x.dataset.row);
        }
      }),
  );
  $("#commandTypes").innerHTML = commands
    .map((c) => '<button data-command="' + c[1] + '">' + c[0] + "</button>")
    .join("");
  document.querySelectorAll("[data-command]").forEach(
    (x) =>
      (x.onclick = () => {
        let v = x.dataset.command;
        $("#commands").close();
        if (v === "@ai") {
          let t = doc.pages.findIndex((p) => p.kind === "tutor");
          if (t < 0) addPage("tutor");
          else {
            doc.active = t;
            render();
          }
        } else insert(v);
      }),
  );
  render();
})();
