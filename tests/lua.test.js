// Runs the generated Lua in a real Lua interpreter (fengari) against a mock of the
// TI-Nspire API, so layout bugs (text off the bottom, text wider than the screen,
// page keys not working) are caught here instead of on a calculator.
const test = require("node:test");
const assert = require("node:assert");
const { lua, lauxlib, lualib, to_luastring } = require("fengari");
const TNS = require("../tns.js");

const PRELUDE = `
on = {}
local W, H = 320, 240
local cur = { size = 9 }
local calls
gcmock = {
  setFont = function(self, name, style, size) cur.size = size; cur.style = style end,
  setColorRGB = function() end,
  fillRect = function() end,
  getStringWidth = function(self, s) return #s * cur.size * 0.6 end,
  drawString = function(self, s, x, y, pos) calls[#calls + 1] = { s = s, x = x, y = y, size = cur.size, w = #s * cur.size * 0.6 } end,
}
platform = { window = {
  width = function() return W end, height = function() return H end,
  invalidate = function() end } }
local function paint() calls = {}; on.paint(gcmock); return calls end
local function key(name) if on[name] then on[name]() end end
`;

function run(generated, driver) {
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  const code = PRELUDE + generated + "\n" + driver;
  if (lauxlib.luaL_dostring(L, to_luastring(code)) !== lua.LUA_OK) throw new Error(lua.lua_tojsstring(L, -1) + "\n--- in:\n" + generated.slice(0, 400));
  return lua.lua_tojsstring(L, -1);
}

// Dump every screen after pressing "next" until we are back at the start.
const WALK = `
local out = {}
local first = nil
for n = 1, 200 do
  local c = paint()
  local sig = {}
  for _, d in ipairs(c) do sig[#sig + 1] = string.format("%d|%d|%d|%d|%s", d.y, d.x, d.size, math.floor(d.w), d.s) end
  local s = table.concat(sig, "\\n")
  if first == nil then first = s elseif s == first then break end
  out[#out + 1] = "SCREEN\\n" .. s
  key("arrowRight")
end
return table.concat(out, "\\n")
`;

function screens(text) {
  return text.split("SCREEN\n").filter(Boolean).map((b) => b.trim().split("\n").filter(Boolean).map((l) => {
    const [y, x, size, w, ...s] = l.split("|");
    return { y: +y, x: +x, size: +size, w: +w, s: s.join("|") };
  }));
}

const long = Array.from({ length: 40 }, (_, i) => "Line " + (i + 1) + ": a^m * a^n = a^(m+n) and a really long sentence that must wrap onto more than one row of the screen").join("\n");

test("notes viewer: every drawn string is on screen and inside the width", () => {
  const lua = TNS.luaViewer({ mode: "notes", title: "Maths", items: [{ a: "SHORT", b: "# Heading\none\ntwo" }, { a: "LONG", b: long }, { a: "Odd \"quotes\" \\ chars", b: "x = \"y\"\n\\n not a newline" }] });
  const sc = screens(run(lua, WALK));
  assert.ok(sc.length > 3, "long page continues over several screens, got " + sc.length);
  for (const [i, s] of sc.entries())
    for (const d of s) {
      assert.ok(d.y >= 0 && d.y + d.size + 4 <= 240, `screen ${i}: "${d.s}" at y=${d.y} is off the bottom`);
      assert.ok(d.x + d.w <= 320, `screen ${i}: "${d.s}" is ${d.w}px wide`);
    }
  // body text never overlaps the footer line (the footer is the last string drawn on each screen)
  for (const s of sc) {
    const footer = s[s.length - 1];
    for (const d of s.slice(0, -1)) assert.ok(d.y + 14 <= footer.y + 1, `"${d.s}" overlaps the footer`);
    assert.match(footer.s, /change page/);
  }
});

