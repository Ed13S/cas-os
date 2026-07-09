// ui.js — calculator-shell interactions (tabs, keypad, soft keys)
// Does not touch cas-engine.js / app.js logic; only wires the new shell
// to the existing #input, #output, run(), askAI(), clearCanvas(),
// startVoice(), readCamera() hooks that already exist.
(function () {
  "use strict";

  var TABS = ["calc", "graph", "write", "voice", "cam", "ai"];

  function setActiveTab(name) {
    document.querySelectorAll(".tab").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.tab === name);
    });
    document.querySelectorAll(".pane").forEach(function (pane) {
      pane.classList.toggle("active", pane.id === "pane-" + name);
    });
    document.querySelectorAll(".page-indicator .dot").forEach(function (dot, i) {
      dot.classList.toggle("active", TABS[i] === name);
    });

    // Plotly needs a resize nudge once its container becomes visible
    if (name === "graph" && window.Plotly) {
      var el = document.getElementById("graph");
      if (el) { try { window.Plotly.Plots.resize(el); } catch (e) {} }
    }
  }

  function currentTab() {
    var active = document.querySelector(".tab.active");
    return active ? active.dataset.tab : "calc";
  }

  function shiftTab(delta) {
    var idx = TABS.indexOf(currentTab());
    var next = (idx + delta + TABS.length) % TABS.length;
    setActiveTab(TABS[next]);
  }

  document.querySelectorAll(".tab").forEach(function (btn) {
    btn.addEventListener("click", function () { setActiveTab(btn.dataset.tab); });
  });

  // ---- keypad: insert text into the focused math field ----
  function activeField() {
    var f = document.activeElement;
    if (f && (f.id === "input" || f.id === "aiinput")) return f;
    return document.getElementById("input");
  }

  function insertAtCursor(field, text) {
    if (!field) return;
    var start = field.selectionStart != null ? field.selectionStart : field.value.length;
    var end = field.selectionEnd != null ? field.selectionEnd : field.value.length;
    field.value = field.value.slice(0, start) + text + field.value.slice(end);
    var pos = start + text.length;
    if (field.setSelectionRange) field.setSelectionRange(pos, pos);
    field.focus();
  }

  document.querySelectorAll(".key[data-insert]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      insertAtCursor(activeField(), btn.dataset.insert);
    });
  });

  // ---- function keys (solve, sin, cos, diff, int, ...) ----
  // If the entry line already has something in it, wrap it in the
  // function and run immediately (e.g. "x^2=4" + [solve] -> solve(x^2=4)).
  // If the entry line is empty, just drop in "func(" so the person can
  // type the argument themselves, same as a plain insert key.
  function applyFunction(fnName) {
    var field = document.getElementById("input");
    if (!field) return;
    var val = field.value.trim();
    if (val) {
      field.value = fnName + "(" + val + ")";
      runEntry();
    } else {
      insertAtCursor(field, fnName + "(");
    }
  }

  document.querySelectorAll(".key[data-fn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyFunction(btn.dataset.fn);
    });
  });

  // ---- history: log each entry/answer pair on the scratchpad ----
  function logHistory(expr, answer) {
    var hist = document.getElementById("history");
    if (!hist || !expr) return;
    var inLine = document.createElement("div");
    inLine.className = "h-in";
    inLine.textContent = "› " + expr;
    hist.appendChild(inLine);
    if (answer) {
      var outLine = document.createElement("div");
      outLine.className = "h-out";
      outLine.textContent = answer;
      hist.appendChild(outLine);
    }
    hist.scrollTop = hist.scrollHeight;
  }

  function runEntry() {
    var input = document.getElementById("input");
    var output = document.getElementById("output");
    if (!input) return;
    var expr = input.value.trim();
    if (!expr) return;
    if (typeof window.run === "function") {
      try {
        window.run();
      } catch (err) {
        if (output) output.textContent = "Error: " + err.message;
        console.error("run() threw:", err);
        return;
      }
    } else {
      if (output) output.textContent = "Error: run() is not defined (check app.js is loaded).";
      console.error("window.run is not a function — app.js may not have loaded, or run() isn't declared at top level.");
      return;
    }
    // give app.js a tick to populate #output, then archive the line
    setTimeout(function () {
      var answer = output ? output.textContent.trim() : "";
      logHistory(expr, answer);
      input.value = "";
    }, 30);
  }

  function deleteChar() {
    var field = activeField();
    if (!field) return;
    var start = field.selectionStart != null ? field.selectionStart : field.value.length;
    var end = field.selectionEnd != null ? field.selectionEnd : field.value.length;
    if (start === end && start > 0) {
      field.value = field.value.slice(0, start - 1) + field.value.slice(start);
      field.setSelectionRange(start - 1, start - 1);
    } else {
      field.value = field.value.slice(0, start) + field.value.slice(end);
      field.setSelectionRange(start, start);
    }
    field.focus();
  }

  document.querySelectorAll("[data-action]").forEach(function (el) {
    el.addEventListener("click", function () {
      switch (el.dataset.action) {
        case "run":       runEntry(); break;
        case "del":       deleteChar(); break;
        case "prevtab":   shiftTab(-1); break;
        case "nexttab":   shiftTab(1); break;
        case "menu":      setActiveTab(TABS[(TABS.indexOf(currentTab()) + 1) % TABS.length]); break;
        case "power":     document.querySelector(".device").classList.toggle("dimmed"); break;
        case "navleft":   shiftTab(-1); break;
        case "navright":  shiftTab(1); break;
        default: break; // navup / navdown / navcenter are decorative
      }
    });
  });

  // Enter key inside the entry line runs the calculation
  var inputEl = document.getElementById("input");
  if (inputEl) {
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); runEntry(); }
    });
  }

  // ---- status clock ----
  function tick() {
    var el = document.getElementById("clock");
    if (!el) return;
    var d = new Date();
    var h = d.getHours().toString().padStart(2, "0");
    var m = d.getMinutes().toString().padStart(2, "0");
    el.textContent = h + ":" + m;
  }
  tick();
  setInterval(tick, 15000);

  setActiveTab("calc");
})();
