// Regenerates docs/gemini-gem/*.lua from the tested engine in tns.js.
//   node tools/make-gem-files.js
const fs = require("fs");
const path = require("path");
const TNS = require("../tns.js");
const out = path.join(__dirname, "..", "docs", "gemini-gem");
fs.writeFileSync(path.join(out, "template-notes.lua"), TNS.luaViewer({
  mode: "notes", title: "Index laws and logs", theme: "dark",
  items: [
    { a: "INDEX LAWS", b: "# Multiply and divide\na^m * a^n = a^(m+n)\na^m / a^n = a^(m-n)\n\n# Powers\n(a^m)^n = a^(mn)\na^0 = 1\na^(-n) = 1/a^n" },
    { a: "LOG LAWS", b: "# Laws\nlog_b(MN) = log_b(M) + log_b(N)\nlog_b(M/N) = log_b(M) - log_b(N)\nlog_b(M^k) = k log_b(M)\n\nWARNING: log(M+N) is NOT log(M) + log(N)" },
  ],
}));
fs.writeFileSync(path.join(out, "template-flashcards.lua"), TNS.luaViewer({
  mode: "cards", title: "Logs quiz", theme: "dark",
  items: [
    { a: "log_b(1) = ?", b: "0" },
    { a: "log_b(b) = ?", b: "1" },
    { a: "What is log(M*N) as a sum?", b: "log(M) + log(N)" },
  ],
}));
console.log("written to", out);
