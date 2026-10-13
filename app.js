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
      ["tnsnotes", "Calculator app: Notes", "Type revision notes, get a .tns for your TI-Nspire (no coding)"],
      ["tnscards", "Calculator app: Flashcards", "Question and answer cards for your TI-Nspire (no coding)"],
      ["tns", "TI-Nspire file (advanced)", "Open and edit .tns files, Lua and Python code"],
    ],
    MENU = [
      ["Actions", [["Clear history", "@clear"], ["Ask AI tutor", "@ai"]]],
      ["Number", [["Approximate to decimal", "approx("], ["Approximate to fraction", "approxFraction("], ["Factor", "factor("], ["Greatest common divisor", "gcd("], ["Least common multiple", "lcm("], ["Remainder", "remainder("], ["Factorial  !", "!"]]],
      ["Algebra", [["Solve", "solve("], ["Numerical solve", "nSolve("], ["Zeros", "zeros("], ["Factor", "factor("], ["Expand", "expand("], ["Simplify", "simplify("], ["Complete the square", "completeSquare("]]],
      ["Calculus", [["Derivative", "diff("], ["Integral", "integral("], ["Definite integral", "integral(f,x,a,b"], ["Limit", "limit("], ["Function minimum", "fMin("], ["Function maximum", "fMax("], ["Tangent line", "tangentLine("], ["Arc length", "arcLen("]]],
      ["Probability", [["Factorial  !", "!"], ["Permutations nPr", "nPr("], ["Combinations nCr", "nCr("], ["Random integer", "randInt("]]],
      ["Statistics", [["Mean", "mean({"], ["Median", "median({"], ["Standard deviation", "stdDev({"], ["Variance", "variance({"], ["Min", "min({"], ["Max", "max({"]]],
      ["Matrix & Vector", [["Determinant", "det("], ["Inverse", "inv("], ["Transpose", "transpose("]]],
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
    getKey = () => (window.CAS_CONFIG && window.CAS_CONFIG.openrouterKey) || "",
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
    else if (p.kind === "graph") v += GraphKit.html(p);
    else if (p.kind === "tutor")
      v +=
        '<section class="page"><h3>AI Tutor</h3><textarea id="question" placeholder="Ask a maths question">' +
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
    else if (p.kind === "tns" && p.builder) v += builderHtml(p);
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
    else if (p.kind === "graph")
      GraphKit.mount({ page: p, math, prepare: CASEngine.prepare, persist, $ });
    else if (p.kind === "tutor") {
      $("#ask").onclick = askTutor;
    } else if (p.kind === "tns") (p.builder ? wireBuilder(p) : wireTns(p));
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
      r.output = getKey() ? "Asking the AI tutor\u2026" : "That reads like a question. The AI key has not been set in config.js yet.";
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
  async function tutorRequest(q) {
    const key = getKey();
    if (!key) throw Error("No AI key is set. Put it in config.js.");
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
  // ---- no-code calculator apps (notes / flashcards) ------------------------------------
  function builderHtml(p) {
    const b = p.builder,
      cards = b.mode === "cards",
      sel = Math.min(b.sel || 0, b.items.length - 1),
      it = b.items[sel];
    const opt = (v, label) => '<option value="' + v + '"' + ((b.theme || "dark") === v ? " selected" : "") + ">" + label + "</option>";
    return (
      '<section class="page tns builder"><h3>' + (cards ? "Flashcards app" : "Notes app") + " <small>for your TI-Nspire - no coding needed</small></h3>" +
      '<label>App title <input id="bTitle" value="' + esc(b.title) + '"></label>' +
      '<label>Colours <select id="bTheme">' + opt("dark", "Dark") + opt("light", "Light (white)") + "</select></label>" +
      '<nav class="bnav">' + b.items.map((x, i) => '<button data-bi="' + i + '" class="' + (i === sel ? "on" : "") + '">' + (i + 1) + "</button>").join("") + '<button id="bAdd">+ ' + (cards ? "Card" : "Page") + "</button></nav>" +
      "<label>" + (cards ? "Question" : "Page title") + ' <input id="bA" value="' + esc(it.a) + '"></label>' +
      "<label>" + (cards ? "Answer" : "Text") + ' <textarea id="bB" placeholder="' + (cards ? "The answer" : "Type one line per line. Start a line with # to make a heading. Long lines wrap and long pages continue on the next screen automatically.") + '">' + esc(it.b) + "</textarea></label>" +
      '<div class="tnsbar"><button id="bPrev">Preview</button><button id="bDel">Delete this ' + (cards ? "card" : "page") + '</button><button id="bSave">Save as .tns</button><button id="bCode">Edit the code instead</button></div>' +
      '<canvas id="bPreview" width="320" height="240" hidden></canvas>' +
      '<div class="tnsbar" id="bPrevBar" hidden><button id="bPp">&#9664; Back</button><button id="bPn">Next &#9654;</button>' + (cards ? '<button id="bPe">Show / hide answer</button>' : "") + "</div>" +
      '<output id="tnsOut">' + esc(p.status || "") + "</output>" +
      "<small>Save it, then copy the .tns onto your calculator with the TI-Nspire software. On the calculator use the left/right arrow keys" + (cards ? " and Enter to show the answer." : " to change page.") + " This is an approximate preview.</small></section>"
    );
  }
  function previewScreens(b, ctx) {
    const maxw = 300,
      rowsPer = Math.floor((240 - 30 - 24) / 14);
    const font = (st) => (st === "b" ? "bold " : "") + "9px sans-serif";
    const wrapJs = (text, style, rows) => {
      ctx.font = font(style);
      if (text === "") return void rows.push({ t: "", s: style });
      let line = "";
      for (const word of text.split(/\s+/).filter(Boolean)) {
        const t = line ? line + " " + word : word;
        if (ctx.measureText(t).width <= maxw) line = t;
        else {
          if (line) rows.push({ t: line, s: style });
          line = word;
        }
      }
      if (line) rows.push({ t: line, s: style });
    };
    const items = b.items.filter((x) => (x.a || "").trim() || (x.b || "").trim());
    const out = [];
    if (b.mode === "cards") {
      for (const c of items) {
        const q = [],
          a = [];
        wrapJs(c.a.trim(), "b", q);
        wrapJs(c.b.trim(), "r", a);
        out.push({ title: b.title, rows: q, ans: a });
      }
      return out;
    }
    for (const pg of items) {
      const rows = [];
      for (const l of (pg.b || "").replace(/\r/g, "").split("\n")) l.startsWith("# ") ? wrapJs(l.slice(2), "b", rows) : wrapJs(l, "r", rows);
      const parts = Math.max(1, Math.ceil(rows.length / rowsPer));
      for (let k = 0; k < parts; k++) out.push({ title: pg.a.trim() + (parts > 1 ? " (" + (k + 1) + "/" + parts + ")" : ""), rows: rows.slice(k * rowsPer, (k + 1) * rowsPer) });
    }
    return out;
  }
  function wireBuilder(p) {
    const b = p.builder,
      out = $("#tnsOut"),
      cv = $("#bPreview"),
      ctx = cv.getContext("2d");
    b.sel = Math.min(b.sel || 0, b.items.length - 1);
    const pv = { i: 0, ans: false };
    const draw = () => {
      if (cv.hidden) return;
      const th = TNS.THEMES[b.theme] || TNS.THEMES.dark,
        col = (c) => "rgb(" + c.join(",") + ")",
        sc = previewScreens(b, ctx);
      ctx.fillStyle = col(th.bg);
      ctx.fillRect(0, 0, 320, 240);
      if (!sc.length) return;
      pv.i = ((pv.i % sc.length) + sc.length) % sc.length;
      const s = sc[pv.i];
      ctx.textBaseline = "top";
      ctx.fillStyle = col(th.head);
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(b.mode === "cards" ? b.title + "  " + (pv.i + 1) + "/" + sc.length : s.title, 10, 6);
      const rows = b.mode === "cards" && pv.ans ? s.rows.concat([{ t: "", s: "r" }], s.ans) : s.rows;
      rows.slice(0, 12).forEach((r, k) => {
        ctx.font = (r.s === "b" ? "bold " : "") + "9px sans-serif";
        ctx.fillStyle = col(r.s === "b" ? th.sub : th.body);
        ctx.fillText(r.t, 10, 30 + k * 14);
      });
      ctx.font = "9px sans-serif";
      ctx.fillStyle = col(th.hint);
      ctx.fillText(b.mode === "cards" ? "enter: show/hide answer    < > next card" : "< > change page    " + (pv.i + 1) + " of " + sc.length, 10, 222);
    };
    $("#bTitle").oninput = (e) => {
      b.title = e.target.value;
      persist();
      draw();
    };
    $("#bTheme").onchange = (e) => {
      b.theme = e.target.value;
      persist();
      draw();
    };
    const cur = () => b.items[b.sel];
    $("#bA").oninput = (e) => {
      cur().a = e.target.value;
      persist();
      draw();
    };
    $("#bB").oninput = (e) => {
      cur().b = e.target.value;
      persist();
      draw();
    };
    document.querySelectorAll("[data-bi]").forEach(
      (x) =>
        (x.onclick = () => {
          b.sel = +x.dataset.bi;
          render();
        }),
    );
    $("#bAdd").onclick = () => {
      b.items.push({ a: "", b: "" });
      b.sel = b.items.length - 1;
      render();
    };
    $("#bDel").onclick = () => {
      if (b.items.length === 1) return (out.textContent = "Keep at least one " + (b.mode === "cards" ? "card." : "page."));
      if (confirm("Delete this one?")) {
        b.items.splice(b.sel, 1);
        b.sel = Math.max(0, b.sel - 1);
        render();
      }
    };
    $("#bPrev").onclick = () => {
      cv.hidden = $("#bPrevBar").hidden = !cv.hidden;
      pv.i = b.sel;
      pv.ans = false;
      draw();
    };
    $("#bPp").onclick = () => {
      pv.i--;
      pv.ans = false;
      draw();
    };
    $("#bPn").onclick = () => {
      pv.i++;
      pv.ans = false;
      draw();
    };
    if ($("#bPe"))
      $("#bPe").onclick = () => {
        pv.ans = !pv.ans;
        draw();
      };
    $("#bSave").onclick = async () => {
      try {
        const bytes = await TNS.write(TNS.newLuaDocument(TNS.luaViewer(b)));
        download((b.title || "app").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") + ".tns", bytes);
        out.textContent = "Saved. Copy the .tns to your calculator.";
      } catch (e) {
        out.textContent = "Could not save: " + e.message;
      }
    };
    $("#bCode").onclick = () => {
      if (!confirm("Switch to the code view? You can then edit the Lua by hand, but the simple builder will no longer be used for this page.")) return;
      try {
        p.lua = TNS.luaViewer(b);
        p.builder = null;
        p.sel = 0;
        render();
      } catch (e) {
        out.textContent = e.message;
      }
    };
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
    if (k === "tnsnotes" || k === "tnscards")
      p = {
        kind: "tns",
        title: k === "tnsnotes" ? "Notes app" : "Flashcards app",
        version: "0500",
        files: [],
        lua: null,
        sel: 0,
        status: "",
        builder:
          k === "tnsnotes"
            ? { mode: "notes", title: "My notes", theme: "dark", sel: 0, items: [{ a: "INDEX LAWS", b: "# Multiply and divide\na^m * a^n = a^(m+n)\na^m / a^n = a^(m-n)\n\n# Powers\n(a^m)^n = a^(mn)\na^0 = 1" }] }
            : { mode: "cards", title: "My flashcards", theme: "dark", sel: 0, items: [{ a: "What is a^0 ?", b: "1 (for any a that is not 0)" }] },
      };
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
        else if (a === "menu") openMenu();
        else if (a === "clear") $("#clear").click();
        else if (a === "del") insert("del");
        else if (a === "enter") {
          let x = activeInput();
          if (x) evaluate(+x.dataset.row);
        }
      }),
  );
  // direction pad: up/down change row, left/right move the cursor, centre = enter.
  // On pages that are not a calculator, left/right switch page.
  document.querySelectorAll("[data-nav]").forEach(
    (b) =>
      (b.onclick = () => {
        const d = b.dataset.nav,
          p = page();
        if (p.kind !== "calculator") {
          const next = doc.active + (d === "right" ? 1 : d === "left" ? -1 : 0);
          if (next !== doc.active && next >= 0 && next < doc.pages.length) {
            doc.active = next;
            selected = 0;
            render();
          }
          return;
        }
        const x = activeInput();
        if (d === "up" || d === "down") {
          selected = Math.max(0, Math.min(p.rows.length - 1, selected + (d === "down" ? 1 : -1)));
          render();
          const row = document.querySelector('[data-row="' + selected + '"]');
          if (row) row.focus();
        } else if (x && (d === "left" || d === "right")) {
          const at = Math.max(0, Math.min(x.value.length, (x.selectionStart == null ? x.value.length : x.selectionStart) + (d === "right" ? 1 : -1)));
          x.focus();
          x.setSelectionRange(at, at);
        } else if (x && d === "center") evaluate(+x.dataset.row);
      }),
  );
  function showMenu(cat) {
    const box = $("#commandTypes");
    const items = cat === undefined ? MENU.map((m, n) => [(n + 1) + ": " + m[0], n]) : MENU[cat][1].map((m, n) => [m[0], m[1]]);
    box.innerHTML =
      (cat === undefined ? "" : '<button data-back="1">◀ Back</button>') +
      items.map((c, n) => '<button data-i="' + n + '">' + (cat === undefined ? c[0] : (n + 1) + ": " + c[0]) + "</button>").join("");
    box.querySelectorAll("[data-i]").forEach(
      (x) =>
        (x.onclick = () => {
          const n = +x.dataset.i;
          if (cat === undefined) return showMenu(n);
          const v = MENU[cat][1][n][1];
          $("#commands").close();
          if (v === "@ai") {
            let t = doc.pages.findIndex((p) => p.kind === "tutor");
            if (t < 0) addPage("tutor");
            else {
              doc.active = t;
              render();
            }
          } else if (v === "@clear") $("#clear").click();
          else insert(v);
        }),
    );
    const back = box.querySelector("[data-back]");
    if (back) back.onclick = () => showMenu();
  }
  $("#commands").addEventListener("show", () => showMenu());
  const openMenu = () => {
    showMenu();
    $("#commands").showModal();
  };
  window.__openMenu = openMenu;
  render();
})();
