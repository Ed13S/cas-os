-- Logs quiz (made with CAS OS)
-- Edit the text between the quotes. Keep each line in quotes and followed by a comma.
local TITLE = "Logs quiz"
local THEME = { bg = {18, 25, 42}, head = {70, 200, 255}, body = {235, 240, 250}, sub = {255, 200, 90}, hint = {100, 255, 160} }
local CARDS = {
  { q = "log_b(1) = ?", a = "0" },
  { q = "log_b(b) = ?", a = "1" },
  { q = "What is log(M*N) as a sum?", a = "log(M) + log(N)" },
}

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