test("notes viewer: arrow keys move through pages and wrap around", () => {
  const lua = TNS.luaViewer({ mode: "notes", title: "T", items: [{ a: "ONE", b: "a" }, { a: "TWO", b: "b" }, { a: "THREE", b: "c" }] });
  const out = run(lua, `
    local titles = {}
    local function title() local c = paint(); return c[1].s end
    titles[#titles+1] = title()
    key("arrowRight"); titles[#titles+1] = title()
    key("arrowRight"); titles[#titles+1] = title()
    key("arrowRight"); titles[#titles+1] = title()   -- wraps to ONE
    key("arrowLeft");  titles[#titles+1] = title()   -- back to THREE
    key("enterKey");   titles[#titles+1] = title()   -- ONE
    key("arrowDown");  titles[#titles+1] = title()   -- TWO
    key("arrowUp");    titles[#titles+1] = title()   -- ONE
    key("escapeKey");  titles[#titles+1] = title()
    return table.concat(titles, ",")`);
  assert.equal(out, "ONE,TWO,THREE,ONE,THREE,ONE,TWO,ONE,ONE");
});

test("notes viewer: re-lays out when the screen size changes", () => {
  const lua = TNS.luaViewer({ mode: "notes", title: "T", items: [{ a: "P", b: long }] });
  const out = run(lua, `
    local a = #paint()
    W = 160; key("resize")
    local b = #paint()
    return a .. "," .. b`);
  const [a, b] = out.split(",").map(Number);
  assert.ok(a > 0 && b > 0);
});

test("flashcards: question, reveal answer, next card", () => {
  const lua = TNS.luaViewer({ mode: "cards", title: "Logs", items: [{ a: "log_b(1) = ?", b: "0" }, { a: "log_b(b) = ?", b: "1" }] });
  const out = run(lua, `
    local function texts() local t = {} for _, d in ipairs(paint()) do t[#t+1] = d.s end return table.concat(t, "/") end
    local r = {}
    r[#r+1] = texts()
    key("enterKey"); r[#r+1] = texts()
    key("arrowRight"); r[#r+1] = texts()
    key("arrowRight"); r[#r+1] = texts()
    return table.concat(r, " ## ")`);
  const [q1, a1, q2, back] = out.split(" ## ");
  assert.match(q1, /log_b\(1\) = \?.*show answer/);
  assert.doesNotMatch(q1, /\/0\//);
  assert.match(a1, /log_b\(1\) = \?\/0\/.*hide answer/);
  assert.match(q2, /log_b\(b\) = \?.*show answer/);
  assert.equal(back.slice(0, 9), q1.slice(0, 9));
});

test("light theme and empty input", () => {
  assert.match(TNS.luaViewer({ mode: "notes", title: "T", theme: "light", items: [{ a: "A", b: "b" }] }), /bg = \{255, 255, 255\}/);
  assert.throws(() => TNS.luaViewer({ mode: "notes", items: [{ a: "", b: "  " }] }), /at least one page/);
});

test("a viewer becomes a valid .tns whose Lua can be read back", async () => {
  const zlib = require("node:zlib");
  TNS.setCodec({ deflateRaw: async (u) => new Uint8Array(zlib.deflateRawSync(u)), inflateRaw: async (u) => new Uint8Array(zlib.inflateRawSync(u)) });
  const src = TNS.luaViewer({ mode: "notes", title: "T", items: [{ a: "A", b: "naïve café ]]> ok" }] });
  const doc = await TNS.read(await TNS.write(TNS.newLuaDocument(src)));
  assert.equal(TNS.luaFromDocument(doc).source, src);
});

test("the template files shipped for the Gemini Gem run and fit the screen", () => {
  const fs = require("node:fs"), path = require("node:path");
  for (const f of ["template-notes.lua", "template-flashcards.lua"]) {
    const src = fs.readFileSync(path.join(__dirname, "..", "docs", "gemini-gem", f), "utf8");
    const sc = screens(run(src, WALK));
    assert.ok(sc.length >= 2, f);
    for (const s of sc) for (const d of s) assert.ok(d.y + d.size + 4 <= 240 && d.x + d.w <= 320, f + ": " + d.s);
  }
});
