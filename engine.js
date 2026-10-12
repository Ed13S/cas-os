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
  };

  const MATH_WORDS = new Set(
    ("sin cos tan sec csc cot asin acos atan sinh cosh tanh sqrt cbrt abs exp log ln log10 log2 pi e i inf " +
      "floor ceil round min max mod gcd lcm det inv transpose sum prod mean median std var " +
      "solve factor expand simplify diff derivative integral integrate int approx float d").split(" ")
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
    const cmd = COMMANDS[m[1].toLowerCase()];
    if (!cmd) return null;
    let arg = m[3];
    if (m[2] === "(") {
      // function-call form. After bracket repair the arguments end with the final ")"
      arg = arg.replace(/\)\s*$/, "");
    }
    return { cmd, argText: arg.trim(), call: m[2] === "(" };
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

  function numeric_strict(text, deps) {
    return deps.math.format(deps.math.evaluate(text), { precision: 14 });
  }

  return { normalize, balanceBrackets, splitTop, looksLikeQuestion, parseCommand, calculate, friendlyError };
});
