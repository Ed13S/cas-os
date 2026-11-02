# CAS OS

A TI-Nspire-style student calculator that runs in the browser. No build step, no server: open `index.html` (or host the folder on GitHub Pages).

- **CAS maths:** solve, factor, expand, simplify, derivatives, integrals, limits, logs and more, with a menu laid out like the TI-Nspire CX II CAS.
- **Graphs:** up to four functions, zoom, auto zoom, trace, and automatic intercepts, turning points and intersections.
- **TI-Nspire files:** open, edit and create `.tns` files, including a no-code Notes / Flashcards builder that produces a Lua app for the calculator.
- **AI tutor:** plain-English maths questions go to an OpenRouter model.

## Quick start

```
git clone https://github.com/Ed13S/cas-os.git
cd cas-os
npm install          # only needed for the tests
python3 -m http.server 8000
```

Then open http://localhost:8000. The page loads math.js and Algebrite from a CDN, so it needs an internet connection the first time.

## Using it

**Calculator page.** Type and press Enter. Missing closing brackets are added for you (`solve(x^2=4` works) and the row shows a note saying what was added. Typos and everyday words are understood: `factorise x^2-9`, `differentate x^3`, `what is the derivative of x^2`. Press **menu** for the command list.

| Area | Commands |
|---|---|
| Algebra | `solve`, `nSolve`, `zeros`, `factor`, `expand`, `simplify`, `completeSquare` |
| Calculus | `diff(f,x)`, `diff(f,x,2)`, `integral(f,x)`, `integral(f,x,a,b)`, `limit(f,x,a)`, `fMin`, `fMax`, `tangentLine`, `arcLen` |
| Number | `approx`, `approxFraction`, `gcd`, `lcm`, `remainder`, `5!` |
| Probability and statistics | `nPr`, `nCr`, `randInt`, `mean`, `median`, `stdDev`, `variance` |
| Matrices | `det`, `inv`, `transpose`, `[1,2;3,4]` |
| Logs | `log(x)` base 10, `ln(x)`, `log_2(x)` any base |

Anything that reads like a sentence is sent to the AI tutor.

**Graph page.** One function per line. **＋/－** or the mouse wheel zoom, **Standard** resets to -10..10, **Auto zoom** fits the interesting points, **Square** equalises the axes. **Mode: Pan** drags the graph, **Mode: Trace** follows your finger or mouse (arrow keys also work) and snaps to special points. Intercepts, minima/maxima and intersections are marked and listed.

**TI-Nspire files.** Use **Docs → Open .tns / Export .tns**, or add a *Calculator app: Notes* or *Flashcards* page, type your content, and export. Copy the `.tns` to the calculator with the TI-Nspire software. The *TI-Nspire file (advanced)* page edits Lua and Python scripts inside `.tns` files made by CAS OS.

Limits: the Notes, Calculator and Lua pages inside `.tns` files saved by TI's own software are encrypted, so CAS OS cannot read or edit them. Python files (`.py`) inside a TI-made document are not encrypted, so CAS OS can open, edit and re-save those. It can open and edit only `.tns` files it made itself. To change an existing TI file, edit it in the TI-Nspire software and paste text in from CAS OS.

See [USER_MANUAL.md](USER_MANUAL.md) for more detail.

## AI tutor key

Put an OpenRouter key in `config.js`:

```js
window.CAS_CONFIG = { openrouterKey: "sk-or-..." };
```

The site is public, so anyone can read that file. Use a key with a low spending limit and never reuse a key that has been exposed.

## Project layout

| File | Purpose |
|---|---|
| `index.html`, `style.css`, `app.js` | The calculator interface |
| `engine.js` | Parses input, repairs brackets, picks the command, runs it (pure logic, tested in Node) |
| `graph.js` | Graph maths and canvas view |
| `tns.js`, `tns-constants.js` | `.tns` reader/writer and the Lua viewer generator |
| `docs/gemini-gem/` | Instructions and templates for a Gemini Gem that writes TI-Nspire Lua |
| `tools/` | Script that regenerates the Gem files |
| `legacy/` | Old unused modules, kept for reference |
| `tests/` | Engine, graph, `.tns` and Lua tests |

## Tests

```
npm test
```

Covers the engine, graphing, `.tns` files (compared against the Luna reference writer) and the generated Lua (run in a Lua interpreter with a mock Nspire API). Not tested: a real calculator.

## Credits

[math.js](https://mathjs.org) and [Algebrite](http://algebrite.org) do the maths. The `.tns` writer follows [Luna](https://github.com/ndless-nspire/Luna) (MPL 1.1).

## Send to your calculator over USB

Click **⇄ Calculator** in the top bar (Chrome or Edge only), plug in the calculator and press **Connect calculator**.

- **Send file(s)** copies any files into the folder you are viewing. Existing files are never replaced without asking.
- **＋ New folder** makes a folder (nested names like `Maths/Week 1` work). Click a folder to open it, **⬆ Up** to go back.
- **Send a folder** uploads a whole folder from your computer, keeping its sub-folders.
- **Send to calculator** buttons sit beside **Save as .tns** in the notes builder and the .tns editor.
- **Install all UDFs** sends `Install UDFs.tns`. Open it on the calculator, press any key, and every `Define` line from `docs/udfs/udfs.txt` is defined for you. This is experimental (not yet tried on real hardware); fallback: *Copy Program Editor installer text*, paste it into one new program, run `installudfs()`.

Native Calculator pages made by TI software are encrypted, so CAS OS cannot write them. That is why UDFs go in via an installer.

The USB code in `vendor/nspirelink/` is GPL-3.0-or-later (see its LICENSE). It has only been tested against a simulator.
