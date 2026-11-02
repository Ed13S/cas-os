// CalcLink (our wrapper) against nspirelink's simulated CX and CX II. This checks our logic and the
// real TNS bytes we generate; it cannot prove the USB protocol on real hardware.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { SimNspire } from "./vendor/sim-calculator.mjs";
const require = createRequire(import.meta.url);
const CalcLink = require("../calc-link.js");
const TNS = require("../tns.js");

const load = () => import("../vendor/nspirelink/nspirelink.mjs");
const make = (simOpts = {}) => {
  const sim = new SimNspire({ chatty: false, ...simOpts });
  return { sim, link: CalcLink.create({ load, device: sim, linkOptions: { timeout: 500, addressWait: 200 } }) };
};

test("safeName", () => {
  assert.equal(CalcLink.safeName("My Notes: wk 2/3?"), "My Notes_ wk 2_3_.tns");
  assert.equal(CalcLink.safeName("x.tns"), "x.tns");
  assert.equal(CalcLink.safeName(""), "Document.tns");
  assert.ok(CalcLink.safeName("a".repeat(100)).length <= 44);
  assert.equal(CalcLink.safeName("prog.py", ".py"), "prog.py");
});

for (const [model, product] of [["CX", "cx"], ["CX II", "cx2"]]) {
  test(`connect, send, refuse to overwrite, overwrite (${model})`, async () => {
    const { sim, link } = make({ model: product });
    assert.ok(link.supported());
    const info = await link.connect();
    assert.ok(info && (info.model || info.name), JSON.stringify(info));
    assert.ok(link.connected);
    const doc = await TNS.write(TNS.newLuaDocument(TNS.luaViewer({ mode: "notes", title: "T", items: [{ a: "A", b: "x" }] })));
    const seen = [];
    const path = await link.send("My Notes.tns", doc, { onProgress: (s, t) => seen.push([s, t]) });
    assert.equal(path, "/My Notes.tns");
    assert.deepEqual(seen.at(-1), [doc.length, doc.length]);
    assert.deepEqual(Buffer.from(sim.files.get(path).bytes), Buffer.from(doc));
    // what arrived is a valid document that opens again
    const back = await TNS.read(sim.files.get(path).bytes);
    assert.ok(TNS.luaFromDocument(back).source.includes("function on.paint"));
    await assert.rejects(link.send("My Notes.tns", doc), (e) => e.code === "EXISTS");
    await link.send("My Notes.tns", new Uint8Array([1, 2, 3]), { overwrite: true });
    assert.deepEqual([...sim.files.get(path).bytes], [1, 2, 3]);
    assert.deepEqual(sim.violations, []);
    await link.disconnect();
    assert.ok(!link.connected);
    await assert.rejects(link.send("x.tns", doc), (e) => e.code === "NOT_OPEN");
  });
}

test("a full calculator gives a friendly message", async () => {
  const { sim, link } = make({ model: "cx2" });
  await link.connect();
  sim.full = true;
  await assert.rejects(link.send("x.tns", new Uint8Array(10)), (e) => {
    assert.equal(e.code, "REFUSED");
    assert.match(CalcLink.friendlyError(e), /full|accept/);
    return true;
  });
});

test("no WebUSB is explained", async () => {
  const link = CalcLink.create({ load, usb: null });
  const old = globalThis.navigator;
  assert.equal(link.supported(), typeof old !== "undefined" && !!old.usb);
  if (!link.supported()) await assert.rejects(link.connect(), (e) => e.code === "NO_WEBUSB" && /Chrome or Edge/.test(CalcLink.friendlyError(e)));
});

test("every library error code has a message, unknown ones keep their text", () => {
  for (const c of ["NO_DEVICE_SELECTED", "OPEN_FAILED", "TIMEOUT", "DISCONNECTED", "REFUSED", "TOO_LARGE", "BAD_PATH", "BUSY"]) assert.ok(CalcLink.friendlyError({ code: c, message: "m" }).length > 20, c);
  assert.match(CalcLink.friendlyError({ code: "WEIRD", message: "boom" }), /boom/);
});

test("folders: make nested folders, send into them, list, send a whole tree", async () => {
  const { sim, link } = make({ model: "cx2" });
  await link.connect();
  assert.equal(await link.mkdir("/Maths/Week 1"), "/Maths/Week 1");
  assert.equal(await link.mkdir("/Maths/Week 1"), "/Maths/Week 1"); // already there is fine
  assert.ok(sim.dirs.has("/Maths") && sim.dirs.has("/Maths/Week 1"));
  const p = await link.sendTo("/Maths/Week 1", "Index laws.tns", new Uint8Array([1, 2, 3]));
  assert.equal(p, "/Maths/Week 1/Index laws.tns");
  assert.deepEqual([...sim.files.get(p).bytes], [1, 2, 3]);
  await assert.rejects(link.sendTo("/Maths/Week 1", "Index laws.tns", new Uint8Array(1)), (e) => e.code === "EXISTS");
  const top = await link.list("/");
  assert.ok(top.find((x) => x.name === "Maths" && x.dir));
  assert.deepEqual((await link.list("/Maths/Week 1")).map((x) => x.name), ["Index laws.tns"]);
  // a file cannot be used as a folder
  await link.sendTo("/", "Plain.tns", new Uint8Array(2));
  await assert.rejects(link.mkdir("/Plain.tns/inside"), (e) => e.code === "EXISTS");

  const events = [];
  const res = await link.sendTree(
    [
      { path: "Physics/Kin/kinematics.tns", bytes: new Uint8Array([9]) },
      { path: "Physics/Kin/kinematics.tns", bytes: new Uint8Array([8]) }, // duplicate: skipped
      { path: "Physics/units.tns", bytes: new Uint8Array([7, 7]) },
      { path: "readme.txt", bytes: new Uint8Array([1]) },
      { path: "bad:name?.tns", bytes: new Uint8Array([5]) },
    ],
    "/Class",
    { onItem: (i, n, path, state) => events.push(state + " " + path) }
  );
  assert.deepEqual(res.sent, ["/Class/Physics/Kin/kinematics.tns", "/Class/Physics/units.tns", "/Class/readme.txt", "/Class/bad_name_.tns"]);
  assert.deepEqual(res.skipped, ["/Class/Physics/Kin/kinematics.tns"]);
  assert.deepEqual(res.failed, []);
  assert.deepEqual([...sim.files.get("/Class/Physics/Kin/kinematics.tns").bytes], [9]);
  assert.ok(events.includes("skipped /Class/Physics/Kin/kinematics.tns"));
  // overwrite function decides per file
  const again = await link.sendTree([{ path: "Physics/units.tns", bytes: new Uint8Array([4]) }], "/Class", { overwrite: async (p) => p.endsWith("units.tns") });
  assert.deepEqual(again.sent, ["/Class/Physics/units.tns"]);
  assert.deepEqual(sim.violations, []);
});

test("a calculator that fills up reports failed files but keeps going", async () => {
  const { sim, link } = make({ model: "cx2" });
  await link.connect();
  sim.full = true;
  const res = await link.sendTree([{ path: "a.tns", bytes: new Uint8Array(3) }, { path: "b.tns", bytes: new Uint8Array(3) }], "/");
  assert.equal(res.failed.length, 2);
  assert.equal(res.failed[0].error.code, "REFUSED");
});
