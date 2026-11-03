const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const { lua, lauxlib, lualib, to_luastring } = require("fengari");
const UI = require("../calc-ui.js");
const TNS = require("../tns.js");
const text = fs.readFileSync(__dirname + "/../docs/udfs/udfs.txt", "utf8");
const n = text.split(/\r?\n/).filter((l) => /^Define /.test(l)).length;

test("UDF installer Lua runs math.eval on every Define line", () => {
  const code = UI.udfInstallerLua(text);
  assert.equal(TNS.checkLua(code), null);
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  const prog = `on={} seen={} 
math.eval=function(s) seen[#seen+1]=s; if s:find("qroot1") then error("x") end return 1 end
platform={window={invalidate=function() end}}
${code}
on.charIn() 
return #seen .. "|" .. msg`;
  assert.equal(lauxlib.luaL_dostring(L, to_luastring(prog)), lua.LUA_OK, lua.lua_tojsstring(L, -1));
  assert.equal(lua.lua_tojsstring(L, -1), n + "|" + (n - 1) + " of " + n + " installed. Open a Calculator page.");
});

test("installer becomes a readable .tns and program text lists every Define", async () => {
  const bytes = await TNS.write(TNS.newLuaDocument(UI.udfInstallerLua(text)));
  const d = await TNS.read(bytes);
  assert.ok(d);
  const pe = UI.programEditorInstaller(text);
  assert.equal((pe.match(/Define /g) || []).length, n + 1);
});

test("LibPub text and Define lines from a document", () => {
  const lib = UI.libPubText("Define f(x)=x^2\nDefine LibPriv g(x)=x\nnoise");
  assert.equal(lib, "Define LibPub f(x)=x^2\nDefine LibPub g(x)=x");
  const doc = { pages: [{ kind: "calculator", rows: [{ input: "Define h(x)=2*x" }, { input: "2+2" }] }, { kind: "notes", text: "Define z(x)=1" }] };
  assert.equal(UI.docDefines(doc), "Define h(x)=2*x");
});

test("UDF guide becomes a notes app with one page per function", () => {
  const got = TNS.localFormat(fs.readFileSync(__dirname + "/../docs/udfs/guide.txt", "utf8"), { symbols: false });
  assert.ok(got.items.length >= n, got.items.length + " pages");
  const code = TNS.luaViewer({ mode: "notes", title: "UDF Guide", theme: "dark", items: got.items });
  assert.equal(TNS.checkLua(code), null);
  for (const it of got.items) assert.ok(it.b.split("\n").length <= 12, it.a);
  assert.ok(got.items.some((it) => /^DISC/.test(it.a) && /disc\(1,-5,6\)/.test(it.b)));
});
