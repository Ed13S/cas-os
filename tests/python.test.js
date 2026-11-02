const test = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const dir = path.join(__dirname, "..", "docs", "python-programs");
function run(prog, inputs) {
  const r = spawnSync("python3", ["-I", path.join(__dirname, "pyrun.py"), prog, inputs.join("|")], { cwd: dir, encoding: "utf8" });
  assert.equal(r.status, 0, prog + " failed:\n" + r.stdout + r.stderr);
  return r.stdout;
}
const num = (out, re) => parseFloat(new RegExp(re).exec(out)[1]);

test("every program is MicroPython-friendly (no f-strings, walrus, math.comb/erf)", () => {
  const fs = require("fs");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".py"))) {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    const chk = spawnSync("python3", ["-I", "-c", "import ast,sys\nt=ast.parse(open(sys.argv[1]).read())\nsys.exit(1 if any(isinstance(n,ast.JoinedStr) for n in ast.walk(t)) else 0)", path.join(dir, f)]);
    assert.equal(chk.status, 0, f + " uses an f-string");
    assert.ok(!/:=/.test(src), f + " uses :=");
    assert.ok(!/math\.(comb|erf|prod|isqrt)|\bcomb\(|\berf\(/.test(src), f + " uses a function MicroPython may lack");
    assert.ok(!/^\s*(match|case)\s/m.test(src), f + " uses match");
  }
});

test("binomial", () => {
  assert.equal(num(run("binom.py", ["10", "0.3", "1", "3"]), "= ([\\d.]+)\\s*$"), 0.266828);
  assert.equal(num(run("binom.py", ["10", "0.3", "2", "3"]), "Answer = ([\\d.]+)"), 0.649611);
  assert.equal(num(run("binom.py", ["10", "0.5", "3", "8"]), "Answer = ([\\d.]+)"), 0.054688);
  assert.equal(num(run("binom.py", ["10", "0.5", "4", "4", "6"]), "Answer = ([\\d.]+)"), 0.65625);
});

test("normal", () => {
  assert.ok(Math.abs(num(run("normal.py", ["0", "1", "4", "0.975"]), "k = ([-\\d.]+)\\s*$") - 1.95996) < 2e-5);
  assert.equal(num(run("normal.py", ["0", "1", "1", "1.96"]), "= ([\\d.]+)\\s*$"), 0.975);
  assert.equal(num(run("normal.py", ["100", "15", "2", "130"]), "= ([\\d.]+)\\s*$"), 0.02275);
  assert.equal(num(run("normal.py", ["0", "1", "3", "-8", "8"]), "= ([\\d.]+)\\s*$"), 1);
});

test("calculus checks", () => {
  const d = run("deriv.py", ["x**3", "2"]);
  assert.match(d, /gradient m ~ 12\b/);
  assert.match(d, /y = 12(\.0)?x \+ -16/);
  assert.match(run("limit.py", ["sin(x)/x", "0"]), /Limit ~ 1\b/);
  assert.match(run("limit.py", ["1/x", "0"]), /does not exist/);
  assert.match(run("limit.py", ["1/x**2", "0"]), /\+inf/);
  assert.match(run("limit.py", ["(x**2-1)/(x-1)", "1"]), /Limit ~ 2\b/);
});

test("quadratic and cubic helper", () => {
  const q = run("poly.py", ["1", "1", "-5", "6"]);
  assert.match(q, /= 1(\.0)?\n/);
  assert.match(q, /x = 2\.0 or 3\.0/);
  assert.match(q, /\(2\.5, -0\.25\) minimum/);
  assert.match(run("poly.py", ["1", "1", "2", "5"]), /no real x-intercepts/);
  assert.match(run("poly.py", ["1", "1", "4", "4"]), /one x-intercept/);
  const c = run("poly.py", ["2", "1", "-6", "11", "-6"]);
  for (const r of ["x = 1.0", "x = 2.0", "x = 3.0"]) assert.ok(c.includes(r), r + "\n" + c);
  assert.match(c, /two turning points/);
});

test("kinematics recovers all unknowns from every set of three knowns", () => {
  // u=3, a=2, t=4  ->  v=11, s=28
  const all = { u: 3, v: 11, a: 2, s: 28, t: 4 };
  const names = ["u", "v", "a", "s", "t"];
  const combos = [];
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) for (let k = j + 1; k < 5; k++) combos.push([names[i], names[j], names[k]]);
  assert.equal(combos.length, 10);
  for (const known of combos) {
    const out = run("kinematics.py", names.map((n) => (known.includes(n) ? String(all[n]) : "")));
    for (const n of names.filter((x) => !known.includes(x))) {
      const m = new RegExp("^" + n + " = (.+)$", "m").exec(out.split("Results:")[1] || "");
      assert.ok(m, `${known.join("")}: no ${n} in\n${out}`);
      const vals = m[1].split(" or ").map((x) => Math.abs(parseFloat(x))); // +/- roots are reported with one sign
      assert.ok(vals.some((x) => Math.abs(x - Math.abs(all[n])) < 1e-4), `${known.join("")}: ${n}=${m[1]}`);
    }
  }
});

