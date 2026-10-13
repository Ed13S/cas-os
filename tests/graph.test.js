const test = require("node:test");
const assert = require("node:assert");
const math = require("mathjs");
const E = require("../engine.js");
const G = require("../graph.js");
const f = (t) => G.compile(t, math, E.prepare);

test("compile handles y=, missing bracket, logs", () => {
  assert.equal(f("y=x^2-4")(3), 5);
  assert.equal(f("sin(0")(0), 0);
  assert.equal(f("log_10(x)")(100), 2);
  assert.equal(f("ln(x)")(Math.E), 1);
  assert.ok(Number.isNaN(f("sqrt(x)")(-1)));
  assert.throws(() => f("x+*"));
  assert.throws(() => f("zz+x"));
});

test("zeros, intercepts, extrema, intersections", () => {
  const a = G.analyse([f("x^2-4"), f("x+2")], -10, 10, 800);
  assert.deepEqual(a.zeros.filter((z) => z.i === 0).map((z) => z.x), [-2, 2]);
  assert.deepEqual(a.yint.map((z) => z.y), [-4, 2]);
  assert.equal(a.extrema[0].type, "min");
  assert.ok(Math.abs(a.extrema[0].x) < 1e-3 && Math.abs(a.extrema[0].y + 4) < 1e-6);
  assert.deepEqual(a.inter.map((p) => p.x).sort((p, q) => p - q), [-2, 3]);
  // touching the axis counts as a zero, poles do not
  assert.deepEqual(G.analyse([f("x^2")], -5, 5, 800).zeros.map((z) => z.x), [0]);
  assert.equal(G.analyse([f("1/x")], -5, 5, 800).zeros.length, 0);
});

test("zoom, standard, auto", () => {
  const v = G.standardView(0.6);
  assert.equal(v.xmax, 10);
  const z = G.zoomView(v, 0.5);
  assert.equal(z.xmax, 5);
  assert.equal(z.ymax, 3);
  const auto = G.autoView([f("(x-30)*(x-40)")], 0.6);
  assert.ok(auto.xmin < 0 && auto.xmax > 40, JSON.stringify(auto));
  const a2 = G.autoView([f("x^2")], 0.6);
  assert.ok(a2.ymax > 90 && a2.ymax < 130 || a2.ymax > 20, JSON.stringify(a2));
  assert.equal(G.niceStep(20, 10), 2);
  assert.equal(G.niceStep(1, 10), 0.1);
});

test("describe lists points", () => {
  const a = G.analyse([f("x^2-4")], -10, 10);
  const d = G.describe(a).join("\n");
  assert.match(d, /x-intercept: \(-2, 0\)/);
  assert.match(d, /y-intercept: \(0, -4\)/);
  assert.match(d, /minimum: \(0, -4\)/);
});
