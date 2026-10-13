/*
 * CAS OS graphing
 * ---------------
 * Pure helpers (parsing, zero/intersection/extremum finding, auto zoom) plus a
 * small canvas view with zoom, pan, trace and axis scales.
 * The helpers run in Node for tests (tests/graph.test.js).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GraphKit = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const COLORS = ["#087f73", "#c2410c", "#4338ca", "#a21caf"];

  /** One function per line (or separated by ;). "y=" and "f(x)=" prefixes are allowed. */
  function parseList(text) {
    return String(text || "")
      .split(/\n|;/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  /**
   * Turn text into a JS function x -> number (NaN where undefined).
   * prepare(text) -> { text } | { error } cleans brackets and logs (CASEngine.prepare).
   */
  function compile(text, math, prepare) {
    const body = text.replace(/^\s*(?:y\d*|f\d*\s*\(\s*x\s*\))\s*=\s*/i, "");
    const p = prepare(body);
    if (p.error) throw new Error(p.error);
    const node = math.compile(p.text);
    const f = (x) => {
      try {
        const y = node.evaluate({ x });
        if (typeof y === "number") return y;
        if (y && typeof y.re === "number" && Math.abs(y.im) < 1e-12) return y.re;
        return NaN;
      } catch (e) {
        return NaN;
      }
    };
    try {
      node.evaluate({ x: 1 });
    } catch (e) {
      if (/Undefined (symbol|function)|Unexpected|Value expected|Parenthesis/.test(e.message)) throw new Error(e.message);
    }
    return f;
  }

  const fin = Number.isFinite;

  function dedupe(xs, tol) {
    const out = [];
    for (const x of xs) if (!out.some((o) => Math.abs(o - x) <= tol)) out.push(x);
    return out;
  }

  /** x values in [lo,hi] where f changes sign (poles are ignored). */
  function roots(f, lo, hi, n) {
    const out = [];
    let px = lo,
      py = f(lo);
    if (py === 0) out.push(lo);
    for (let i = 1; i <= n; i++) {
      const x = lo + ((hi - lo) * i) / n,
        y = f(x);
      if (fin(py) && fin(y)) {
        if (y === 0) out.push(x);
        else if (py * y < 0) {
          let a = px,
            b = x,
            fa = py;
          for (let k = 0; k < 60; k++) {
            const m = (a + b) / 2,
              fm = f(m);
            if (fa * fm <= 0) b = m;
            else {
              a = m;
              fa = fm;
            }
          }
          const r = (a + b) / 2;
          if (Math.abs(f(r)) < 1e-5 * (1 + Math.max(Math.abs(py), Math.abs(y)))) out.push(r);
        }
      }
      px = x;
      py = y;
    }
    return dedupe(out, (hi - lo) * 1e-9 + 1e-9);
  }

  /** Local minima and maxima of f as [{x, y, type: "min"|"max"}]. */
  function extrema(f, lo, hi, n) {
    const h = (hi - lo) * 1e-6;
    const d = (x) => (f(x + h) - f(x - h)) / (2 * h);
    const out = [];
    for (const r of roots(d, lo, hi, n)) {
      const y = f(r);
      if (!fin(y)) continue;
      const w = (hi - lo) / n;
      const left = d(r - w),
        right = d(r + w);
      if (left < 0 && right > 0) out.push({ x: r, y, type: "min" });
      else if (left > 0 && right < 0) out.push({ x: r, y, type: "max" });
    }
    return out;
  }

  function round(v) {
    if (!fin(v)) return v;
    if (Math.abs(v) < 1e-9) return 0;
    return Number(v.toPrecision(6));
  }

  /** Everything interesting inside [lo,hi]: zeros, y-intercepts, extrema, intersections. */
  function analyse(fns, lo, hi, n) {
    n = n || 800;
    const res = { zeros: [], yint: [], extrema: [], inter: [] };
    fns.forEach((f, i) => {
      const zs = roots(f, lo, hi, n);
      const ex = extrema(f, lo, hi, n);
      // a curve that only touches the axis (x^2) has an extremum with y = 0
      for (const e of ex) if (Math.abs(e.y) < 1e-7 && !zs.some((z) => Math.abs(z - e.x) < (hi - lo) * 1e-4)) zs.push(e.x);
      zs.sort((a, b) => a - b).forEach((x) => res.zeros.push({ i, x: round(x), y: 0 }));
      if (lo <= 0 && hi >= 0) {
        const y = f(0);
        if (fin(y)) res.yint.push({ i, x: 0, y: round(y) });
      }
      ex.forEach((e) => res.extrema.push({ i, x: round(e.x), y: round(e.y), type: e.type }));
    });
    for (let i = 0; i < fns.length; i++)
      for (let j = i + 1; j < fns.length; j++) {
        const g = (x) => fns[i](x) - fns[j](x);
        for (const x of roots(g, lo, hi, n)) res.inter.push({ i, j, x: round(x), y: round(fns[i](x)) });
      }
    return res;
  }

  /** 1, 2 or 5 times a power of ten, giving about `target` divisions. */
  function niceStep(span, target) {
    const raw = span / (target || 8);
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / pow;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * pow;
  }

  const STANDARD_X = 10;
  function standardView(aspect) {
    return { xmin: -STANDARD_X, xmax: STANDARD_X, ymin: -STANDARD_X * aspect, ymax: STANDARD_X * aspect };
  }

  function zoomView(v, factor, cx, cy) {
    if (cx == null) cx = (v.xmin + v.xmax) / 2;
    if (cy == null) cy = (v.ymin + v.ymax) / 2;
    return {
      xmin: cx + (v.xmin - cx) * factor,
      xmax: cx + (v.xmax - cx) * factor,
      ymin: cy + (v.ymin - cy) * factor,
      ymax: cy + (v.ymax - cy) * factor,
    };
  }

  /** Keep the unit length equal on both axes. */
  function squareView(v, aspect) {
    const cy = (v.ymin + v.ymax) / 2,
      half = ((v.xmax - v.xmin) / 2) * aspect;
    return { xmin: v.xmin, xmax: v.xmax, ymin: cy - half, ymax: cy + half };
  }

  /** Fit the y range to the curves over the current x range (robust to asymptotes). */
  function fitY(fns, v) {
    const ys = [];
    for (const f of fns)
      for (let i = 0; i <= 600; i++) {
        const y = f(v.xmin + ((v.xmax - v.xmin) * i) / 600);
        if (fin(y) && Math.abs(y) < 1e9) ys.push(y);
      }
    if (!ys.length) return v;
    ys.sort((a, b) => a - b);
    let lo = ys[Math.floor(ys.length * 0.02)],
      hi = ys[Math.ceil(ys.length * 0.98) - 1];
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
    if (hi - lo < 1e-9) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.1;
    return { xmin: v.xmin, xmax: v.xmax, ymin: lo - pad, ymax: hi + pad };
  }

  /** Choose a window that shows the zeros, turning points and intersections, then fit y. */
  function autoView(fns, aspect) {
    const keys = [];
    const a = analyse(fns, -50, 50, 2000);
    for (const z of a.zeros) keys.push(z.x);
    for (const e of a.extrema) keys.push(e.x);
    for (const p of a.inter) keys.push(p.x);
    keys.push(0);
    let lo = Math.min(...keys),
      hi = Math.max(...keys);
    if (hi - lo < 4) {
      const mid = (lo + hi) / 2;
      lo = mid - 5;
      hi = mid + 5;
    } else {
      const pad = (hi - lo) * 0.25;
      lo -= pad;
      hi += pad;
    }
    return fitY(fns, { xmin: lo, xmax: hi, ymin: -1, ymax: 1 });
  }

  function fmt(v) {
    if (!fin(v)) return "undefined";
    const r = round(v);
    return Math.abs(r) >= 1e6 || (Math.abs(r) < 1e-4 && r !== 0) ? r.toExponential(3) : String(r);
  }

  function describe(a, names) {
    const nm = (i) => (names ? names[i] : "f" + (i + 1));
    const out = [];
    for (const z of a.zeros) out.push(nm(z.i) + " x-intercept: (" + fmt(z.x) + ", 0)");
    for (const z of a.yint) out.push(nm(z.i) + " y-intercept: (0, " + fmt(z.y) + ")");
    for (const e of a.extrema) out.push(nm(e.i) + " " + (e.type === "min" ? "minimum" : "maximum") + ": (" + fmt(e.x) + ", " + fmt(e.y) + ")");
    for (const p of a.inter) out.push(nm(p.i) + " and " + nm(p.j) + " intersect: (" + fmt(p.x) + ", " + fmt(p.y) + ")");
    return out;
  }

  // ---------------------------------------------------------------- browser UI

  function html(p) {
    const g = p.graph || {};
    const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    return (
      '<section class="page graph"><h3>Graphs <small>one function per line, up to 4</small></h3>' +
      '<textarea id="formula" rows="3" spellcheck="false">' + esc(p.formula || "sin(x)") + "</textarea>" +
      '<div class="gtools">' +
      '<button id="draw">Draw</button><button id="gIn" title="Zoom in">＋</button><button id="gOut" title="Zoom out">－</button>' +
      '<button id="gStd">Standard</button><button id="gAuto">Auto zoom</button><button id="gSq">Square</button>' +
      '<button id="gMode" class="toggle">Mode: Pan</button><label class="chk"><input type="checkbox" id="gPts" checked> Show intercepts</label></div>' +
      '<div class="gwin"><label>x min<input id="gx0" inputmode="decimal"></label><label>x max<input id="gx1" inputmode="decimal"></label>' +
      '<label>y min<input id="gy0" inputmode="decimal"></label><label>y max<input id="gy1" inputmode="decimal"></label>' +
      '<label>x unit<input id="gxu" placeholder="e.g. s" value="' + esc(g.xu) + '"></label><label>y unit<input id="gyu" placeholder="e.g. m" value="' + esc(g.yu) + '"></label></div>' +
      '<canvas id="plot" width="640" height="380" tabindex="0"></canvas>' +
      '<div class="gtools"><button id="tL">◀ Trace</button><button id="tR">Trace ▶</button><button id="tF">Next curve</button></div>' +
      '<output id="graphOut"></output><ul id="gpts" class="gpts"></ul></section>'
    );
  }

  function mount(ctx) {
    const { page, math, prepare, persist, $ } = ctx;
    const canvas = $("#plot"),
      g = canvas.getContext("2d"),
      W = canvas.width,
      H = canvas.height,
      aspect = H / W;
    page.graph = page.graph || {};
    const st = page.graph;
    let view = st.view || standardView(aspect);
    let fns = [],
      names = [],
      analysis = null,
      mode = "pan",
      trace = { on: false, i: 0, x: 0 };

    const setWin = () => {
      $("#gx0").value = fmt(view.xmin);
      $("#gx1").value = fmt(view.xmax);
      $("#gy0").value = fmt(view.ymin);
      $("#gy1").value = fmt(view.ymax);
    };
    const sx = (x) => ((x - view.xmin) / (view.xmax - view.xmin)) * W;
    const sy = (y) => H - ((y - view.ymin) / (view.ymax - view.ymin)) * H;
    const ux = (px) => view.xmin + (px / W) * (view.xmax - view.xmin);

    function build() {
      const lines = parseList($("#formula").value);
      page.formula = $("#formula").value;
      fns = [];
      names = [];
      for (let k = 0; k < lines.length; k++) {
        try {
          fns.push(compile(lines[k], math, prepare));
          names.push("f" + (k + 1));
        } catch (e) {
          $("#graphOut").textContent = "Graph error in line " + (k + 1) + ": " + e.message;
          return false;
        }
      }
      if (!fns.length) {
        $("#graphOut").textContent = "Type a function of x, e.g. x^2-4";
        return false;
      }
      $("#graphOut").textContent = "";
      return true;
    }

    function redraw(recompute) {
      if (!fns.length) return;
      if (recompute !== false) analysis = analyse(fns, view.xmin, view.xmax, 600);
      draw();
      const show = $("#gPts").checked;
      const list = show ? describe(analysis, names) : [];
      $("#gpts").innerHTML = list.map((t) => "<li>" + t + "</li>").join("");
      setWin();
      st.view = view;
      st.xu = $("#gxu").value;
      st.yu = $("#gyu").value;
      persist();
    }

    function draw() {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, W, H);
      const xs = niceStep(view.xmax - view.xmin, 10),
        ys = niceStep(view.ymax - view.ymin, 7);
      g.font = "11px Arial";
      g.lineWidth = 1;
      const ax = Math.min(Math.max(sx(0), 0), W),
        ay = Math.min(Math.max(sy(0), 0), H);
      for (let x = Math.ceil(view.xmin / xs) * xs; x <= view.xmax; x += xs) {
        g.strokeStyle = "#dde7e6";
        g.beginPath(); g.moveTo(sx(x), 0); g.lineTo(sx(x), H); g.stroke();
      }
      for (let y = Math.ceil(view.ymin / ys) * ys; y <= view.ymax; y += ys) {
        g.strokeStyle = "#dde7e6";
        g.beginPath(); g.moveTo(0, sy(y)); g.lineTo(W, sy(y)); g.stroke();
      }
      g.strokeStyle = "#445";
      g.beginPath(); g.moveTo(0, ay); g.lineTo(W, ay); g.moveTo(ax, 0); g.lineTo(ax, H); g.stroke();
      g.fillStyle = "#445";
      const below = ay > H - 16 ? ay - 4 : ay + 12,
        side = ax > W - 40 ? ax - 4 : ax + 4;
      g.textAlign = "center";
      for (let x = Math.ceil(view.xmin / xs) * xs; x <= view.xmax; x += xs) {
        if (Math.abs(x) < xs / 1e6) continue;
        g.fillText(fmt(x), sx(x), below);
      }
      g.textAlign = ax > W - 40 ? "right" : "left";
      for (let y = Math.ceil(view.ymin / ys) * ys; y <= view.ymax; y += ys) {
        if (Math.abs(y) < ys / 1e6) continue;
        g.fillText(fmt(y), side, sy(y) - 3);
      }
      g.textAlign = "right";
      g.fillText("x" + ($("#gxu").value ? " (" + $("#gxu").value + ")" : ""), W - 4, Math.min(ay - 14, H - 18) < 10 ? 12 : Math.min(ay - 14, H - 18));
      g.textAlign = "left";
      g.fillText("y" + ($("#gyu").value ? " (" + $("#gyu").value + ")" : ""), Math.min(ax + 6, W - 60), 12);
      g.textAlign = "left";
      // curves
      g.lineWidth = 2;
      fns.forEach((f, k) => {
        g.strokeStyle = COLORS[k];
        g.beginPath();
        let prev = null;
        for (let px = 0; px <= W; px++) {
          const y = f(ux(px));
          if (!fin(y)) { prev = null; continue; }
          const py = sy(y);
          if (prev !== null && (Math.abs(py - prev) > H * 3 && (py - H / 2) * (prev - H / 2) < 0 || Math.abs(py) > 1e6)) prev = null;
          if (Math.abs(py) > 1e6) continue;
          if (prev === null) g.moveTo(px, py);
          else g.lineTo(px, py);
          prev = py;
        }
        g.stroke();
      });
      // special points
      if ($("#gPts").checked && analysis) {
        const dot = (x, y, col, lab) => {
          g.fillStyle = col;
          g.beginPath(); g.arc(sx(x), sy(y), 4, 0, 7); g.fill();
          g.strokeStyle = "#fff"; g.lineWidth = 1; g.stroke();
        };
        analysis.zeros.forEach((z) => dot(z.x, 0, COLORS[z.i]));
        analysis.yint.forEach((z) => dot(0, z.y, COLORS[z.i]));
        analysis.extrema.forEach((z) => dot(z.x, z.y, "#b45309"));
        analysis.inter.forEach((z) => dot(z.x, z.y, "#dc2626"));
      }
      if (trace.on) drawTrace();
    }

    function drawTrace() {
      const f = fns[trace.i];
      if (!f) return;
      const y = f(trace.x);
      const label = "f" + (trace.i + 1) + "  x = " + fmt(trace.x) + "  y = " + fmt(y) + ($("#gyu").value && fin(y) ? " " + $("#gyu").value : "");
      $("#graphOut").textContent = "Trace: " + label;
      if (!fin(y)) return;
      g.strokeStyle = "#0008";
      g.setLineDash([4, 4]);
      g.beginPath(); g.moveTo(sx(trace.x), 0); g.lineTo(sx(trace.x), H); g.moveTo(0, sy(y)); g.lineTo(W, sy(y)); g.stroke();
      g.setLineDash([]);
      g.fillStyle = COLORS[trace.i];
      g.beginPath(); g.arc(sx(trace.x), sy(y), 6, 0, 7); g.fill();
      g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke();
      g.font = "bold 12px Arial";
      const tw = g.measureText("(" + fmt(trace.x) + ", " + fmt(y) + ")").width + 10;
      const bx = Math.min(Math.max(sx(trace.x) + 10, 2), W - tw - 2),
        by = Math.min(Math.max(sy(y) - 28, 2), H - 24);
      g.fillStyle = "#132325";
      g.fillRect(bx, by, tw, 20);
      g.fillStyle = "#fff";
      g.fillText("(" + fmt(trace.x) + ", " + fmt(y) + ")", bx + 5, by + 14);
    }

    /** Snap to an intercept / extremum / intersection of the active curve when close. */
    function snap(x) {
      if (!analysis) return x;
      const pts = [].concat(analysis.zeros, analysis.yint, analysis.extrema).filter((p) => p.i === trace.i).concat(analysis.inter.filter((p) => p.i === trace.i || p.j === trace.i));
      let best = x, bd = 7;
      for (const p of pts) {
        const d = Math.abs(sx(p.x) - sx(x));
        if (d < bd) { bd = d; best = p.x; }
      }
      return best;
    }

    const setView = (v) => { view = v; redraw(); };
    const traceTo = (x) => { trace.on = true; trace.x = snap(x); draw(); };
    const step = (dir, big) => {
      if (!trace.on) { trace.on = true; trace.x = (view.xmin + view.xmax) / 2; }
      trace.x += dir * ((view.xmax - view.xmin) / (big ? 20 : 200));
      if (trace.x > view.xmax || trace.x < view.xmin) {
        const dx = (view.xmax - view.xmin) / 2 * dir;
        view = { ...view, xmin: view.xmin + dx, xmax: view.xmax + dx };
        redraw();
      } else draw();
    };

    $("#draw").onclick = () => { if (build()) redraw(); };
    $("#gIn").onclick = () => build() && setView(zoomView(view, 0.5));
    $("#gOut").onclick = () => build() && setView(zoomView(view, 2));
    $("#gStd").onclick = () => build() && setView(standardView(aspect));
    $("#gAuto").onclick = () => build() && setView(autoView(fns, aspect));
    $("#gSq").onclick = () => build() && setView(squareView(view, aspect));
    $("#gPts").onchange = () => redraw(false);
    $("#gxu").oninput = $("#gyu").oninput = () => redraw(false);
    $("#gMode").onclick = () => {
      mode = mode === "pan" ? "trace" : "pan";
      trace.on = mode === "trace";
      if (trace.on && !(trace.x >= view.xmin && trace.x <= view.xmax)) trace.x = (view.xmin + view.xmax) / 2;
      $("#gMode").textContent = "Mode: " + (mode === "pan" ? "Pan" : "Trace");
      if (!trace.on) $("#graphOut").textContent = "";
      redraw(false);
    };
    ["gx0", "gx1", "gy0", "gy1"].forEach((id) => {
      $("#" + id).onchange = () => {
        try {
          const v = { xmin: math.evaluate($("#gx0").value), xmax: math.evaluate($("#gx1").value), ymin: math.evaluate($("#gy0").value), ymax: math.evaluate($("#gy1").value) };
          if (!(v.xmax > v.xmin && v.ymax > v.ymin)) throw new Error("max must be bigger than min");
          if (build()) setView(v);
        } catch (e) {
          $("#graphOut").textContent = "Window error: " + e.message;
        }
      };
    });
    $("#tL").onclick = () => build() && (mode = "trace", $("#gMode").textContent = "Mode: Trace", step(-1, false));
    $("#tR").onclick = () => build() && (mode = "trace", $("#gMode").textContent = "Mode: Trace", step(1, false));
    $("#tF").onclick = () => { if (!trace.on) { trace.on = true; trace.x = (view.xmin + view.xmax) / 2; } trace.i = (trace.i + 1) % fns.length; draw(); };

    canvas.addEventListener("keydown", (e) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "ArrowRight") { step(k === "ArrowLeft" ? -1 : 1, e.shiftKey); e.preventDefault(); }
      else if (k === "ArrowUp" || k === "ArrowDown") { if (fns.length) { trace.on = true; trace.i = (trace.i + (k === "ArrowUp" ? 1 : fns.length - 1)) % fns.length; draw(); } e.preventDefault(); }
      else if (k === "+" || k === "=") { setView(zoomView(view, 0.5)); }
      else if (k === "-") { setView(zoomView(view, 2)); }
    });
    let drag = null;
    const local = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    };
    canvas.addEventListener("pointerdown", (e) => {
      canvas.focus();
      const p = local(e);
      drag = { x: p.x, y: p.y, view: { ...view }, moved: false };
      canvas.setPointerCapture(e.pointerId);
      if (mode === "trace") traceTo(ux(p.x));
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const p = local(e);
      if (mode === "trace") return traceTo(ux(p.x));
      const dx = ((p.x - drag.x) / W) * (drag.view.xmax - drag.view.xmin),
        dy = ((p.y - drag.y) / H) * (drag.view.ymax - drag.view.ymin);
      view = { xmin: drag.view.xmin - dx, xmax: drag.view.xmax - dx, ymin: drag.view.ymin + dy, ymax: drag.view.ymax + dy };
      drag.moved = true;
      draw();
    });
    const end = () => { if (drag && drag.moved) redraw(); drag = null; };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const p = local(e);
      const cx = ux(p.x), cy = view.ymax - (p.y / H) * (view.ymax - view.ymin);
      setView(zoomView(view, e.deltaY < 0 ? 0.8 : 1.25, cx, cy));
    }, { passive: false });

    setWin();
    if (build()) redraw();
    return { get view() { return view; }, get analysis() { return analysis; } };
  }

  return { parseList, compile, roots, extrema, analyse, niceStep, standardView, zoomView, squareView, fitY, autoView, describe, fmt, html, mount };
});