test("projectile, circuits, units", () => {
  const p = run("projectile.py", ["20", "45", "0", "9.8"]);
  assert.ok(Math.abs(num(p, "Range = vx T = ([\\d.]+)") - 40.8163) < 1e-3);
  assert.ok(Math.abs(num(p, "= ([\\d.]+) m\\n") - 10.2041) < 1e-3);
  assert.ok(Math.abs(num(p, "T = ([\\d.]+) s") - 2.8868) < 1e-3);
  assert.match(p, /\[plot:show_plot\]/);
  assert.match(run("circuits.py", ["1", "10,22,47"]), /= 79(\.0)? ohm/);
  assert.match(run("circuits.py", ["2", "100,100"]), /R = 50(\.0)? ohm/);
  assert.ok(Math.abs(num(run("circuits.py", ["4", "5.97e24", "6.371e6", "0"]), "g = GM/r\\^2 = ([\\d.]+)") - 9.81) < 0.02);
  assert.match(run("units.py", ["2", "0.00450"]), /figures: 3/);
  assert.match(run("units.py", ["2", "1200"]), /figures: 2/);
  assert.match(run("units.py", ["2", "1.20e3"]), /figures: 3/);
  assert.match(run("units.py", ["1", "5", "km", "m"]), /= 5000(\.0)? m/);
  assert.match(run("units.py", ["1", "100", "C", "F"]), /= 212(\.0)? F/);
  assert.match(run("units.py", ["1", "5", "kg", "m"]), /do not match/);
  assert.match(run("units.py", ["3", "0.0123456", "3"]), /0\.0123/);
});

test("electrical, transistor, mechanical", () => {
  const o = run("electrical.py", ["1", "12", "", "4", ""]);
  assert.match(o, /I = 3(\.0)? A/);
  assert.match(o, /P = 36(\.0)? W/);
  assert.match(run("electrical.py", ["2", "12", "1000", "2000"]), /= 8(\.0)? V/);
  assert.match(run("electrical.py", ["3", "10000", "100e-6", "5", "63.2"]), /tau = RC = 1(\.0)? s/);
  const led = run("electrical.py", ["4", "5", "2", "0.02"]);
  assert.match(led, /= 150(\.0)? ohm/);
  assert.match(led, /Next E12 value up: 150(\.0)? ohm/);
  assert.match(run("electrical.py", ["4", "9", "2", "0.02"]), /Next E12 value up: 390(\.0)? ohm/);
  const sw = run("transistor.py", ["1", "5", "0.1", "100", "5", "n"]);
    assert.ok(Math.abs(num(sw, "= ([\\d.]+) ohm") - 860) < 1);
  assert.match(run("transistor.py", ["1", "5", "0.5", "100", "2", "y", "50"]), /= 5000/);
  assert.match(run("transistor.py", ["2", "10", "1000", "10000", "100"]), /SATURATED/);
  assert.match(run("transistor.py", ["2", "10", "1000", "100000", "100"]), /active region/);
  const g = run("mechanical.py", ["1", "2", "12,36", "10,30", "1800", "2", "100"]);
  assert.match(g, /Overall ratio = 9(\.0)?\b/);
  assert.match(g, /Output speed = in\/ratio = 200(\.0)? rpm/);
  assert.match(run("mechanical.py", ["2", "10", "", "1000"]), /n = [\d.]+ rpm/);
  assert.match(run("mechanical.py", ["3", "100", "20", "1", "0.2"]), /Efficiency = MA\/VR = 100(\.0)? %/);
});

test("logic simplifier", () => {
  const x = run("logic.py", ["A ^ B"]);
  assert.match(x, /Minterms: \[1, 2\]/);
  assert.match(x, /F = (A'B \+ AB'|AB' \+ A'B)/);
  const o = run("logic.py", ["(A and B) or (A and not B)"]);
  assert.match(o, /F = A\s*$/m);
  assert.match(run("logic.py", ["A or not A"]), /F = 1/);
  assert.match(run("logic.py", ["A and not A"]), /F = 0/);
  const m = run("logic.py", ["(A and B) or (not A and C) or (B and C)"]);
  assert.match(m, /F = (AB \+ A'C|A'C \+ AB)/); // consensus term BC is redundant
  const four = run("logic.py", ["(A and B) or (C and D)"]);
  assert.match(four, /F = (AB \+ CD|CD \+ AB)/);
});

test("PID and simulations", () => {
  const pid = run("pid.py", ["1", "2", "2", "1", "0", "1", "30"]);
  assert.ok(Math.abs(num(pid, "final y = ([\\d.-]+)") - 1) < 0.01, pid);
  const p = run("pid.py", ["1", "2", "2", "0", "0", "1", "30"]); // P only: error = 1/(1+Kp)
  assert.ok(Math.abs(num(p, "steady-state error = ([\\d.-]+)") - 1 / 3) < 0.01, p);
  const c1 = run("clt.py", ["1", "2000"]);
  assert.ok(Math.abs(num(c1, "final n=2000 mean=([\\d.]+)") - 3.5) < 0.25);
  const c2 = run("clt.py", ["2"]);
  assert.match(c2, /sigma\/sqrt\(n\)/);
});

test("quiz marks right answers and wrong ones", () => {
  const out = run("quiz.py", ["1", "3", "0", "0", "0"]);
  assert.match(out, /Score \d\/3/);
  assert.match(out, /Rule:/);
});

test("show-your-working helper", () => {
  const o = run("working.py", ["3", "0", "2", "10", "3"]);
  assert.match(o, /v = sqrt\(\(0\)\^2 \+ 2 \(2\) \(10\)\)/);
  assert.match(o, /v = 6\.32 m\/s/);
  assert.match(run("working.py", ["8", "12", "1000", "2000", "3"]), /Vout = \(12\) \(2000\)\/\(\(1000\)\+\(2000\)\)/);
  assert.match(run("working.py", ["14", "1", "-5", "6", "3"]), /D = \(-5\)\^2 - 4 \(1\) \(6\)/);
});
