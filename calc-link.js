/*
 * Send files to a TI-Nspire over USB straight from the page (WebUSB, Chrome or Edge).
 * A thin, friendly wrapper around vendor/nspirelink (GPL-3.0-or-later, a JavaScript port of libnspire).
 *
 *   const link = CalcLink.create();
 *   const info = await link.connect();               // must run from a click
 *   await link.send("Notes.tns", bytes, { onProgress });
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CalcLink = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const TIPS = {
    NO_WEBUSB: "This browser cannot use USB devices. Open CAS OS in Chrome or Edge on a computer (not Safari, Firefox or a phone).",
    NO_DEVICE_SELECTED: "No calculator was chosen. Plug it in with the USB cable, turn it on, press Connect and pick it from the list.",
    OPEN_FAILED: "The browser could not open the calculator. Close the TI-Nspire software and any other program using it, unplug the cable, plug it back in and try again. (Windows with an original CX needs a WinUSB driver; Linux needs a udev rule.)",
    NOT_NSPIRE: "That device does not look like a TI-Nspire.",
    TIMEOUT: "The calculator stopped answering. Check the cable, unlock the calculator and try again.",
    DISCONNECTED: "The calculator was unplugged. Plug it back in and press Connect.",
    USB_ERROR: "A USB error happened. Unplug the cable, plug it back in and press Connect.",
    PROTOCOL: "The calculator sent something unexpected. Unplug the cable, plug it back in and press Connect.",
    REFUSED: "The calculator did not accept the file. It may be full, or the file name is not allowed.",
    TOO_LARGE: "That file is too big for the calculator.",
    BAD_PATH: "The file name is not allowed on the calculator.",
    EXISTS: "A file with that name is already on the calculator.",
    BUSY: "The calculator is busy. Close any open dialog on it and try again.",
  };

  /** A name the calculator will take: letters, digits, spaces, - and _ only, always ending in .tns (or the given extension). */
  function safeName(name, ext) {
    ext = ext === undefined ? ".tns" : ext;
    let base = String(name || "Document").replace(/\.[A-Za-z0-9]+$/, "").replace(/[^\w\- ]+/g, "_").replace(/\s+/g, " ").trim();
    if (!base) base = "Document";
    return base.slice(0, 40) + ext;
  }

  /** One folder or file name: no slashes or odd characters, same rules as safeName but no extension added. */
  function safePart(name) {
    const m = /\.([A-Za-z0-9]{1,5})$/.exec(String(name || ""));
    return m ? safeName(name, "." + m[1].toLowerCase()) : safeName(name, "").replace(/\.$/, "");
  }
  const joinPath = (folder, name) => (folder === "/" || !folder ? "" : folder.replace(/\/$/, "")) + "/" + name;

  function friendlyError(e) {
    const code = e && e.code;
    if (code === "OPEN_FAILED" && e.step) return TIPS.OPEN_FAILED + " (step: " + e.step + ")";
    if (code && TIPS[code]) return TIPS[code];
    return "Could not talk to the calculator: " + ((e && e.message) || e);
  }

  function create(opts) {
    opts = opts || {};
    const load = opts.load || (() => import("./vendor/nspirelink/nspirelink.mjs"));
    const usbOf = () => opts.usb || (typeof navigator !== "undefined" ? navigator.usb : undefined);
    let mod = null,
      link = null,
      info = null;
    // Find what is at a path by listing its parent folder. (Asking a real CX II for the attributes of a
    // file that is not there can go unanswered, which times out and closes the link.)
    const look = async (path) => {
      const i = path.lastIndexOf("/");
      const parent = path.slice(0, i) || "/", name = path.slice(i + 1).toLowerCase();
      let items;
      try { items = await link.list(parent); } catch (e) { if (e && e.code === "NOT_FOUND") return null; throw e; }
      const hit = items.find((x) => x.name.toLowerCase() === name);
      return hit ? { name: hit.name, size: hit.size, dir: !!hit.dir } : null;
    };
    const api = {
      supported: () => !!(opts.device || usbOf()),
      get connected() {
        return !!link && link.opened;
      },
      get info() {
        return info;
      },
      friendlyError,
      safeName,
      /** Ask the browser for the calculator (the user picks it), then open it. Call from a click. */
      async connect() {
        if (!api.supported()) {
          const e = new Error(TIPS.NO_WEBUSB);
          e.code = "NO_WEBUSB";
          throw e;
        }
        if (link) await api.disconnect();
        mod = mod || (await load());
        const l = opts.device ? mod.NspireLink.fromDevice(opts.device, opts.linkOptions) : await mod.NspireLink.request({ usb: usbOf(), ...(opts.linkOptions || {}) });
        try {
          await l.open();
          await l.ready();
          info = await l.info();
        } catch (e) {
          try {
            await l.close();
          } catch (e2) {
            /* already closed */
          }
          throw e;
        }
        link = l;
        return info;
      },
      /** True if My Documents already has a file with this name. */
      async exists(name) {
        if (!link) throw Object.assign(new Error("Not connected."), { code: "NOT_OPEN" });
        return !!(await look("/" + name));
      },
      /** Put bytes into My Documents. Throws code EXISTS unless overwrite is true. Returns the path. */
      async send(name, bytes, o) {
        o = o || {};
        if (!link || !link.opened) throw Object.assign(new Error("Connect to the calculator first."), { code: "NOT_OPEN" });
        const file = safeName(name);
        if (!o.overwrite && (await api.exists(file))) throw Object.assign(new Error(TIPS.EXISTS), { code: "EXISTS", name: file });
        await link.put("/" + file, bytes, { onProgress: o.onProgress });
        return "/" + file;
      },
      /** Folders and files in a calculator folder ("/" is My Documents), folders first. */
      async list(folder) {
        if (!link) throw Object.assign(new Error("Not connected."), { code: "NOT_OPEN" });
        const items = await link.list(folder || "/");
        return items.filter((x) => x.name !== "." && x.name !== "..").sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));
      },
      /** Make a folder (and any missing parent folders). Returns its path. An existing folder is fine. */
      async mkdir(path) {
        if (!link) throw Object.assign(new Error("Not connected."), { code: "NOT_OPEN" });
        const parts = String(path).split("/").filter(Boolean).map(safePart);
        let cur = "";
        for (const part of parts) {
          cur += "/" + part;
          const a = await look(cur);
          if (a && !a.dir) throw Object.assign(new Error("There is already a file called " + part + "."), { code: "EXISTS", name: part });
          if (!a) await link.mkdir(cur);
        }
        return cur || "/";
      },
      /**
       * Send one file into a folder. Same overwrite rule as send().
       */
      async sendTo(folder, name, bytes, o) {
        o = o || {};
        if (!link || !link.opened) throw Object.assign(new Error("Connect to the calculator first."), { code: "NOT_OPEN" });
        const dir = await api.mkdir(folder || "/");
        const file = safePart(name);
        const path = joinPath(dir, file);
        if (!o.overwrite && (await look(path))) throw Object.assign(new Error(TIPS.EXISTS), { code: "EXISTS", name: file, path });
        await link.put(path, bytes, { onProgress: o.onProgress });
        return path;
      },
      /**
       * Send many files, keeping their folder structure: items = [{ path: "Week1/notes.tns", bytes }].
       * onItem(i, total, path, "sending"|"done"|"skipped"|"failed", error). An existing file is skipped unless
       * overwrite is true (a function(path) -> boolean also works). Stops only when the calculator is lost.
       */
      async sendTree(items, destFolder, o) {
        o = o || {};
        const out = { sent: [], skipped: [], failed: [] };
        for (let i = 0; i < items.length; i++) {
          const parts = String(items[i].path).split("/").filter(Boolean);
          const name = parts.pop();
          const folder = joinPath(destFolder || "/", parts.map(safePart).join("/")).replace(/\/$/, "") || "/";
          const shown = (folder === "/" ? "" : folder) + "/" + safePart(name);
          o.onItem && o.onItem(i, items.length, shown, "sending");
          try {
            const ow = typeof o.overwrite === "function" ? await o.overwrite(shown) : !!o.overwrite;
            await api.sendTo(folder, name, items[i].bytes, { overwrite: ow });
            out.sent.push(shown);
            o.onItem && o.onItem(i, items.length, shown, "done");
          } catch (e) {
            if (e.code === "EXISTS" && e.name) {
              out.skipped.push(shown);
              o.onItem && o.onItem(i, items.length, shown, "skipped");
            } else {
              out.failed.push({ path: shown, error: e });
              o.onItem && o.onItem(i, items.length, shown, "failed", e);
              if (["TIMEOUT", "USB_ERROR", "DISCONNECTED", "PROTOCOL", "NACK", "BUSY", "NOT_OPEN"].includes(e.code)) break;
            }
          }
        }
        return out;
      },
      async disconnect() {
        const l = link;
        link = null;
        info = null;
        if (l) {
          try {
            await l.close();
          } catch (e) {
            /* ignore */
          }
        }
      },
    };
    return api;
  }

  return { create, safeName, safePart, friendlyError };
});
