-- Index laws and logs (made with CAS OS)
-- Edit the text between the quotes. Keep each line in quotes and followed by a comma.
local TITLE = "Index laws and logs"
local THEME = { bg = {18, 25, 42}, head = {70, 200, 255}, body = {235, 240, 250}, sub = {255, 200, 90}, hint = {100, 255, 160} }
local PAGES = {
  { title = "INDEX LAWS", lines = {
    "# Multiply and divide",
    "a^m * a^n = a^(m+n)",
    "a^m / a^n = a^(m-n)",
    "",
    "# Powers",
    "(a^m)^n = a^(mn)",
    "a^0 = 1",
    "a^(-n) = 1/a^n",
  } },
  { title = "LOG LAWS", lines = {
    "# Laws",
    "log_b(MN) = log_b(M) + log_b(N)",
    "log_b(M/N) = log_b(M) - log_b(N)",
    "log_b(M^k) = k log_b(M)",
    "",
    "WARNING: log(M+N) is NOT log(M) + log(N)",
  } },
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
