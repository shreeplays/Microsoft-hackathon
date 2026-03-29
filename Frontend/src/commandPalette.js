/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          Command Palette — AI Code Visualizer               ║
 * ║  Quick searchable command overlay (Ctrl+K)                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

console.log("Command Palette Loaded")

var _paletteVisible = false
var _paletteCommands = []

var PaletteCommands = [
  { id: "zoom-in", label: "Zoom In", category: "View", shortcut: "Shift +", action: function() { if (globalThis.zoomIn) globalThis.zoomIn() } },
  { id: "zoom-out", label: "Zoom Out", category: "View", shortcut: "Shift _", action: function() { if (globalThis.zoomOut) globalThis.zoomOut() } },
  { id: "zoom-reset", label: "Reset Zoom", category: "View", shortcut: "Shift R", action: function() { if (globalThis.resetZoom) globalThis.resetZoom() } },
  { id: "fit-screen", label: "Fit to Screen", category: "View", action: function() { if (globalThis.DiagramNavigator) globalThis.DiagramNavigator.fitToScreen() } },
  { id: "toggle-theme", label: "Toggle Dark/Light Mode", category: "Appearance", shortcut: "Shift D", action: function() { if (globalThis.toggleTheme) globalThis.toggleTheme() } },
  { id: "toggle-fullscreen", label: "Toggle Fullscreen", category: "Appearance", shortcut: "Shift F", action: function() { if (globalThis.toggleFullscreen) globalThis.toggleFullscreen() } },
  { id: "toggle-minimap", label: "Toggle Minimap", category: "Navigation", action: function() { if (globalThis.DiagramNavigator) globalThis.DiagramNavigator.toggleMinimap() } },
  { id: "export-png", label: "Export as PNG", category: "Export", action: function() { if (globalThis.DiagramExporter) globalThis.DiagramExporter.exportAsPng("diagram-flowchart") } },
  { id: "export-svg", label: "Export as SVG", category: "Export", action: function() { if (globalThis.DiagramExporter) globalThis.DiagramExporter.exportAsSvg("diagram-flowchart") } },
  { id: "copy-clipboard", label: "Copy Diagram to Clipboard", category: "Export", action: function() { if (globalThis.DiagramExporter) globalThis.DiagramExporter.copyToClipboard("diagram-flowchart") } },
  { id: "export-all", label: "Export All Diagrams", category: "Export", action: function() { if (globalThis.DiagramExporter) globalThis.DiagramExporter.exportAll() } },
  { id: "tab-flowchart", label: "Show Flowchart", category: "Tabs", action: function() { _clickTab("flowchart") } },
  { id: "tab-architecture", label: "Show Architecture", category: "Tabs", action: function() { _clickTab("architecture") } },
  { id: "tab-sequence", label: "Show Sequence Diagram", category: "Tabs", action: function() { _clickTab("sequence") } },
  { id: "tab-class", label: "Show Class Diagram", category: "Tabs", action: function() { _clickTab("class") } },
  { id: "tab-callgraph", label: "Show Call Graph", category: "Tabs", action: function() { _clickTab("callgraph") } },
  { id: "tab-explanation", label: "Show Explanation", category: "Tabs", action: function() { _clickTab("explanation") } },
  { id: "focus-search", label: "Focus Search Input", category: "Navigation", action: function() { var s = document.getElementById("searchInput"); if (s) s.focus() } },
  { id: "clear-search", label: "Clear Search Highlights", category: "Navigation", action: function() { document.querySelectorAll(".highlight-node").forEach(function(n) { n.classList.remove("highlight-node") }) } },
  { id: "perf-toggle", label: "Toggle Performance HUD", category: "Debug", action: function() { if (globalThis.PerformanceMonitor) globalThis.PerformanceMonitor.toggle() } },
  { id: "a11y-toggle", label: "Toggle High Contrast", category: "Accessibility", action: function() { if (globalThis.AccessibilityManager) globalThis.AccessibilityManager.toggleHighContrast() } }
]

function _clickTab(name) {
  var tab = document.querySelector('.tab[data-tab="' + name + '"]')
  if (tab) tab.click()
}

function _fuzzyMatch(query, text) {
  query = query.toLowerCase()
  text = text.toLowerCase()
  if (text.includes(query)) return true
  var qi = 0
  for (var ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) qi++
  }
  return qi === query.length
}

function _fuzzyScore(query, text) {
  query = query.toLowerCase()
  text = text.toLowerCase()
  if (text === query) return 100
  if (text.startsWith(query)) return 80
  if (text.includes(query)) return 60
  var qi = 0, consecutive = 0, maxConsec = 0
  for (var ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) {
      qi++; consecutive++
      if (consecutive > maxConsec) maxConsec = consecutive
    } else { consecutive = 0 }
  }
  return qi === query.length ? 20 + maxConsec * 5 : 0
}

