/* "Calculator (USB)" dialog: connect, browse folders, make folders, send files/folders, install UDFs. */
(function () {
  const TNS = typeof window !== "undefined" ? window.TNS : require("./tns.js");
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let link = null, folder = "/", busy = false;

  // Lua program that defines every UDF when it runs (experimental: relies on math.eval).
  function udfInstallerLua(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^Define\s/i.test(l));
    const lit = (s) => "[==[" + s + "]==]";
    return (
      "local L = {\n" + lines.map((l) => "  " + lit(l) + ",").join("\n") + "\n}\n" +
      "local msg, bad = 'Press any key to install ' .. #L .. ' functions', {}\n" +
      "function on.paint(gc)\n gc:setFont('sansserif','r',11)\n gc:drawString('UDF installer', 5, 5, 'top')\n" +
      " gc:drawString(msg, 5, 30, 'top')\n for i = 1, math.min(#bad, 6) do gc:drawString(bad[i], 5, 50 + i * 16, 'top') end\nend\n" +
      "local function run()\n bad = {}\n local ok = 0\n for i = 1, #L do\n  local r = pcall(function() return math.eval(L[i]) end)\n" +
      "  if r then ok = ok + 1 else bad[#bad + 1] = L[i]:sub(1, 36) end\n end\n" +
      " msg = ok .. ' of ' .. #L .. ' installed. Open a Calculator page.'\n platform.window:invalidate()\nend\n" +
      "function on.charIn() run() end\nfunction on.enterKey() run() end\nfunction on.mouseDown() run() end\n"
    );
  }
  const defineLines = (t) => t.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^Define\s/i.test(l));
  /** "Define f(x)=..." -> "Define LibPub f(x)=..." (for a document saved in MyLib). */
  function libPubText(text) {
    return defineLines(text).map((l) => l.replace(/^Define\s+(?:LibPub\s+|LibPriv\s+)?/i, "Define LibPub ")).join("\n");
  }
  /** Every Define line typed on the Calculator pages of a CAS OS document. */
  function docDefines(doc) {
    const out = [];
    for (const p of (doc && doc.pages) || []) if (p.kind === "calculator") for (const r of p.rows || []) if (r.input && /^\s*Define\s/i.test(r.input)) out.push(r.input.trim());
    return out.join("\n");
  }
  /** One document: the how-to pages, and pressing "i" installs every UDF (experimental). */
  function guideLua(guideText, udfs) {
    const start = "=== START HERE ===\n-- Install --\nPress i to define all the\nUDFs in this document.\n-- Then --\nAdd a Calculator page (Ctrl+I)\nand type e.g. disc(1,-5,6).\n-- Pages --\nUse the arrow keys to read how\neach function works.\n\n";
    const got = TNS.localFormat(start + guideText, { symbols: false });
    const view = TNS.luaViewer({ mode: "notes", title: "UDF Guide", theme: "dark", items: got.items });
    const inst = udfInstallerLua(udfs).replace(/function on\.paint[\s\S]*?\nend\n(?=local function run)/, "").replace("local msg, bad = 'Press any key to install ' .. #L .. ' functions', {}", "local msg, bad = '', {}");
    return view + "\n" + inst.replace(/function on\.charIn\(\) run\(\) end\nfunction on\.enterKey\(\) run\(\) end\nfunction on\.mouseDown\(\) run\(\) end\n/, "") +
      "local viewPaint = on.paint\nfunction on.paint(gc)\n viewPaint(gc)\n if msg ~= '' then gc:setFont('sansserif','b',9) gc:setColorRGB(255,220,120) gc:drawString(msg, 4, platform.window:height() - 2, 'bottom') for i = 1, math.min(#bad, 3) do gc:drawString(bad[i], 4, 20 + i * 14, 'top') end end\nend\n" +
      "function on.charIn(c) if c == 'i' or c == 'I' then run() end end\n";
  }
  /** Notes app (pages of how-to) from docs/udfs/guide.txt. */
  async function guideBytes() {
    const r = await fetch("docs/udfs/guide.txt");
    if (!r.ok) throw new Error("Could not load docs/udfs/guide.txt");
    return TNS.write(TNS.newLuaDocument(guideLua(await r.text(), await udfText())));
  }
  async function udfText() {
    const r = await fetch("docs/udfs/udfs.txt");
    if (!r.ok) throw new Error("Could not load docs/udfs/udfs.txt");
    return r.text();
  }
  function programEditorInstaller(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^Define\s/i.test(l));
    return "Define installudfs()=\nPrgm\n" + lines.map((l) => "  " + l).join("\n") + "\n  Disp \"UDFs installed\"\nEndPrgm";
  }

  function ensureDialog() {
    let d = $("#calcLink");
    if (d) return d;
    d = document.createElement("dialog");
    d.id = "calcLink";
    d.innerHTML =
      '<h2>Calculator (USB)</h2><p id="clStatus">Not connected.</p>' +
      '<div class="tnsbar"><button id="clConnect">Connect calculator</button><button id="clDisc" hidden>Disconnect</button></div>' +
      '<div id="clBrowse" hidden><div><b id="clPath">/</b> <button id="clUp">⬆ Up</button> <button id="clNew">＋ New folder</button></div>' +
      '<ul id="clList"></ul>' +
      '<div class="tnsbar"><label class="file">Send file(s)<input id="clFiles" type="file" multiple></label>' +
      '<label class="file">Send a folder<input id="clDir" type="file" webkitdirectory multiple></label>' +
      '<button id="clUdf">Install all UDFs (guide + installer)</button> <button id="clDl">Download it instead</button></div></div>' +
      '<output id="clOut"></output><details><summary>Help</summary><p>Chrome or Edge, calculator plugged in and on its home screen. ' +
      'On Windows an original CX needs the WinUSB driver (Zadig). On Linux you may need a udev rule. ' +
      'UDFs: the installer .tns defines every function when you open it and press a key; if that fails, use the Program Editor text (button below).</p>' +
      '<button id="clPE">Copy Program Editor installer text</button> <button id="clLib">Copy UDFs with LibPub (for MyLib)</button></details><button class="close">Close</button>';
    document.body.appendChild(d);
    d.querySelector(".close").onclick = () => d.close();
    return d;
  }
  const say = (t) => ($("#clOut").textContent = t);

  async function refresh() {
    const ul = $("#clList");
    try {
      const items = await link.list(folder);
      $("#clPath").textContent = folder;
      ul.innerHTML = items.length
        ? items.map((x) => "<li>" + (x.dir ? '<a href="#" data-d="' + esc(x.name) + '">📁 ' + esc(x.name) + "</a>" : "📄 " + esc(x.name)) + "</li>").join("")
        : "<li>(empty)</li>";
      ul.querySelectorAll("a").forEach((a) => (a.onclick = (e) => { e.preventDefault(); folder = (folder === "/" ? "" : folder) + "/" + a.dataset.d; refresh(); }));
    } catch (e) { say(CalcLink.friendlyError(e)); }
  }
  async function guard(fn) {
    if (busy) return;
    busy = true;
    try { await fn(); } catch (e) {
      say(CalcLink.friendlyError(e));
      if (link && !link.connected && $("#clBrowse") && !$("#clBrowse").hidden) {
        $("#clStatus").textContent = "Disconnected. Press Connect calculator to try again.";
        $("#clConnect").hidden = false; $("#clDisc").hidden = true; $("#clBrowse").hidden = true;
      }
    } finally { busy = false; }
  }
  async function sendMany(items) {
    const res = await link.sendTree(items, folder, {
      overwrite: async (p) => confirm(p + " is already on the calculator. Replace it?"),
      onItem: (i, n, p, s) => say(s + " (" + (i + 1) + "/" + n + ") " + p),
    });
    say("Sent " + res.sent.length + ", skipped " + res.skipped.length + ", failed " + res.failed.length + (res.failed[0] ? ". " + CalcLink.friendlyError(res.failed[0].error) : "."));
    refresh();
  }

  async function open() {
    const d = ensureDialog();
    if (!d.dataset.wired) {
      d.dataset.wired = "1";
      link = CalcLink.create({});
      if (!link.supported()) say("This browser can't talk to calculators over USB. Use Chrome or Edge, or download the file and send it with TI software.");
      $("#clConnect").onclick = () => guard(async () => {
        say("Connecting…");
        const info = await link.connect();
        $("#clStatus").textContent = "Connected: " + ((info && (info.name || info.model)) || "TI-Nspire");
        $("#clConnect").hidden = true; $("#clDisc").hidden = false; $("#clBrowse").hidden = false;
        say(""); folder = "/"; await refresh();
      });
      $("#clDisc").onclick = () => guard(async () => {
        await link.disconnect();
        $("#clStatus").textContent = "Not connected."; $("#clConnect").hidden = false; $("#clDisc").hidden = true; $("#clBrowse").hidden = true;
      });
      $("#clUp").onclick = () => { folder = folder.replace(/\/[^/]+$/, "") || "/"; refresh(); };
      $("#clNew").onclick = () => guard(async () => {
        const n = prompt("New folder name:");
        if (!n) return;
        await link.mkdir((folder === "/" ? "" : folder) + "/" + n); say("Made folder " + n + "."); await refresh();
      });
      $("#clFiles").onchange = (e) => guard(async () => {
        const items = [];
        for (const f of e.target.files) items.push({ path: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
        e.target.value = ""; await sendMany(items);
      });
      $("#clDir").onchange = (e) => guard(async () => {
        const items = [];
        for (const f of e.target.files) items.push({ path: f.webkitRelativePath || f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
        e.target.value = ""; await sendMany(items);
      });
      $("#clUdf").onclick = () => guard(async () => {
        await sendMany([{ path: "UDF Guide.tns", bytes: await guideBytes() }]);
        say("Sent UDF Guide.tns. Open it on the calculator and press i to install all the UDFs.");
      });
      $("#clDl").onclick = () => guard(async () => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([await guideBytes()])); a.download = "UDF Guide.tns"; a.click();
        say("Downloaded UDF Guide.tns.");
      });
      $("#clLib").onclick = async () => {
        try { await navigator.clipboard.writeText(libPubText(await udfText())); say("Copied. Paste into a Calculator page in TI-Nspire Student Software, save the document into MyLib, then Refresh Libraries on the calculator."); } catch (e) { say(e.message); }
      };
      $("#clPE").onclick = async () => {
        try { await navigator.clipboard.writeText(programEditorInstaller(await udfText())); say("Copied. In Program Editor make a new program, paste, run installudfs()."); } catch (e) { say(e.message); }
      };
    }
    d.showModal();
  }

  /** Called by Save buttons: send bytes under a name to the open dialog's current folder. */
  async function offer(name, bytes) {
    await open();
    if (link && link.connected) return sendMany([{ path: name, bytes }]);
    say("Connect your calculator, then press the Send button again.");
  }

  if (typeof document === "undefined") { module.exports = { guideLua, udfInstallerLua, programEditorInstaller, libPubText, docDefines }; return; }
  window.CalcUI = { open, offer, udfInstallerLua, programEditorInstaller, libPubText, docDefines };
  /** Build an installer .tns from the Define lines on this document's Calculator pages, then send or download it. */
  window.CalcUI.exportInstaller = async function (doc, download) {
    const t = docDefines(doc);
    if (!t) return alert("No Define lines found on this document's Calculator pages.");
    const bytes = await TNS.write(TNS.newLuaDocument(udfInstallerLua(t)));
    if (confirm("Send it to the calculator now? (Cancel downloads it instead.)")) await offer("Install " + (doc.name || "UDFs").replace(/[^\w\- ]+/g, "") + ".tns", bytes);
    else download((doc.name || "UDFs") + " installer.tns", bytes);
  };
  document.addEventListener("DOMContentLoaded", () => {
    const bar = $(".bar");
    if (!bar) return;
    const b = document.createElement("button");
    b.textContent = "⇄ Calculator";
    b.onclick = open;
    bar.insertBefore(b, $("#clear"));
  });
})();
