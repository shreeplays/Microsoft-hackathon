console.log("UI Enhancements Loaded")

/* -------------------------------
   Dark / Light Mode
--------------------------------*/

function toggleTheme(){

  const body = document.body

  const isLight =
    body.classList.contains("light-mode")

  if(isLight){
    body.classList.remove("light-mode")
    localStorage.setItem("code2flow-theme","dark")
  }
  else{
    body.classList.add("light-mode")
    localStorage.setItem("code2flow-theme","light")
  }

}

/* -------------------------------
   Fullscreen Mode
--------------------------------*/

function toggleFullscreen(){

  const body = document.body

  body.classList.toggle("fullscreen-mode")

}

/* -------------------------------
   Load saved theme
--------------------------------*/

function loadTheme(){

  const saved =
    localStorage.getItem("code2flow-theme")

  if(saved === "light"){
    document.body.classList.add("light-mode")
  }

}



/* -------------------------------
   Shortcuts Modal
--------------------------------*/

var _shortcutsVisible = false

function showShortcuts() {
  if (_shortcutsVisible) { hideShortcuts(); return }

  const overlay = document.createElement("div")
  overlay.id = "shortcuts-modal-overlay"
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  `

  const modal = document.createElement("div")
  modal.id = "shortcuts-modal"
  modal.style.cssText = `
    width: 500px;
    max-width: 90vw;
    background: var(--bg2, #181825);
    border: 1px solid var(--border, #313244);
    border-radius: 12px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    overflow: hidden;
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  `

  if (!document.getElementById("modal-anim-style")) {
    const s = document.createElement("style")
    s.id = "modal-anim-style"
    s.textContent = `
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { 
        from { opacity: 0; transform: translateY(20px) scale(0.98); } 
        to { opacity: 1; transform: translateY(0) scale(1); } 
      }
    `
    document.head.appendChild(s)
  }

  modal.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
      <h2 style="font-size: 16px; font-weight: 600; color: var(--accent);">Keyboard Shortcuts</h2>
      <button onclick="hideShortcuts()" style="background:transparent; border:none; color:var(--fg2); cursor:pointer; font-size:18px;">&times;</button>
    </div>
    <div style="padding: 10px 20px 20px; max-height: 70vh; overflow-y: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tbody>
          ${_renderShortcutRow("Command Palette", "Ctrl + K")}
          ${_renderShortcutRow("Zoom In", "Shift +")}
          ${_renderShortcutRow("Zoom Out", "Shift _")}
          ${_renderShortcutRow("Reset Zoom", "Shift R")}
          ${_renderShortcutRow("Toggle Theme", "Shift D")}
          ${_renderShortcutRow("Toggle Fullscreen", "Shift F")}
          ${_renderShortcutRow("Accessibility Toggle", "Shift A")}
          ${_renderShortcutRow("Performance HUD", "Shift P")}
          ${_renderShortcutRow("Code Metrics", "Shift M")}
          ${_renderShortcutRow("Export PNG", "Shift E")}
          ${_renderShortcutRow("Fit to Screen", "Shift S")}
          ${_renderShortcutRow("Toggle Minimap", "Shift Q")}
          ${_renderShortcutRow("Toggle Tooltips", "Shift T")}
          ${_renderShortcutRow("Toggle Animations", "Shift G")}
          ${_renderShortcutRow("Toggle Annotations", "Shift N")}
          ${_renderShortcutRow("Clear Search", "Shift C")}
          ${_renderShortcutRow("Show Shortcuts", "Shift H")}
        </tbody>
      </table>
    </div>
    <div style="padding: 12px 20px; background: rgba(0,0,0,0.2); font-size: 11px; color: var(--fg2); text-align: center;">
      Press <kbd style="background:var(--bg); padding: 2px 5px; border-radius:3px; border:1px solid var(--border)">Esc</kbd> to close
    </div>
  `

  overlay.appendChild(modal)
  document.body.appendChild(overlay)

  _shortcutsVisible = true

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hideShortcuts()
  })

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === "Escape") {
      hideShortcuts()
      document.removeEventListener("keydown", escHandler)
    }
  }
  document.addEventListener("keydown", escHandler)
}

function _renderShortcutRow(label, key) {
  return `
    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
      <td style="padding: 12px 0; color: var(--fg2);">${label}</td>
      <td style="padding: 12px 0; text-align: right;">
        <kbd style="background: var(--bg); color: var(--accent); padding: 3px 7px; border-radius: 4px; border: 1px solid var(--border); font-family: monospace; font-size: 11px;">${key}</kbd>
      </td>
    </tr>
  `
}

function hideShortcuts() {
  const overlay = document.getElementById("shortcuts-modal-overlay")
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay)
  _shortcutsVisible = false
}

/* -------------------------------
   Expose globally
--------------------------------*/

globalThis.toggleTheme = toggleTheme
globalThis.toggleFullscreen = toggleFullscreen
globalThis.showShortcuts = showShortcuts
globalThis.hideShortcuts = hideShortcuts

window.addEventListener(
  "load",
  loadTheme
)