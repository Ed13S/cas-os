// Run with:  npm install && npm test      (uses Node's built-in test runner)
const test = require("node:test");
const assert = require("node:assert");
const math = require("mathjs");
const Algebrite = require("algebrite");
const E = require("../engine.js");
const run = (s) => E.calculate(s, { math, Algebrite });
const out = (s) => run(s).output;

test("plain arithmetic", () => {
  assert.equal(out("2+3*4"), "14");
  assert.equal(out("sqrt(16)"), "4");
  assert.equal(out("2×3"), "6");
  assert.equal(out("√9"), "3");
});

test("missing closing brackets are added and reported", () => {
  for (const [input, expected] of [
    ["sqrt(16", "4"],
    ["2*(3+4", "14"],
    ["sin(0", "0"],
    ["approx(2+3", "5"],
    ["factor(x^2-9", "(x-3)*(x+3)"],
    ["solve(x^2=4", "x = -2 or x = 2"],
    ["diff(x^3", "3*x^2"],
    ["integral(x^2", "1/3*x^3"],
    ["expand((x+2)^3", "x^3+6*x^2+12*x+8"],
    ["((2+3)*(4+5", "45"],
  ]) {
    const r = run(input);
    assert.equal(r.output, expected, input);
    assert.ok(r.notes.length === 1 && /missing closing bracket/.test(r.notes[0]), "note for " + input);
  }
});

test("extra or mismatched brackets are errors, not wrong answers", () => {
  assert.match(out("2+3)"), /Extra '\)'/);
  assert.match(out("(2+3]"), /mismatch/i);
});

test("solve", () => {
  assert.equal(out("solve(x^2=4)"), "x = -2 or x = 2");
  assert.equal(out("solve x^2=4"), "x = -2 or x = 2");
  assert.equal(out("solve(x^2=4,x)"), "x = -2 or x = 2");
  assert.equal(out("solve(x^2-2*x+1=0)"), "x = 1");
  assert.equal(out("solve(2*x+6=0)"), "x = -3");
  assert.equal(out("solve(t^2=9,t)"), "t = -3 or t = 3");
  assert.match(out("solve(sin(x)=0.5)"), /x ≈ /); // numeric fallback
});

test("calculus", () => {
  assert.equal(out("diff(x^3)"), "3*x^2");
  assert.equal(out("diff x^3"), "3*x^2");
  assert.equal(out("diff(sin(x)*x,x)"), "sin(x)+x*cos(x)");
  assert.equal(out("diff(x^4,x,2)"), "12*x^2");
  assert.equal(out("integral(x^2)"), "1/3*x^3");
  assert.equal(out("integral(x^2,x,0,1)"), "1/3");
});

test("algebra with variables", () => {
  assert.equal(out("x^2+1"), "x^2+1");
  assert.equal(out("simplify(2x+3x)"), "5*x");
  assert.equal(out("factor(x^2-9)"), "(x-3)*(x+3)");
});

test("natural-language questions are routed to the tutor", () => {
  for (const q of [
    "how do I solve a quadratic?",
    "explain integration by parts",
    "solve for x",
    "@ai help me",
    "can you explain factorising to me",
  ])
    assert.equal(run(q).kind, "question", q);
  for (const m of ["solve x^2=4", "diff x^3", "ax^2+bx+c", "sin x", "2x+3y", "mean([1,2,3])"])
    assert.notEqual(run(m).kind, "question", m);
});

test("errors are friendly", () => {
  assert.match(out("1/0"), /division by zero|Infinity/i);
  assert.match(out("solve(=4)"), /Both sides/);
  assert.match(out("x^2=4"), /Use solve/);
  assert.equal(run("   ").kind, "empty");
});

test("synonyms, spellings and plain-English requests are understood", () => {
  for (const [input, expected] of [
    ["factorise x^2-9", "(x-3)*(x+3)"],
    ["factorize(x^2-9", "(x-3)*(x+3)"],
    ["differentiate x^3", "3*x^2"],
    ["differentate x^3", "3*x^2"], // typo
    ["integrate x^2", "1/3*x^3"],
    ["expnad (x+1)^2", "x^2+2*x+1"], // typo
    ["what is the derivative of x^2", "2*x"],
    ["can you factor x^2-9", "(x-3)*(x+3)"],
    ["please solve x^2=9", "x = -3 or x = 3"],
    ["find the integral of x^2", "1/3*x^3"],
  ]) {
    const r = run(input);
    assert.equal(r.output, expected, input);
    assert.ok(r.notes.length >= 1, "explains what it understood: " + input);
  }
  assert.equal(E.resolveCommand("sin"), null);
  assert.equal(E.resolveCommand("mean"), null);
});

test("calculator-menu commands", () => {
  const math = require("mathjs"), Algebrite = require("algebrite");
  const c = (q) => E.calculate(q, { math, Algebrite }).output;
  assert.equal(c("solve(10^x=18,x)"), "x = ln(18)/ln(10) ≈ 1.25527");
  assert.equal(c("zeros(x^2-4,x)"), "x = -2 or x = 2");
  assert.equal(c("completeSquare(x^2+6x+1,x)"), "(x+3)^2-8");
  assert.equal(c("limit(sin(x)/x,x,0)"), "1");
  assert.equal(c("nCr(5,2)"), "10");
  assert.equal(c("remainder(17,5)"), "2");
  assert.equal(c("approxFraction(0.75)"), "3/4");
  assert.match(c("stdDev({1,2,3,4}"), /^1\.29/);
});

test("log notation and trailing comma", () => {
  const c = (q) => E.calculate(q, { math, Algebrite }).output;
  assert.equal(c("solve(log_10(x)=2,)"), "x = 100");
  assert.equal(c("log_2(8)"), "3");
  assert.equal(c("log(1000)"), "3");
  assert.equal(c("ln(e)"), "1");
});

test("plain evaluate phrasing and constants", () => {
  const c = (q) => E.calculate(q, { math, Algebrite }).output;
  assert.equal(c("log_10(100)"), "2");
  assert.equal(c("log_10(100)="), "2");
  assert.equal(c("what is log_10(100)"), "2");
  assert.equal(c("solve(log_10(100)=x,x)"), "x = 2");
  assert.equal(c("solve(2^x=8,x)"), "x = 3");
  assert.equal(E.calculate("explain log laws", { math, Algebrite }).kind, "question");
});
