/*
 * TI-Nspire .tns reader / writer
 * ------------------------------
 * A .tns file is a zip archive with three TI-specific twists:
 *   1. the first entry starts with "*TIMLP0500" instead of the usual "PK\3\4",
 *      and the end-of-archive marker is "TIPD" instead of "PK\5\6";
 *   2. the XML files (Problem1.xml ...) are stored with compression method 13:
 *      "XML-compressed" (closing tags replaced by 0x0E + index), deflated, then
 *      XOR-ed with a fixed 3DES keystream, behind a fixed 40-byte header;
 *   3. everything else (images etc.) is a normal deflated zip entry.
 *
 * The format was worked out by the TI-Nspire community (hackspire.org) and this
 * module follows the behaviour of Luna (https://github.com/ndless-nspire/Luna,
 * MPL 1.1, (C) Olivier Armand). tests/tns.test.js checks that the files written
 * here are byte-for-byte identical to Luna's output.
 *
 * What it can do
 *   TNS.read(bytes)          -> { version, files[] }   open a .tns
 *   TNS.write(doc)           -> Uint8Array              save a .tns
 *   TNS.newLuaDocument(src)  -> doc                     a document that runs a Lua script
 *   TNS.luaFromCasDoc(doc)   -> string                  Lua viewer for a CAS OS document
 *
 * What it cannot do (be honest about it)
 *   - Document.xml written by TI's own software uses different key material, so
 *     such entries are kept byte-for-byte ("opaque") but cannot be edited.
 *     Problem XML files that use the standard header (everything Luna writes,
 *     and files made by many other tools) can be read and edited as text.
 *   - It does not know the XML schema of the Calculator/Notes/Graphs widgets, so
 *     it edits XML as text instead of presenting those pages as structured data.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./tns-constants.js"));
  else root.TNS = factory(root.TNS_CONSTANTS);
})(typeof self !== "undefined" ? self : this, function (C) {
  "use strict";

  // ---- small helpers -----------------------------------------------------------

  const b64 = (s) => {
    if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(s, "base64"));
    const bin = atob(s),
      out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };
  const KEYSTREAM = b64(C.keystream);
  const TIEN_HEADER = b64(C.tienHeader);
  const DEFAULT_DOCUMENT = b64(C.defaultDocument);
  const LUA_HEADER = b64(C.luaHeader);
  const LUA_FOOTER = b64(C.luaFooter);
  const XML_HEADER = "TIXC0100-1.0?>";

  const enc = new TextEncoder();
  const dec = new TextDecoder("utf-8");
  const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
  const latin1 = (u8) => Array.from(u8, (b) => String.fromCharCode(b)).join("");
  const concat = (parts) => {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) {
      out.set(p, o);
      o += p.length;
    }
    return out;
  };
  const equal = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const startsWith = (u8, s, at) => s.length + (at || 0) <= u8.length && [...s].every((c, i) => u8[(at || 0) + i] === c.charCodeAt(0));

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(u8) {
    let c = 0xffffffff;
    for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  // ---- deflate (pluggable so Node tests can use zlib for byte-exact output) ------

  async function viaStream(Ctor, kind, u8) {
    const stream = new Blob([u8]).stream().pipeThrough(new Ctor(kind));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  let codec = {
    deflateRaw: (u8) => viaStream(CompressionStream, "deflate-raw", u8),
    inflateRaw: (u8) => viaStream(DecompressionStream, "deflate-raw", u8),
  };
  function setCodec(c) {
    codec = c;
  }

  // ---- the TI encryption layer (symmetric XOR keystream) -------------------------

  function xorKeystream(u8) {
    const out = new Uint8Array(u8.length);
    for (let i = 0; i < u8.length; i++) out[i] = u8[i] ^ KEYSTREAM[i % KEYSTREAM.length];
    return out;
  }

  // ---- "XML compression": tags are numbered; closing tags become 0x0E <number> ---

  const PUA = 0xe000; // an unknown byte b is shown as the character U+E000+b so nothing is lost

  function pushUnicode(out, uc) {
    if (uc < 0x80) out.push(uc);
    else if (uc < 0x800) out.push(uc >> 8, uc & 255);
    else if (uc < 0x10000) out.push(0x80, uc >> 8, uc & 255);
    else out.push(0x08, uc >> 16, (uc >> 8) & 255, uc & 255);
  }

  /** XML text -> TI "compressed" XML bytes (before deflate). mode "full" or "raw". */
  function encodeXml(text, mode, header) {
    text = String(text).replace(/^﻿/, "");
    const m = /<(prob|doc)/.exec(text);
    if (!m) throw new Error("This is not a TI-Nspire problem or document (no <prob> or <doc> element).");
    const src = Array.from(text.slice(m.index)); // by code point
    const out = Array.from(ascii(header == null ? XML_HEADER : header));
    const stack = [];
    let nextId = 0;
    const putChar = (ch, inCdata) => {
      const uc = ch.codePointAt(0);
      if (uc >= PUA && uc <= PUA + 0xff) out.push(uc - PUA);
      else if (uc >= 0x80 && inCdata) for (const b of enc.encode(ch)) out.push(b);
      else pushUnicode(out, uc);
    };
    let i = 0;
    const startsAt = (s) => s.every((c, k) => src[i + k] === c);
    const CD = Array.from("<![CDATA["),
      CDE = Array.from("]]>");
    while (i < src.length) {
      if (src[i] !== "<") {
        putChar(src[i++], false);
        continue;
      }
      if (startsAt(CD)) {
        // CDATA is copied through untouched (Lua scripts live here)
        for (const c of CD) out.push(c.charCodeAt(0));
        i += CD.length;
        while (i < src.length && !startsAt(CDE)) putChar(src[i++], true);
        if (i >= src.length) throw new Error("Unterminated <![CDATA[ section.");
        for (const c of CDE) out.push(c.charCodeAt(0));
        i += 3;
        continue;
      }
      if (src[i + 1] === "!" || src[i + 1] === "?") throw new Error("XML comments and processing instructions are not supported inside the document.");
      if (src[i + 1] === "/") {
        if (!stack.length) throw new Error("Closing tag with no matching opening tag.");
        const id = stack.pop();
        while (i < src.length && src[i] !== ">") i++;
        i++;
        if (id < 256) out.push(0x0e, id);
        else for (const c of "</>") out.push(c.charCodeAt(0)); // too many tags for the table (rare)
        continue;
      }
      // opening tag: copy it up to the closing '>' (respecting quotes)
      let j = i,
        quote = null,
        tag = "";
      for (; j < src.length; j++) {
        const c = src[j];
        if (quote) {
          if (c === quote) quote = null;
        } else if (c === '"' || c === "'") quote = c;
        else if (c === ">") break;
        tag += c;
      }
      if (j >= src.length) throw new Error("Unterminated tag.");
      const selfClosing = tag.endsWith("/");
      if (selfClosing) tag = tag.slice(0, -1).replace(/\s+$/, "");
      for (const c of tag) putChar(c, false);
      out.push(0x3e);
      const id = nextId++;
      if (selfClosing) out.push(0x0e, id);
      else stack.push(id);
      i = j + 1;
    }
    if (stack.length) throw new Error("Unclosed tag(s) in the XML.");
    return Uint8Array.from(out);
  }

  /** TI compressed XML bytes -> readable XML text. mode "full" decodes unicode escapes. */
  function decodeXml(u8, mode) {
    let pos = 0,
      header = XML_HEADER;
    const hm = /^TIXC\d{4}-[\d.]+\?>/.exec(latin1(u8.subarray(0, 24)));
    if (hm) {
      header = hm[0];
      pos = header.length;
    }
    let out = '<?xml version="1.0" encoding="UTF-8" ?>\n';
    const names = []; // tag names in opening order
    const stack = [];
    let inCdata = false;
    while (pos < u8.length) {
      const b = u8[pos];
      if (inCdata) {
        if (b === 0x5d && u8[pos + 1] === 0x5d && u8[pos + 2] === 0x3e) {
          out += "]]>";
          pos += 3;
          inCdata = false;
          continue;
        }
        if (b >= 0x80 || (b < 0x20 && b !== 9 && b !== 10 && b !== 13)) out += String.fromCharCode(PUA + b);
        else out += String.fromCharCode(b);
        pos++;
        continue;
      }
      if (b === 0x3c && startsWith(u8, "<![CDATA[", pos)) {
        out += "<![CDATA[";
        pos += 9;
        inCdata = true;
        continue;
      }
      if (b === 0x3c) {
        let j = pos + 1,
          name = "";
        while (j < u8.length && u8[j] !== 0x3e && u8[j] !== 0x20 && u8[j] !== 0x2f) name += String.fromCharCode(u8[j++]);
        if (u8[pos + 1] === 0x2f) {
          // a closing tag that was written out in full (id >= 256)
          const id = stack.pop();
          while (j < u8.length && u8[j] !== 0x3e) j++;
          out += "</" + (names[id] || "") + ">";
          pos = j + 1;
          continue;
        }
        names.push(name);
        stack.push(names.length - 1);
        out += "<";
        pos++;
        continue;
      }
      if (b === 0x0e) {
        const id = u8[pos + 1];
        const popped = stack.pop();
        if (popped !== id) throw new Error("tag table mismatch");
        out += "</" + names[id] + ">";
        pos += 2;
        continue;
      }
      if (mode === "full") {
        if (b >= 1 && b <= 7 && pos + 1 < u8.length) {
          const uc = (b << 8) | u8[pos + 1];
          if (uc >= 0x80) {
            out += String.fromCharCode(uc);
            pos += 2;
            continue;
          }
        } else if (b === 0 && u8[pos + 1] >= 0x80) {
          out += String.fromCharCode(u8[pos + 1]);
          pos += 2;
          continue;
        } else if (b === 0x80 && pos + 2 < u8.length) {
          const uc = (u8[pos + 1] << 8) | u8[pos + 2];
          if (uc >= 0x800 && !(uc >= 0xd800 && uc < 0xe000)) {
            out += String.fromCharCode(uc);
            pos += 3;
            continue;
          }
        } else if (b === 0x08 && pos + 3 < u8.length) {
          const uc = (u8[pos + 1] << 16) | (u8[pos + 2] << 8) | u8[pos + 3];
          if (uc >= 0x10000 && uc <= 0x10ffff) {
            out += String.fromCodePoint(uc);
            pos += 4;
            continue;
          }
        }
      }
      if (b >= 0x80 || (b < 0x20 && b !== 9 && b !== 10 && b !== 13)) out += String.fromCharCode(PUA + b);
      else out += String.fromCharCode(b);
      pos++;
    }
    return { text: out, header };
  }

  /** Try full -> raw decoding; keep the first one that re-encodes to identical bytes. */
  function decodeXmlLossless(u8) {
    for (const mode of ["full", "raw"]) {
      try {
        const { text, header } = decodeXml(u8, mode);
        if (equal(encodeXml(text, mode, header), u8)) return { text, header, mode };
      } catch (e) {
        /* try the next mode */
      }
    }
    return null;
  }

  // ---- zip container ---------------------------------------------------------------

  const u16 = (n) => Uint8Array.of(n & 255, (n >> 8) & 255);
  const u32 = (n) => Uint8Array.of(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255);

  function writeZip(entries, version) {
    const parts = [];
    let offset = 0;
    const central = [];
    entries.forEach((e, idx) => {
      const name = ascii(unescape(encodeURIComponent(e.name))); // utf-8 bytes
      const magic = idx === 0 ? concat([ascii("*TIMLP"), ascii(version)]) : Uint8Array.of(0x50, 0x4b, 3, 4);
      const local = concat([magic, u16(20), u16(0), u16(e.method), u16(0), u16(0x20), u32(e.crc), u32(e.data.length), u32(e.usize), u16(name.length), u16(0), name, e.data]);
      central.push(concat([Uint8Array.of(0x50, 0x4b, 1, 2), u16(0), u16(20), u16(0), u16(e.method), u16(0), u16(0x20), u32(e.crc), u32(e.data.length), u32(e.usize), u16(name.length), u16(0), u16(0), u16(0), u16(e.method === 8 ? 1 : 0), u32(0), u32(offset), name]));
      parts.push(local);
      offset += local.length;
    });
    const cd = concat(central);
    parts.push(cd);
    parts.push(concat([ascii("TIPD"), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(cd.length), u32(offset), u16(0)]));
    return concat(parts);
  }

  function readZip(u8) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) {
      if (startsWith(u8, "TIPD", i) || (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 5 && u8[i + 3] === 6)) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error("This does not look like a .tns file (end-of-archive marker not found).");
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    let version = "0500";
    const entries = [];
    for (let n = 0; n < count; n++) {
      if (!(u8[p] === 0x50 && u8[p + 1] === 0x4b && u8[p + 2] === 1 && u8[p + 3] === 2)) throw new Error("Damaged .tns: bad directory entry " + (n + 1) + ".");
      const method = dv.getUint16(p + 10, true),
        csize = dv.getUint32(p + 20, true),
        usize = dv.getUint32(p + 24, true),
        nlen = dv.getUint16(p + 28, true),
        xlen = dv.getUint16(p + 30, true),
        clen = dv.getUint16(p + 32, true),
        lofs = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      let h = lofs;
      if (startsWith(u8, "*TIMLP", h)) {
        version = latin1(u8.subarray(h + 6, h + 10));
        h += 10;
      } else if (u8[h] === 0x50 && u8[h + 1] === 0x4b && u8[h + 2] === 3 && u8[h + 3] === 4) h += 4;
      else throw new Error("Damaged .tns: bad file header for " + name + ".");
      const lnlen = dv.getUint16(h + 22, true),
        lxlen = dv.getUint16(h + 24, true);
      const start = h + 26 + lnlen + lxlen;
      entries.push({ name, method, usize, data: u8.subarray(start, start + csize) });
      p += 46 + nlen + xlen + clen;
    }
    return { version, entries };
  }

  // ---- public API ---------------------------------------------------------------------

  /**
   * Open a .tns.
   * Each returned file is one of
   *   { name, kind:"xml",    text, mode, header }   editable XML (Problem1.xml ...)
   *   { name, kind:"opaque", data }                 XML we cannot decrypt; kept as-is
   *   { name, kind:"binary", data }                 images etc.
   */
  async function read(bytes) {
    const { version, entries } = readZip(bytes);
    const files = [];
    for (const e of entries) {
      if (e.method === 13) {
        let file = { name: e.name, kind: "opaque", data: e.data };
        if (e.data.length > TIEN_HEADER.length && equal(e.data.subarray(0, TIEN_HEADER.length), TIEN_HEADER)) {
          try {
            const xmlc = await codec.inflateRaw(xorKeystream(e.data.subarray(TIEN_HEADER.length)));
            const d = decodeXmlLossless(xmlc);
            if (d) file = { name: e.name, kind: "xml", text: d.text, mode: d.mode, header: d.header };
          } catch (err) {
            /* leave it opaque */
          }
        }
        files.push(file);
      } else if (e.method === 8) files.push({ name: e.name, kind: "binary", data: await codec.inflateRaw(e.data) });
      else if (e.method === 0) files.push({ name: e.name, kind: "binary", data: e.data });
      else files.push({ name: e.name, kind: "opaque", data: e.data, method: e.method });
    }
    return { version, files };
  }

  async function encryptXmlc(xmlc) {
    const def = await codec.deflateRaw(xmlc);
    return concat([TIEN_HEADER, xorKeystream(def)]);
  }

  /**
   * Save a .tns. doc = { version?, files: [...] } with files as returned by read(),
   * plus  { name, kind:"xmlc", data }  for already-compressed XML (Lua documents).
   * A stock Document.xml is added when none is given.
   */
  async function write(doc) {
    const files = doc.files.slice();
    if (!files.some((f) => f.name === "Document.xml")) files.unshift({ name: "Document.xml", kind: "opaque", data: DEFAULT_DOCUMENT });
    else files.sort((a, b) => (a.name === "Document.xml" ? -1 : b.name === "Document.xml" ? 1 : 0)); // Document.xml must come first
    const entries = [];
    for (const f of files) {
      let data, method, usize;
      if (f.kind === "xml") {
        data = await encryptXmlc(encodeXml(f.text, f.mode || "full", f.header));
        method = 13;
        usize = data.length;
      } else if (f.kind === "xmlc") {
        data = await encryptXmlc(f.data);
        method = 13;
        usize = data.length;
      } else if (f.kind === "opaque") {
        data = f.data;
        method = f.method == null ? 13 : f.method;
        usize = f.usize == null ? data.length : f.usize;
      } else {
        data = await codec.deflateRaw(f.data);
        method = 8;
        usize = f.data.length;
      }
      // method 13 is stored as-is, so its checksum covers the stored bytes (as Luna does)
      entries.push({ name: f.name, method, data, usize, crc: crc32(method === 8 ? f.data : data) });
    }
    return writeZip(entries, doc.version || "0500");
  }

  // ---- Lua documents ---------------------------------------------------------------

  /** A TI-Nspire document whose single page runs this Lua script (OS 3.0.2+). */
  function newLuaDocument(luaSource) {
    let body = enc.encode(String(luaSource));
    // "]]>" would end the CDATA section early, so split it across two sections as Luna does:
    // "]]>" becomes "]]" + "]]><![CDATA[" + ">"
    const s = latin1(body).split("]]>").join("]]]]><![CDATA[>");
    body = ascii(s);
    return { version: "0500", files: [{ name: "Problem1.xml", kind: "xmlc", data: concat([LUA_HEADER, body, LUA_FOOTER]) }] };
  }

  /** Pull the Lua script out of a document that has one (or null). */
  function luaFromDocument(doc) {
    for (const f of doc.files) {
      if (f.kind !== "xml") continue;
      const m = /<sc:script[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/sc:script>/.exec(f.text.replace(/\]\]><!\[CDATA\[/g, ""));
      if (m) return { file: f.name, source: bytesToUtf8(m[1]) };
    }
    return null;
  }
  function bytesToUtf8(s) {
    // CDATA bytes >= 0x80 are shown as PUA characters in "raw" mode: turn them back into UTF-8
    const bytes = [];
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if (c >= PUA && c <= PUA + 0xff) bytes.push(c - PUA);
      else for (const b of enc.encode(ch)) bytes.push(b);
    }
    return dec.decode(Uint8Array.from(bytes));
  }

  /** Replace the Lua script in a document read with read(). */
  function replaceLua(doc, source) {
    const out = newLuaDocument(source);
    const keep = doc.files.filter((f) => !(f.kind === "xml" && /<sc:script/.test(f.text)));
    return { version: doc.version, files: [...keep, ...out.files] };
  }

  // ---- Python documents (TI-Nspire CX II, OS 5.2+) ----------------------------------

  const PY_HEADER =
    'TIXC0100-1.0?><prob xmlns="urn:TI.Problem" ver="1.0" pbname=""><sym>\x0E\x01<card clay="0" h1="10000" h2="10000" w1="10000" w2="10000"><isDummyCard>0\x0E\x03<flag>0\x0E\x04<wdgt xmlns:py="urn:TI.PythonEditor" type="TI.PythonEditor" ver="1.0"><py:data><py:name>';
  const PY_FOOTER = "\x0E\x07<py:dirf>-10000000\x0E\x08\x0E\x06<py:mFlags>1024\x0E\x09<py:value>10\x0E\x0A\x0E\x05\x0E\x02\x0E\x00";

  /** The Problem1.xml that makes a document open the Python editor on `filename`. */
  function pythonProblemFile(filename) {
    if (!/^[\w .\-]{1,240}$/.test(filename) || /[<>&"]/.test(filename)) throw new Error("Use a simple file name for the Python script, e.g. program.py");
    return { name: "Problem1.xml", kind: "xmlc", data: ascii(PY_HEADER + filename + PY_FOOTER) };
  }

  /** A document that opens a Python script (the script is stored as its own file). */
  function newPythonDocument(filename, source) {
    return { version: "0500", files: [pythonProblemFile(filename), { name: filename, kind: "binary", data: enc.encode(String(source)) }] };
  }

  // ---- no-code Lua apps: a notes viewer and flashcards ------------------------------
  //
  // The Lua below is a fixed, tested "engine". Only the data tables at the top change, so
  // text is wrapped to the screen width and long pages continue on the next screen
  // automatically (the usual cause of text running off the bottom, or "only one page").

  const THEMES = {
    dark: { bg: [18, 25, 42], head: [70, 200, 255], body: [235, 240, 250], sub: [255, 200, 90], hint: [100, 255, 160] },
    light: { bg: [255, 255, 255], head: [0, 80, 160], body: [25, 25, 25], sub: [170, 70, 0], hint: [0, 120, 60] },
  };

  const LUA_COMMON = `
local FONT = "sansserif"
local BODY, HEAD, LINE_H = 9, 12, 14
local idx = 1

local function setf(gc, style, size) gc:setFont(FONT, style, size) end
local function color(gc, c) gc:setColorRGB(c[1], c[2], c[3]) end

-- Break one long line into several lines that fit in maxw pixels.
local function wrap(gc, text, maxw, rows, style)
  setf(gc, style, BODY)
  if text == "" then rows[#rows + 1] = { t = "", s = style }; return end
  local line = ""
  for word in string.gmatch(text, "%S+") do
    local try = word
    if line ~= "" then try = line .. " " .. word end
    if gc:getStringWidth(try) <= maxw then
      line = try
    else
      if line ~= "" then rows[#rows + 1] = { t = line, s = style }; line = "" end
      -- a single word wider than the screen: cut it into pieces
      while gc:getStringWidth(word) > maxw and #word > 1 do
        local n = #word
        while n > 1 and gc:getStringWidth(string.sub(word, 1, n)) > maxw do n = n - 1 end
        rows[#rows + 1] = { t = string.sub(word, 1, n), s = style }
        word = string.sub(word, n + 1)
      end
      line = word
    end
  end
  if line ~= "" then rows[#rows + 1] = { t = line, s = style } end
end

local function fit(gc, text, maxw, style, size)
  setf(gc, style, size)
  while #text > 1 and gc:getStringWidth(text) > maxw do text = string.sub(text, 1, #text - 1) end
  return text
end
`;

  const LUA_NOTES = `
local screens = nil

-- Turn every page into one or more screens that fit the display.
local function build(gc)
  local w, h = platform.window:width(), platform.window:height()
  local maxw = w - 20
  local rowsPer = math.floor((h - 30 - 24) / LINE_H)
  if rowsPer < 3 then rowsPer = 3 end
  screens = {}
  for p = 1, #PAGES do
    local rows = {}
    for _, src in ipairs(PAGES[p].lines) do
      if string.sub(src, 1, 2) == "# " then wrap(gc, string.sub(src, 3), maxw, rows, "b")
      else wrap(gc, src, maxw, rows, "r") end
    end
    local parts = math.max(1, math.ceil(#rows / rowsPer))
    local part = 1
    for first = 1, math.max(1, #rows), rowsPer do
      local scr = { title = PAGES[p].title, part = part, parts = parts, rows = {} }
      for i = first, math.min(first + rowsPer - 1, #rows) do scr.rows[#scr.rows + 1] = rows[i] end
      screens[#screens + 1] = scr
      part = part + 1
    end
  end
  if idx > #screens then idx = 1 end
end

function on.paint(gc)
  if not screens then build(gc) end
  local w, h = platform.window:width(), platform.window:height()
  color(gc, THEME.bg); gc:fillRect(0, 0, w, h)
  local s = screens[idx]
  local title = s.title
  if s.parts > 1 then title = title .. " (" .. s.part .. "/" .. s.parts .. ")" end
  color(gc, THEME.head)
  gc:drawString(fit(gc, title, w - 20, "b", HEAD), 10, 6, "top")
  local y = 30
  for _, r in ipairs(s.rows) do
    if r.s == "b" then setf(gc, "b", BODY); color(gc, THEME.sub)
    else setf(gc, "r", BODY); color(gc, THEME.body) end
    if r.t ~= "" then gc:drawString(r.t, 10, y, "top") end
    y = y + LINE_H
  end
  setf(gc, "r", BODY); color(gc, THEME.hint)
  gc:drawString("< > change page    " .. idx .. " of " .. #screens, 10, h - 18, "top")
end

local function go(d)
  if not screens then return end
  idx = (idx - 1 + d) % #screens + 1
  platform.window:invalidate()
end
function on.arrowRight() go(1) end
function on.arrowDown() go(1) end
function on.enterKey() go(1) end
function on.arrowLeft() go(-1) end
function on.arrowUp() go(-1) end
function on.escapeKey() idx = 1; platform.window:invalidate() end
function on.resize() screens = nil end
`;

  const LUA_CARDS = `
local show = false

function on.paint(gc)
  local w, h = platform.window:width(), platform.window:height()
  local maxw = w - 20
  local rowsPer = math.floor((h - 30 - 24) / LINE_H)
  if rowsPer < 3 then rowsPer = 3 end
  color(gc, THEME.bg); gc:fillRect(0, 0, w, h)
  color(gc, THEME.head)
  gc:drawString(fit(gc, TITLE .. "  " .. idx .. "/" .. #CARDS, w - 20, "b", HEAD), 10, 6, "top")
  local card = CARDS[idx]
  local rows = {}
  wrap(gc, card.q, maxw, rows, "b")
  if show then
    rows[#rows + 1] = { t = "", s = "r" }
    wrap(gc, card.a, maxw, rows, "r")
  end
  local y = 30
  for i = 1, math.min(#rows, rowsPer) do
    local r = rows[i]
    if r.s == "b" then setf(gc, "b", BODY); color(gc, THEME.sub)
    else setf(gc, "r", BODY); color(gc, THEME.body) end
    if r.t ~= "" then gc:drawString(r.t, 10, y, "top") end
    y = y + LINE_H
  end
  setf(gc, "r", BODY); color(gc, THEME.hint)
  local hint = "enter: show answer    < > next card"
  if show then hint = "enter: hide answer    < > next card" end
  gc:drawString(hint, 10, h - 18, "top")
end

local function go(d)
  idx = (idx - 1 + d) % #CARDS + 1
  show = false
  platform.window:invalidate()
end
local function toggle() show = not show; platform.window:invalidate() end
function on.arrowRight() go(1) end
function on.arrowLeft() go(-1) end
function on.enterKey() toggle() end
function on.arrowDown() toggle() end
function on.arrowUp() toggle() end
function on.escapeKey() idx = 1; show = false; platform.window:invalidate() end
`;

  const luaStr = (s) => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n").replace(/[\u0000-\u001f]/g, " ") + '"';

  /**
   * spec = { mode: "notes"|"cards", title, theme: "dark"|"light",
   *          items: [ { a: "page title" | "question", b: "text, one line per line" | "answer" } ] }
   * In notes, a line starting with "# " becomes a heading.
   */
  function luaViewer(spec) {
    const th = THEMES[spec.theme] || THEMES.dark;
    const rgb = (c) => "{" + c.join(", ") + "}";
    const items = (spec.items || []).filter((it) => String(it.a || "").trim() || String(it.b || "").trim());
    if (!items.length) throw new Error("Add at least one " + (spec.mode === "cards" ? "card" : "page") + " first.");
    const head =
      "-- " + String(spec.title || "CAS OS app").replace(/[\r\n]+/g, " ") + " (made with CAS OS)\n" +
      "-- Edit the text between the quotes. Keep each line in quotes and followed by a comma.\n" +
      "local TITLE = " + luaStr(spec.title || "Notes") + "\n" +
      "local THEME = { bg = " + rgb(th.bg) + ", head = " + rgb(th.head) + ", body = " + rgb(th.body) + ", sub = " + rgb(th.sub) + ", hint = " + rgb(th.hint) + " }\n";
    if (spec.mode === "cards") {
      const cards = items.map((it) => "  { q = " + luaStr(String(it.a).trim()) + ", a = " + luaStr(String(it.b).trim()) + " },").join("\n");
      return head + "local CARDS = {\n" + cards + "\n}\n" + LUA_COMMON + LUA_CARDS;
    }
    const pages = items
      .map((it) => {
        const lines = String(it.b || "").replace(/\r/g, "").split("\n").map((l) => "    " + luaStr(l.replace(/\s+$/, "")) + ",");
        return "  { title = " + luaStr(String(it.a).trim() || "Page") + ", lines = {\n" + lines.join("\n") + "\n  } },";
      })
      .join("\n");
    return head + "local PAGES = {\n" + pages + "\n}\n" + LUA_COMMON + LUA_NOTES;
  }

  const luaString = (s) =>
    '"' +
    String(s)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, "\\n")
      .replace(/[\u0000-\u001f]/g, " ") +
    '"';

  /**
   * Build a Lua program that shows a CAS OS document (calculator rows, notes, code)
   * on a TI-Nspire: up/down scrolls, left/right changes page. Plain text only.
   */
  function luaFromCasDoc(doc) {
    const pages = (doc.pages || []).map((p, i) => {
      const lines = [];
      if (p.kind === "calculator") for (const r of p.rows || []) if (r.input) lines.push(r.input + (r.output ? "   =>   " + r.output : ""));
      if (p.kind === "graph") lines.push("f(x) = " + (p.formula || ""));
      if (p.kind === "python") {
        lines.push(...String(p.code || "").split(/\r?\n/));
        if (p.output) lines.push("-> " + String(p.output).split(/\r?\n/).join(" / "));
      }
      if (p.kind === "tutor") {
        if (p.question) lines.push("Q: " + p.question);
        if (p.answer) lines.push(...String(p.answer).split(/\r?\n/));
      }
      if (typeof p.text === "string") lines.push(...p.text.split(/\r?\n/));
      return "  { title = " + luaString(i + 1 + ". " + (p.title || p.kind)) + ", lines = {\n" + lines.map((l) => "    " + luaString(l) + ",").join("\n") + "\n  } },";
    });
    return [
      "-- " + String(doc.name || "CAS OS document") + " (exported from CAS OS)",
      "local pages = {",
      pages.join("\n") || '  { title = "Empty", lines = {} },',
      "}",
      "local page, top = 1, 0",
      "local function lines() return pages[page].lines end",
      "function on.paint(gc)",
      '  gc:setFont("sansserif", "r", 10)',
      "  gc:setColorRGB(0, 0, 0)",
      '  gc:drawString(pages[page].title .. "   (" .. page .. "/" .. #pages .. ")", 6, 2, "top")',
      "  gc:drawLine(0, 20, platform.window:width(), 20)",
      "  local y = 24",
      "  for i = top + 1, #lines() do",
      "    if y > platform.window:height() - 14 then break end",
      '    gc:drawString(lines()[i], 6, y, "top")',
      "    y = y + 16",
      "  end",
      "end",
      "function on.arrowDown() if top < #lines() - 1 then top = top + 1 end platform.window:invalidate() end",
      "function on.arrowUp() if top > 0 then top = top - 1 end platform.window:invalidate() end",
      "function on.arrowRight() if page < #pages then page = page + 1 top = 0 end platform.window:invalidate() end",
      "function on.arrowLeft() if page > 1 then page = page - 1 top = 0 end platform.window:invalidate() end",
      "",
    ].join("\n");
  }

  return { luaViewer, THEMES, read, write, setCodec, newLuaDocument, newPythonDocument, pythonProblemFile, luaFromDocument, replaceLua, luaFromCasDoc, encodeXml, decodeXml, decodeXmlLossless, crc32 };
});
