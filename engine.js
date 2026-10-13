/*
 * CAS OS engine
 * -------------
 * Turns what the student typed into an answer. Pure logic, no DOM, so it can be
 * unit-tested in Node (see tests/engine.test.js) and also runs in the browser.
 *
 *   CASEngine.calculate("solve(x^2=4", { math, Algebrite })
 *   -> { kind: "result", output: "x = -2 or x = 2", notes: ["Added 1 missing ')'"] }
 *
 * Fixes over the old calculate() in app.js:
 *   - missing closing brackets are added automatically (and reported), extra or
 *     mismatched ones give a clear error instead of a wrong answer
 *   - diff() really differentiates (Algebrite calls it d())
 *   - expressions with variables (x^2+1) are handled symbolically
 *   - plain-English questions are recognised and flagged for the AI tutor
 *     instead of being fed to the maths parser
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CASEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const OPEN = "([{";
  const CLOSE = ")]}";

  // ---- 1. cleaning the input -------------------------------------------------

  function normalize(s) {
    return String(s == null ? "" : s)
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/[−–—]/g, "-")
      .replace(/π/g, "pi")
      .replace(/²/g, "^2")
      .replace(/³/g, "^3")
      .replace(/√\s*\(/g, "sqrt(")
      .replace(/√\s*([A-Za-z0-9.]+)/g, "sqrt($1)")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Close any brackets that were left open, TI-style: "sin(2*(3+4" -> "sin(2*(3+4))".
   * Returns { text, added } or { error } when the brackets cannot be repaired
   * (a closing bracket with nothing to close, or the wrong kind of closer).
   */
  function balanceBrackets(s) {
    const stack = [];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (OPEN.includes(c)) stack.push(c);
      else if (CLOSE.includes(c)) {
        if (!stack.length) return { error: "Extra '" + c + "' at position " + (i + 1) + " - there is no matching opening bracket." };
        const o = stack.pop();
        if (OPEN.indexOf(o) !== CLOSE.indexOf(c))
          return { error: "Bracket mismatch at position " + (i + 1) + ": '" + o + "' was closed with '" + c + "'." };
      }
    }
    let tail = "";
    for (let i = stack.length - 1; i >= 0; i--) tail += CLOSE[OPEN.indexOf(stack[i])];
    return { text: s + tail, added: tail.length };
  }

  /** Split "a, b(c,d), e" on the commas that are not inside brackets. */
  function splitTop(s) {
    const out = [];
    let depth = 0,
      cur = "";
    for (const c of s) {
      if (OPEN.includes(c)) depth++;
      else if (CLOSE.includes(c)) depth--;
      if (c === "," && depth === 0) {
        out.push(cur.trim());
        cur = "";
      } else cur += c;
    }
    if (cur.trim() !== "" || out.length) out.push(cur.trim());
    return out;
  }

  // ---- 2. deciding what kind of input it is ----------------------------------

  const COMMANDS = {
    solve: "solve",
    factor: "factor",
    expand: "expand",
    simplify: "simplify",
    diff: "diff",
    derivative: "diff",
    d: "diff",
    integral: "integral",
    integrate: "integral",
    int: "integral",
    approx: "approx",
    float: "approx",
    // everyday words and UK/US spellings students actually type
    factorise: "factor",
    factorize: "factor",
    factorisation: "factor",
    factorization: "factor",
    factorising: "factor",
    factorizing: "factor",
    expansion: "expand",
    multiply: "expand",
    differentiate: "diff",
    differentiation: "diff",
    derive: "diff",
    integration: "integral",
    antiderivative: "integral",
    simplification: "simplify",
    solution: "solve",
    solving: "solve",
    numeric: "approx",
    decimal: "approx",
    // calculator-menu commands
    zeros: "solve",
    zero: "solve",
    nsolve: "nsolve",
    completesquare: "completesquare",
    limit: "limit",
    fmin: "fmin",
    fmax: "fmax",
    tangentline: "tangent",
    arclen: "arclen",
  };

  function editDistance(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
      {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1); // swapped letters
      }
    return dp[a.length][b.length];
  }

  /** "factorise" -> "factor", "difrentiate" -> "diff"; null when it is not close to any command word. */
  function resolveCommand(word) {
    const w = word.toLowerCase();
    if (COMMANDS[w]) return COMMANDS[w];
    if (w.length < 4 || MATH_WORDS.has(w)) return null; // short words are variables / functions
    let best = null,
      bestD = 99;
    for (const k of Object.keys(COMMANDS)) {
      if (k.length < 4) continue;
      const d = editDistance(w, k);
      if (d < bestD) {
        bestD = d;
        best = COMMANDS[k];
      }
    }
    return bestD <= (w.length >= 8 ? 2 : 1) ? best : null;
  }

  /**
   * "what is the derivative of x^2", "can you factorise x^2-9", "please integrate x^2"
   * -> "diff(x^2)", "factor(x^2-9)", "integral(x^2)". Only when what follows is plain maths,
   * so real questions ("explain integration by parts") still go to the AI tutor.
   */
  function rewriteNatural(s) {
    const m = /^(?:(?:please|can you|could you|help me|i need to|i want to|how (?:do|can) i|what is|what's|whats|find|calculate|work out|get)\s+)*(?:the\s+)?([a-z]+)\s+(?:of\s+)?(.+?)[?.!]*$/i.exec(s);
    if (!m) return null;
    const cmd = resolveCommand(m[1]);
    if (!cmd || /^[a-z]+\(/i.test(s)) return null;
    const rest = m[2].trim();
    const tokens = rest.match(/[A-Za-z]+/g) || [];
    if (!rest || !/^[\w\s^*\/+\-=().,]+$/.test(rest) || tokens.some((t) => t.length > 2 && !MATH_WORDS.has(t.toLowerCase()))) return null;
    return cmd + "(" + rest + ")";
  }

  const MATH_WORDS = new Set(
    ("sin cos tan sec csc cot asin acos atan sinh cosh tanh sqrt cbrt abs exp log ln log10 log2 pi e i inf " +
      "floor ceil round min max mod gcd lcm det inv transpose sum prod mean median std var " +
      "solve factor expand simplify diff derivative integral integrate int approx float d zeros nsolve completesquare limit fmin fmax tangentline arclen variance npr ncr stddev remainder randint approxfraction").split(" ")
  );

  const QUESTION_WORDS = new Set(
    ("what whats how why when where which who explain help please can could would should is are does do " +
      "find calculate tell show give me my you the for of with that this about between difference " +
      "meaning mean define definition prove proof example steps step teach").split(" ")
  );

  /** True when the text reads like English rather than maths. */
  function looksLikeQuestion(s) {
    const t = s.trim();
    if (!t) return false;
    if (/^@ai\b/i.test(t) || /\?\s*$/.test(t)) return true;
    const words = t.toLowerCase().match(/[a-z]{2,}/g) || [];
    let english = 0,
      unknown = 0;
    for (const w of words) {
      if (QUESTION_WORDS.has(w)) english++;
      else if (!MATH_WORDS.has(w)) unknown++;
    }
    // "solve for x", "what is the derivative of x^2", "explain integration"
    if (english >= 1 && words.length >= 2 && !/^(solve|factor|expand|simplify|diff|integral|int|approx|float|d)\s*\(/i.test(t))
      return true;
    // several unfamiliar words in a row = a sentence, not an algebra expression
    return unknown >= 2 && /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(t);
  }

  /**
   * Recognise "solve(...)", "solve x^2=4", "diff x^3" etc.
   * Returns { cmd, argText } or null.
   */
  function parseCommand(s) {
    const m = s.match(/^([A-Za-z]+)\s*(\(|\s)\s*([\s\S]*)$/);
    if (!m) return null;
    const cmd = resolveCommand(m[1]);
    if (!cmd) return null;
    let arg = m[3];
    if (m[2] === "(") {
      // function-call form. After bracket repair the arguments end with the final ")"
      arg = arg.replace(/\)\s*$/, "");
    }
    return { cmd, argText: arg.trim(), call: m[2] === "(", word: m[1] };
  }

  function guessVariable(text) {
    const names = (text.replace(/[A-Za-z]+\s*\(/g, "(").match(/[A-Za-z_]\w*/g) || []).filter((n) => !MATH_WORDS.has(n.toLowerCase()));
    if (names.includes("x")) return "x";
    return names[0] || "x";
  }

  // ---- 3. computing ------------------------------------------------------------

  function algebrite(A, expr) {
    if (A.clearall) A.clearall();
    const out = String(A.run(expr)).trim();
    if (/Stop:/.test(out)) {
      const reason = out.split("Stop:").pop().trim();
      const err = new Error(reason);
      err.fromAlgebrite = true;
      throw err;
    }
    return out;
  }

  function tidy(out) {
    return out.replace(/\*/g, "*").replace(/\.\.\.$/, "...");
  }

  function formatRoots(raw, v) {
    let list;
    if (/^\[.*\]$/.test(raw)) list = splitTop(raw.slice(1, -1));
    else list = [raw];
    list = list.filter((x) => x !== "");
    if (!list.length) return "No solutions found";
    return list.map((r) => v + " = " + r).join(" or ");
  }

  /** Numeric fallback for equations Algebrite cannot do symbolically (sin(x)=0.5). */
  function numericRoots(math, left, right, v) {
    const f = (x) => {
      const scope = {};
      scope[v] = x;
      return math.evaluate("(" + left + ")-(" + right + ")", scope);
    };
    const found = [];
    const lo = -20,
      hi = 20,
      steps = 4000;
    let prevX = lo,
      prevY = safe(f, lo);
    for (let i = 1; i <= steps; i++) {
      const x = lo + ((hi - lo) * i) / steps,
        y = safe(f, x);
      if (Number.isFinite(prevY) && Number.isFinite(y)) {
        if (y === 0) found.push(x);
        else if (prevY * y < 0) {
          let a = prevX,
            b = x;
          for (let k = 0; k < 60; k++) {
            const mid = (a + b) / 2;
            if (safe(f, a) * safe(f, mid) <= 0) b = mid;
            else a = mid;
          }
          const r = (a + b) / 2;
          // skip poles such as tan(x) or 1/x where the "root" is a jump
          if (Math.abs(safe(f, r)) < 1e-6) found.push(r);
        }
      }
      prevX = x;
      prevY = y;
    }
    const uniq = [];
    for (const r of found) if (!uniq.some((u) => Math.abs(u - r) < 1e-6)) uniq.push(r);
    return uniq.slice(0, 12);
  }
  function safe(f, x) {
    try {
      const y = f(x);
      return typeof y === "number" ? y : NaN;
    } catch (e) {
      return NaN;
    }
  }

  function nSolve(argText, deps) {
    const args = splitTop(argText);
    const eq = args[0] || "";
    const v = args[1] || guessVariable(eq);
    const parts = eq.split(/(?<![<>=!])=(?!=)/);
    const nums = numericRoots(deps.math, parts[0], parts[1] || "0", v);
    if (!nums.length) throw new Error("No solution found between -20 and 20.");
    return nums.map((r) => v + " = " + deps.math.format(r, { precision: 8 })).join(" or ");
  }

  function completeSquare(argText, deps) {
    const args = splitTop(argText);
    const v = args[1] || guessVariable(args[0] || "");
    const co = [2, 1, 0].map((n) => algebrite(deps.Algebrite, "coeff(" + args[0] + "," + v + "," + n + ")"));
    const [a, b, c] = co;
    const h = algebrite(deps.Algebrite, "(" + b + ")/(2*(" + a + "))");
    const k = algebrite(deps.Algebrite, "(" + c + ")-(" + b + ")^2/(4*(" + a + "))");
    const lead = a === "1" ? "" : a + "*";
    const inner = h === "0" ? v : "(" + v + (h[0] === "-" ? h : "+" + h) + ")";
    return lead + inner + "^2" + (k === "0" ? "" : k[0] === "-" ? k : "+" + k);
  }

  function limitOf(argText, deps) {
    const args = splitTop(argText);
    if (args.length < 3) throw new Error("Example: limit(sin(x)/x,x,0)");
    const [f, v, at] = args;
    const dir = args[3] ? parseFloat(args[3]) : 0;
    const a = deps.math.evaluate(at);
    const ev = (x) => deps.math.evaluate(f, { [v]: x });
    const h = [1e-6, 1e-8];
    const side = (sg) => {
      const y1 = ev(a + sg * h[0]), y2 = ev(a + sg * h[1]);
      if (Math.abs(y1) > 1e6 || Math.abs(y2) > 1e6) return sg * (y2 > 0 ? 1 : -1) < 0 && false ? NaN : y2 > 0 ? Infinity : -Infinity;
      return Math.abs(y1 - y2) < 1e-4 ? y2 : NaN;
    };
    const l = dir >= 0 ? side(1) : NaN, r = dir <= 0 ? side(-1) : NaN;
    const vals = dir === 0 ? [l, r] : dir > 0 ? [l] : [r];
    if (vals.some((x) => Number.isNaN(x)) || (vals.length === 2 && Math.abs(vals[0] - vals[1]) > 1e-4 && vals[0] !== vals[1])) throw new Error("The limit does not exist (or could not be found numerically).");
    const y = vals[0];
    if (y === Infinity) return "∞";
    if (y === -Infinity) return "-∞";
    return String(Math.round(y * 1e6) / 1e6);
  }

  function extremum(argText, deps, sign) {
    const args = splitTop(argText);
    const f = args[0], v = args[1] || guessVariable(f || "");
    const ev = (x) => deps.math.evaluate(f, { [v]: x });
    let best = null;
    for (let x = -50; x <= 50; x += 0.01) {
      const y = safe(ev, x);
      if (Number.isFinite(y) && (best === null || sign * y > sign * best.y)) best = { x, y };
    }
    if (!best) throw new Error("No value found.");
    for (let k = 0; k < 40; k++) {
      const step = 0.01 / Math.pow(2, k);
      for (const x of [best.x - step, best.x + step]) {
        const y = safe(ev, x);
        if (Number.isFinite(y) && sign * y > sign * best.y) best = { x, y };
      }
    }
    return v + " = " + deps.math.format(best.x, { precision: 6 }) + ", value = " + deps.math.format(best.y, { precision: 8 }) + " (searched -50 to 50)";
  }

  function tangent(argText, deps) {
    const args = splitTop(argText);
    const [f, v, at] = args;
    if (args.length < 3) throw new Error("Example: tangentLine(x^2,x,3)");
    const y0 = algebrite(deps.Algebrite, "eval(" + f + "," + v + "," + at + ")");
    const m = algebrite(deps.Algebrite, "eval(d(" + f + "," + v + ")," + v + "," + at + ")");
    return algebrite(deps.Algebrite, "simplify(" + m + "*(" + v + "-(" + at + "))+" + y0 + ")");
  }

  function arcLen(argText, deps) {
    const args = splitTop(argText);
    if (args.length < 4) throw new Error("Example: arcLen(x^2,x,0,1)");
    const [f, v, a, b] = args;
    const df = algebrite(deps.Algebrite, "d(" + f + "," + v + ")");
    const g = (x) => Math.sqrt(1 + Math.pow(deps.math.evaluate(df, { [v]: x }), 2));
    const lo = deps.math.evaluate(a), hi = deps.math.evaluate(b), n = 2000, h = (hi - lo) / n;
    let sum = g(lo) + g(hi);
    for (let i = 1; i < n; i++) sum += g(lo + i * h) * (i % 2 ? 4 : 2);
    return deps.math.format((sum * h) / 3, { precision: 10 });
  }

  function solveEquation(argText, deps) {
    const args = splitTop(argText);
    const eq = args[0] || "";
    const v = args[1] || guessVariable(eq);
    const parts = eq.split(/(?<![<>=!])=(?!=)/);
    if (parts.length > 2) throw new Error("Only one '=' is allowed in an equation.");
    const left = parts[0],
      right = parts.length === 2 ? parts[1] : "0";
    if (!left.trim() || !right.trim()) throw new Error("Both sides of the equation need something, e.g. solve(x^2=4,x).");
    try {
      return formatRoots(algebrite(deps.Algebrite, "roots((" + left + ")-(" + right + ")," + v + ")"), v);
    } catch (e) {
      if (!e.fromAlgebrite || !deps.math) throw e;
      const ex = /^\s*([\w.]+)\s*\^\s*\(?\s*([A-Za-z])\s*\)?\s*$/.exec(left);
      if (ex && ex[2] === v && /^[\d.]+$/.test(right.trim()) && /^[\d.]+$/.test(ex[1])) {
        const exact = "ln(" + right.trim() + ")/ln(" + ex[1] + ")";
        return v + " = " + exact + " ≈ " + deps.math.format(deps.math.evaluate(exact.replace(/ln\(/g, "log(")), { precision: 6 });
      }
      const nums = numericRoots(deps.math, left, right, v);
      if (!nums.length) throw new Error("No solution found between -20 and 20 (and it is not a polynomial).");
      return nums.map((r) => v + " ≈ " + deps.math.format(r, { precision: 8 })).join(" or ");
    }
  }

  function differentiate(argText, deps) {
    const args = splitTop(argText);
    const f = args[0];
    if (!f) throw new Error("Nothing to differentiate. Example: diff(x^3,x)");
    const v = args[1] || guessVariable(f);
    const times = args[2] ? parseInt(args[2], 10) : 1;
    if (!(times >= 1 && times <= 10)) throw new Error("The derivative order must be a whole number from 1 to 10.");
    let expr = f;
    for (let i = 0; i < times; i++) expr = "(" + algebrite(deps.Algebrite, "d(" + expr + "," + v + ")") + ")";
    return expr.slice(1, -1);
  }

  function integrate(argText, deps) {
    const args = splitTop(argText);
    const f = args[0];
    if (!f) throw new Error("Nothing to integrate. Example: integral(x^2,x)");
    const v = args[1] || guessVariable(f);
    if (args.length >= 4) return algebrite(deps.Algebrite, "defint(" + f + "," + v + "," + args[2] + "," + args[3] + ")");
    return algebrite(deps.Algebrite, "integral(" + f + "," + v + ")");
  }

  function numeric(text, deps) {
    try {
      return deps.math.format(deps.math.evaluate(text), { precision: 14 });
    } catch (e) {
      if (!deps.Algebrite) throw e;
      return algebrite(deps.Algebrite, "float(" + text + ")");
    }
  }

  function friendlyError(e) {
    let m = (e && e.message) || String(e);
    if (/divide by zero/i.test(m)) return "Undefined: division by zero";
    if (/Undefined symbol (\w+)/.test(m)) return "'" + RegExp.$1 + "' has no value. Use solve(), diff(), etc. for symbolic work.";
    if (/Unexpected end of expression/.test(m)) return "The expression is unfinished (something is missing after the last symbol).";
    if (/Value expected/.test(m)) return "Something is missing: two operators in a row, or an operator with nothing after it.";
    if (/Parenthesis \) expected/.test(m)) return "A closing bracket is missing.";
    return m;
  }

  /**
   * Main entry point.
   * deps = { math, Algebrite }
   * Returns { kind: "result"|"question"|"empty"|"error", output, notes[] }
   */
  function calculate(raw, deps) {
    const notes = [];
    let s = normalize(raw);
    if (!s) return { kind: "empty", output: "", notes };

    const natural = rewriteNatural(s);
    if (natural) {
      notes.push("Read as: " + natural);
      s = natural;
    }

    if (looksLikeQuestion(s)) {
      return { kind: "question", output: "", question: s.replace(/^@ai\s*/i, ""), notes };
    }

    const bal = balanceBrackets(s);
    if (bal.error) return { kind: "error", output: "Error: " + bal.error, notes };
    s = bal.text;
    if (bal.added) notes.push("Added " + bal.added + " missing closing bracket" + (bal.added > 1 ? "s" : "") + ": " + s);

    try {
      const cmd = parseCommand(s);
      let out;
      if (cmd) {
        if (cmd.word.toLowerCase() !== cmd.cmd && !natural && (COMMANDS[cmd.word.toLowerCase()] !== cmd.cmd || cmd.word.toLowerCase() !== "d"))
          notes.push("Read '" + cmd.word + "' as " + cmd.cmd + "()");
        switch (cmd.cmd) {
          case "solve":
            out = solveEquation(cmd.argText, deps);
            break;
          case "factor":
          case "expand":
          case "simplify":
            if (!cmd.argText) throw new Error("Nothing to " + cmd.cmd + ". Example: " + cmd.cmd + "(x^2-9)");
            out = algebrite(deps.Algebrite, cmd.cmd + "(" + cmd.argText + ")");
            break;
          case "diff":
            out = differentiate(cmd.argText, deps);
            break;
          case "integral":
            out = integrate(cmd.argText, deps);
            break;
          case "approx":
            out = numeric(cmd.argText, deps);
            break;
          case "nsolve":
            out = nSolve(cmd.argText, deps);
            break;
          case "completesquare":
            out = completeSquare(cmd.argText, deps);
            break;
          case "limit":
            out = limitOf(cmd.argText, deps);
            break;
          case "fmin":
            out = extremum(cmd.argText, deps, -1);
            break;
          case "fmax":
            out = extremum(cmd.argText, deps, 1);
            break;
          case "tangent":
            out = tangent(cmd.argText, deps);
            break;
          case "arclen":
            out = arcLen(cmd.argText, deps);
            break;
        }
      } else if (/(^|[^<>=!])=([^=]|$)/.test(s)) {
        throw new Error("That is an equation. Use solve(" + s + ",x) to solve it.");
      } else {
        try {
          out = numeric_strict(s, deps);
        } catch (e) {
          if (/Undefined symbol/.test(e.message) && deps.Algebrite) out = algebrite(deps.Algebrite, s);
          else throw e;
        }
      }
      return { kind: "result", output: tidy(String(out)), notes };
    } catch (e) {
      return { kind: "error", output: "Error: " + friendlyError(e), notes };
    }
  }

  const FN_ALIASES = [[/\bnPr\(/g, "permutations("], [/\bnCr\(/g, "combinations("], [/\bstdDev\(/g, "std("], [/\bremainder\(/g, "mod("], [/\bapproxFraction\(/g, "fraction("], [/\bfactorial\(/g, "factorial("], [/\{/g, "["], [/\}/g, "]"]];
  function numeric_strict(text, deps) {
    for (const [re, to] of FN_ALIASES) text = text.replace(re, to);
    text = text.replace(/\brandInt\(([^,()]+),([^()]+)\)/g, "randomInt($1,($2)+1)");
    return deps.math.format(deps.math.evaluate(text), { precision: 14 });
  }

  return { resolveCommand, rewriteNatural, normalize, balanceBrackets, splitTop, looksLikeQuestion, parseCommand, calculate, friendlyError };
});
