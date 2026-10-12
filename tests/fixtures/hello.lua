-- fixture: accents, and a "]]>" that must be split inside the CDATA section
local s = "caf\195\169 ]]> ok"
function on.paint(gc)
  gc:drawString("Hello é → ü", 10, 10, "top")
end
