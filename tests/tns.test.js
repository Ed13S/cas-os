// Checks the .tns reader/writer against files produced by Luna, the open-source
// builder whose output real TI-Nspire calculators accept (see tns.js).
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const TNS = require("../tns.js");

// Use Node's zlib so deflate output is byte-identical to Luna's (which uses zlib too).
TNS.setCodec({
  deflateRaw: async (u8) => new Uint8Array(zlib.deflateRawSync(u8)),
  inflateRaw: async (u8) => new Uint8Array(zlib.inflateRawSync(u8)),
});
const fx = (n) => fs.readFileSync(path.join(__dirname, "fixtures", n));
const same = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;

// Node's bundled zlib compresses slightly differently from the system zlib Luna links
// against, so the deflated payload bytes can differ while both are valid. Everything
// else (headers, magic numbers, field layout) must match exactly, so blank out the
// checksum / size / payload fields and compare the rest byte for byte.
function layout(buf) {
  const hex = (b) => Buffer.from(b).toString("hex");
  const parts = [];
  let p = 0;
  for (;;) {
    let magic = 4;
    if (buf.subarray(p, p + 6).toString("latin1") === "*TIMLP") magic = 10;
    else if (!(buf[p] === 0x50 && buf[p + 1] === 0x4b && buf[p + 2] === 3 && buf[p + 3] === 4)) break;
    const h = p + magic;
    const csize = buf.readUInt32LE(h + 14),
      nlen = buf.readUInt16LE(h + 22);
    parts.push("L", hex(buf.subarray(p, h + 10)), "<crc,sizes>", hex(buf.subarray(h + 26 - 4, h + 26 + nlen)), method13(buf, h) ? "<encrypted>" : "<deflated>");
    p = h + 26 + nlen + csize;
  }
  while (buf[p] === 0x50 && buf[p + 1] === 0x4b && buf[p + 2] === 1 && buf[p + 3] === 2) {
    const nlen = buf.readUInt16LE(p + 28);
    parts.push("C", hex(buf.subarray(p, p + 16)), "<crc,sizes>", hex(buf.subarray(p + 28, p + 42)), "<offset>", hex(buf.subarray(p + 46, p + 46 + nlen)));
    p += 46 + nlen;
  }
  parts.push("E", hex(buf.subarray(p, p + 12)), "<cdsize,offset>", hex(buf.subarray(p + 20)));
  return parts.join(" ");
}
const method13 = (buf, h) => buf.readUInt16LE(h + 4) === 13;

test("Lua document has exactly the layout Luna writes, and reads back to the same script", async () => {
  const mine = Buffer.from(await TNS.write(TNS.newLuaDocument(fx("hello.lua").toString("utf8"))));
  assert.equal(layout(mine), layout(fx("hello.tns")));
  assert.equal(TNS.luaFromDocument(await TNS.read(new Uint8Array(mine))).source, fx("hello.lua").toString("utf8"));
});

test("XML problem has exactly the layout Luna writes", async () => {
  const doc = { version: "0500", files: [{ name: "Problem1.xml", kind: "xml", text: fx("Problem1.xml").toString("utf8"), mode: "full" }] };
  assert.equal(layout(Buffer.from(await TNS.write(doc))), layout(fx("problem.tns")));
});

test("the XML bytes we produce before encryption are identical to Luna's", async () => {
  // Luna's file, decrypted+inflated by our reader, must re-encode to the same bytes.
  const doc = await TNS.read(new Uint8Array(fx("problem.tns")));
  const again = TNS.encodeXml(fx("Problem1.xml").toString("utf8"), "full");
  const viaFile = TNS.encodeXml(doc.files[1].text, doc.files[1].mode, doc.files[1].header);
  assert.ok(same(again, viaFile));
});

