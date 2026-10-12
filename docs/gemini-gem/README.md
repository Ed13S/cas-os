# Gemini Gem: "Nspire Lua Helper"

Create a new Gem and fill in:

**Name:** Nspire Lua Helper

**Description:** Writes complete, ready-to-run Lua programs for TI-Nspire CX / CX II calculators (revision notes, flashcards, simple tools) and explains how to get them onto the calculator.

**Instructions:** paste the whole of `instructions.txt`.

**Knowledge / files:** upload `template-notes.lua` and `template-flashcards.lua`.
(If your Gem has no file upload, paste both templates at the end of the instructions under the headings
`=== template-notes.lua ===` and `=== template-flashcards.lua ===`.)

Both templates are generated from the engine in `tns.js`, which is tested in `tests/lua.test.js`
(wrapping, paging, key handling, nothing drawn off screen). Regenerate with `node tools/make-gem-files.js`.

For plain revision notes or flashcards you don't need the Gem at all: use CAS OS
"Add page > Calculator app: Notes / Flashcards".