function showPalette() {
  if (_paletteVisible) { hidePalette(); return }

  var overlay = document.createElement("div")
  overlay.id = "command-palette-overlay"
  overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:flex-start;justify-content:center;padding-top:20vh;backdrop-filter:blur(2px)"

  var palette = document.createElement("div")
  palette.id = "command-palette"
  palette.style.cssText = "width:480px;max-width:90vw;background:var(--bg,#1e1e2e);border:1px solid var(--border,#313244);border-radius:10px;box-shadow:0 16px 64px rgba(0,0,0,0.6);overflow:hidden;animation:paletteIn 0.15s ease"

  // Inject animation
  if (!document.getElementById("palette-anim-style")) {
    var s = document.createElement("style")
    s.id = "palette-anim-style"
    s.textContent = "@keyframes paletteIn{from{opacity:0;transform:scale(0.95) translateY(-10px)}to{opacity:1;transform:scale(1) translateY(0)}}"
    document.head.appendChild(s)
  }

  var input = document.createElement("input")
  input.id = "command-palette-input"
  input.placeholder = "Type a command..."
  input.style.cssText = "width:100%;padding:14px 18px;background:transparent;border:none;border-bottom:1px solid var(--border,#313244);color:var(--fg,#cdd6f4);font-size:14px;outline:none;font-family:inherit"

  var list = document.createElement("div")
  list.id = "command-palette-list"
  list.style.cssText = "max-height:320px;overflow-y:auto;padding:6px"

  palette.appendChild(input)
  palette.appendChild(list)
  overlay.appendChild(palette)
  document.body.appendChild(overlay)

  _paletteVisible = true
  var selectedIndex = 0

  function renderList(query) {
    list.innerHTML = ""
    var filtered = PaletteCommands.filter(function(cmd) {
      if (!query) return true
      return _fuzzyMatch(query, cmd.label) || _fuzzyMatch(query, cmd.category)
    }).sort(function(a, b) {
      if (!query) return 0
      return _fuzzyScore(query, b.label) - _fuzzyScore(query, a.label)
    })

    selectedIndex = 0
    var currentCat = ""

    filtered.forEach(function(cmd, i) {
      if (cmd.category !== currentCat) {
        currentCat = cmd.category
        var catEl = document.createElement("div")
        catEl.textContent = currentCat
        catEl.style.cssText = "font-size:10px;font-weight:600;color:var(--fg2,#a6adc8);text-transform:uppercase;letter-spacing:0.05em;padding:8px 12px 4px;margin-top:4px"
        list.appendChild(catEl)
      }

      var item = document.createElement("div")
      item.className = "palette-item"
      item.setAttribute("data-index", String(i))
      item.style.cssText = "display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;cursor:pointer;transition:background 0.1s;font-size:13px;color:var(--fg,#cdd6f4)"

      if (i === selectedIndex) item.style.background = "rgba(137,180,250,0.15)"

      var lbl = document.createElement("span")
      lbl.textContent = cmd.label
      lbl.style.flex = "1"

      item.appendChild(lbl)

      if (cmd.shortcut) {
        var kbd = document.createElement("kbd")
        kbd.textContent = cmd.shortcut
        kbd.style.cssText = "font-size:10px;padding:2px 6px;background:var(--bg2,#181825);border:1px solid var(--border,#313244);border-radius:3px;color:var(--fg2,#a6adc8);font-family:monospace"
        item.appendChild(kbd)
      }

      item.addEventListener("mouseenter", function() {
        list.querySelectorAll(".palette-item").forEach(function(el) { el.style.background = "transparent" })
        item.style.background = "rgba(137,180,250,0.15)"
        selectedIndex = i
      })
      item.addEventListener("click", function() {
        hidePalette()
        cmd.action()
      })

      list.appendChild(item)
    })

    _paletteCommands = filtered
  }

  renderList("")
  input.focus()

  input.addEventListener("input", function() {
    renderList(input.value.trim())
  })

  input.addEventListener("keydown", function(e) {
    var items = list.querySelectorAll(".palette-item")
    if (e.key === "ArrowDown") {
      e.preventDefault()
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1)
      items.forEach(function(el, i) { el.style.background = i === selectedIndex ? "rgba(137,180,250,0.15)" : "transparent" })
      if (items[selectedIndex]) items[selectedIndex].scrollIntoView({ block: "nearest" })
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      selectedIndex = Math.max(selectedIndex - 1, 0)
      items.forEach(function(el, i) { el.style.background = i === selectedIndex ? "rgba(137,180,250,0.15)" : "transparent" })
      if (items[selectedIndex]) items[selectedIndex].scrollIntoView({ block: "nearest" })
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (_paletteCommands[selectedIndex]) {
        hidePalette()
        _paletteCommands[selectedIndex].action()
      }
    } else if (e.key === "Escape") {
      hidePalette()
    }
  })

  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) hidePalette()
  })
}

function hidePalette() {
  var overlay = document.getElementById("command-palette-overlay")
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay)
  _paletteVisible = false
}

function registerCommand(cmd) {
  PaletteCommands.push(cmd)
}

// Keyboard shortcut: Ctrl+K handled by keyboardShortcuts.js

globalThis.CommandPalette = {
  show: showPalette,
  hide: hidePalette,
  register: registerCommand,
  commands: PaletteCommands
}
