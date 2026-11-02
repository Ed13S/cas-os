// Builds one .tns per calculator Python program (docs/python-programs/*.py) into the folder given as argument.
//   node tools/make-python-tns.js out-dir
const fs = require("fs");
const path = require("path");
const TNS = require("../tns.js");
const src = path.join(__dirname, "..", "docs", "python-programs");
const out = process.argv[2] || path.join(__dirname, "..", "dist-tns");
fs.mkdirSync(out, { recursive: true });
(async () => {
  for (const f of fs.readdirSync(src).filter((x) => x.endsWith(".py"))) {
    const bytes = await TNS.write(TNS.newPythonDocument(f, fs.readFileSync(path.join(src, f), "utf8")));
    const back = await TNS.read(bytes);
    if (!back.files.some((x) => x.name === f && Buffer.from(x.data).toString("utf8") === fs.readFileSync(path.join(src, f), "utf8"))) throw new Error("round trip failed for " + f);
    fs.writeFileSync(path.join(out, f.replace(/\.py$/, ".tns")), bytes);
  }
  console.log("written to", out);
})();
