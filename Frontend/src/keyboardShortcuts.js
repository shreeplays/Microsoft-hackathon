console.log("Keyboard Shortcuts Loaded")

document.addEventListener("keydown", function(e){

  function _getActiveWrapper() {
    const activePane = document.querySelector(".pane.active")
    if (!activePane) return "diagram-wrapper"
    const id = activePane.id.replace("pane-", "diagram-")
    return id === "diagram-flowchart" ? "diagram-wrapper" : id
  }

  // Shift + + Zoom In
  if (e.shiftKey && e.key === "+") {
    e.preventDefault()
    if (globalThis.DiagramNavigator && globalThis.DiagramNavigator.zoomIn) {
      globalThis.DiagramNavigator.zoomIn(_getActiveWrapper())
    }
  }

  // Shift + _ Zoom Out
  if (e.shiftKey && e.key === "_") {
    e.preventDefault()
    if (globalThis.DiagramNavigator && globalThis.DiagramNavigator.zoomOut) {
      globalThis.DiagramNavigator.zoomOut(_getActiveWrapper())
    }
  }

  // Shift + R Reset Zoom
  if (e.shiftKey && e.key === "R") {
    e.preventDefault()
    if (globalThis.DiagramNavigator && globalThis.DiagramNavigator.resetZoom) {
      globalThis.DiagramNavigator.resetZoom(_getActiveWrapper())
    }
  }

  // Shift + D Toggle Dark Mode
  if(e.shiftKey && e.key === "D"){
    e.preventDefault()
    if(globalThis.toggleTheme){
      toggleTheme()
    }
  }

  // Shift + F Fullscreen
  if(e.shiftKey && e.key === "F"){
    e.preventDefault()
    if(globalThis.toggleFullscreen){
      toggleFullscreen()
    }
  }

  // Ctrl + K Command Palette
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault()
    if (globalThis.CommandPalette) {
      globalThis.CommandPalette.show()
    }
  }

  // Shift + A Accessibility Toggle
  if (e.shiftKey && e.key === "A") {
    e.preventDefault()
    if (globalThis.AccessibilityManager) {
      globalThis.AccessibilityManager.toggleHighContrast()
    }
  }

  // Shift + P Performance HUD Toggle
  if (e.shiftKey && e.key === "P") {
    e.preventDefault()
    if (globalThis.PerformanceMonitor) {
      globalThis.PerformanceMonitor.toggle()
    }
  }

  // Shift + M Code Metrics Toggle
  if (e.shiftKey && e.key === "M") {
    e.preventDefault()
    if (globalThis.CodeMetrics && globalThis.CodeMetrics.toggle) {
      globalThis.CodeMetrics.toggle()
    }
  }

  // Shift + E Export PNG
  if (e.shiftKey && e.key === "E") {
    e.preventDefault()
    if (globalThis.DiagramExporter && globalThis.DiagramExporter.exportAsPng) {
      globalThis.DiagramExporter.exportAsPng("diagram-flowchart")
    }
  }

  // Shift + S Fit to Screen
  if (e.shiftKey && e.key === "S") {
    e.preventDefault()
    if (globalThis.DiagramNavigator && globalThis.DiagramNavigator.fitToScreen) {
      globalThis.DiagramNavigator.fitToScreen()
    }
  }

  // Shift + C Clear Search Highlights
  if (e.shiftKey && e.key === "C") {
    e.preventDefault()
    document.querySelectorAll(".highlight-node").forEach(function(n) {
      n.classList.remove("highlight-node")
    })
  }

  // Shift + T Toggle Tooltips
  if (e.shiftKey && e.key === "T") {
    e.preventDefault()
    if (globalThis.TooltipEngine && globalThis.TooltipEngine.toggle) {
      globalThis.TooltipEngine.toggle()
    }
  }

  // Shift + G Toggle Animations
  if (e.shiftKey && e.key === "G") {
    e.preventDefault()
    if (globalThis.AnimationEngine && globalThis.AnimationEngine.toggle) {
      globalThis.AnimationEngine.toggle()
    }
  }

  // Shift + N Toggle Annotations
  if (e.shiftKey && e.key === "N") {
    e.preventDefault()
    if (globalThis.DiagramAnnotations && globalThis.DiagramAnnotations.toggle) {
      globalThis.DiagramAnnotations.toggle()
    }
  }

  // Shift + H Show Shortcuts Modal
  if (e.shiftKey && e.key === "H") {
    e.preventDefault()
    if (globalThis.showShortcuts) {
      globalThis.showShortcuts()
    }
  }

})