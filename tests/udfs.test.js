const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const math = require("mathjs");

const lines = fs.readFileSync(path.join(__dirname, "..", "docs", "udfs", "udfs.txt"), "utf8").split("\n").filter(Boolean);
const scope = {};
const names = [];
for (const l of lines) {
  assert.match(l, /^Define [A-Za-z_]\w*\([\w,]+\)=\S+$/, "bad Define line: " + l);
  const js = l.replace(/^Define /, "").replace(/√\(/g, "sqrt(").replace(/π/g, "pi").replace(/\bln\(/g, "log(").replace(/\bdisc\b/, "disc");
  math.evaluate(js, scope);
  names.push(/^Define (\w+)/.exec(l)[1]);
}
const f = (call) => math.evaluate(call, scope);
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), a + " vs " + b);

test("each UDF name is unique and not a built-in calculator name", () => {
  assert.equal(new Set(names).size, names.length);
  for (const n of names) assert.ok(!/^(sin|cos|tan|ln|log|exp|sqrt|abs|round|floor|min|max|mean|d|e|i|pi)$/.test(n), n);
});

test("UDFs give the right numbers", () => {
  near(f("disc(1,-5,6)"), 1);
  near(f("qroot1(1,-5,6)"), 3);
  near(f("qroot2(1,-5,6)"), 2);
  near(f("vertx(1,-5)"), 2.5);
  near(f("verty(1,-5,6)"), -0.25);
  near(f("zscore(130,100,15)"), 2);
  near(f("binsd(10,0.5)"), Math.sqrt(2.5));
  near(f("rsf(0.0123456,3)"), 0.0123);
  near(f("rsf(123456,2)"), 120000);
  near(f("vfin(3,2,4)"), 11);
  near(f("sdist(3,2,4)"), 28);
  near(f("vsol(3,2,28)"), 11);
  near(f("ke(2,3)"), 9);
  near(f("range_(20,45)"), 40.8163, 1e-5);
  near(f("maxh(20,45)"), 10.2041, 1e-5);
  near(f("tflight(20,45)"), 2.88615, 1e-5);
  near(f("rpar(100,100)"), 50);
  near(f("efield(2e-6,0.5)"), 7.192e4, 1e-3);
  near(f("gfield(5.97e24,6.371e6)"), 9.8, 5e-3);
  near(f("vdiv(12,1000,2000)"), 8);
  near(f("tau(10000,100e-6)"), 1);
  near(f("vcharge(5,10000,100e-6,1)"), 5 * (1 - Math.exp(-1)));
  near(f("tcharge(10000,100e-6,63.2)"), 1.0006, 1e-3);
  near(f("rled(5,2,0.02)"), 150);
  near(f("rbase(5,0.7,0.1,100,5)"), 860);
  near(f("darl(100,50)"), 5000);
  near(f("gearr(12,36)"), 3);
  near(f("pwrrot(10,60)"), 10 * 2 * Math.PI);
  near(f("ma(100,20)"), 5);
});