test("reading a Luna file gives back the XML, with unicode intact", async () => {
  const doc = await TNS.read(new Uint8Array(fx("problem.tns")));
  assert.equal(doc.version, "0500");
  assert.deepEqual(doc.files.map((f) => f.name), ["Document.xml", "Problem1.xml"]);
  assert.equal(doc.files[0].kind, "opaque"); // TI's stock Document.xml: kept, not editable
  const p = doc.files[1];
  assert.equal(p.kind, "xml");
  assert.match(p.text, /pbname="Café"/);
  assert.match(p.text, /x² ≠ 日本 😀/);
  assert.match(p.text, /<\/np:fmtxt><\/wdgt>/);
});

test("read -> write -> read with no edits changes nothing", async () => {
  for (const n of ["hello.tns", "problem.tns"]) {
    const first = await TNS.read(new Uint8Array(fx(n)));
    const second = await TNS.read(await TNS.write(first));
    assert.deepEqual(second.files.map((f) => [f.name, f.kind, f.text]), first.files.map((f) => [f.name, f.kind, f.text]), n);
    assert.ok(same(second.files[0].data, first.files[0].data), "Document.xml is preserved byte for byte");
  }
});

test("Lua script can be extracted, edited and saved again", async () => {
  const doc = await TNS.read(new Uint8Array(fx("hello.tns")));
  const found = TNS.luaFromDocument(doc);
  assert.ok(found);
  assert.equal(found.source, fx("hello.lua").toString("utf8").replace(/\r\n/g, "\n"));
  const edited = TNS.replaceLua(doc, found.source.replace("Hello", "Bonjour"));
  const reread = await TNS.read(await TNS.write(edited));
  assert.match(TNS.luaFromDocument(reread).source, /Bonjour é → ü/);
  assert.equal(reread.files[0].name, "Document.xml");
});

test("editing XML text and saving works; new text can contain unicode", async () => {
  const doc = await TNS.read(new Uint8Array(fx("problem.tns")));
  doc.files[1].text = doc.files[1].text.replace("日本", "Ωmega");
  const again = await TNS.read(await TNS.write(doc));
  assert.match(again.files[1].text, /Ωmega/);
  assert.doesNotMatch(again.files[1].text, /日本/);
});

test("self-closing tags are accepted and expanded", async () => {
  const xml = '<prob xmlns="urn:TI.Problem" ver="1.0" pbname=""><sym/><card clay="0"><flag>0</flag></card></prob>';
  const out = await TNS.read(await TNS.write({ files: [{ name: "Problem1.xml", kind: "xml", text: xml }] }));
  assert.match(out.files[1].text, /<sym><\/sym>/);
});

test("bad input gives readable errors", async () => {
  await assert.rejects(TNS.read(new Uint8Array([1, 2, 3, 4, 5])), /does not look like a \.tns/);
  await assert.rejects(TNS.write({ files: [{ name: "Problem1.xml", kind: "xml", text: "<hello>" }] }), /not a TI-Nspire problem/);
  await assert.rejects(TNS.write({ files: [{ name: "Problem1.xml", kind: "xml", text: "<prob><sym></prob>" }] }), /./);
});

test("binary files (e.g. images) survive a round trip", async () => {
  const bmp = new Uint8Array(200).map((_, i) => (i * 7) % 256);
  const bytes = await TNS.write({ files: [{ name: "pic.bmp", kind: "binary", data: bmp }, { name: "Problem1.xml", kind: "xml", text: fx("Problem1.xml").toString("utf8") }] });
  const back = await TNS.read(bytes);
  assert.ok(same(back.files.find((f) => f.name === "pic.bmp").data, bmp));
});

test("CAS OS document -> Lua viewer", () => {
  const lua = TNS.luaFromCasDoc({ name: "Demo", pages: [{ kind: "calculator", title: "Calculate", rows: [{ input: 'solve(x^2=4)', output: "x = -2 or x = 2" }, { input: "", output: "" }] }, { kind: "notes", title: "Notes", text: 'a "quoted" line\nsecond' }] });
  assert.match(lua, /solve\(x\^2=4\)   =>   x = -2 or x = 2/);
  assert.match(lua, /a \\"quoted\\" line/);
  assert.match(lua, /function on\.paint\(gc\)/);
});
