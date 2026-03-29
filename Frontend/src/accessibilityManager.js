/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║        Accessibility Manager — AI Code Visualizer           ║
 * ║  A11y support, screen reader, high contrast, focus mgmt     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

console.log("Accessibility Manager Loaded")

var A11yConfig = {
  announceDelay: 100,
  focusTrapEnabled: false,
  highContrastEnabled: false,
  reducedMotionEnabled: false,
  fontSize: 13,
  fontSizeMin: 10,
  fontSizeMax: 22,
  fontSizeStep: 1
}

// ─── Live Region for Screen Reader Announcements ─────────────

function _ensureLiveRegion() {
  var region = document.getElementById("a11y-live-region")
  if (region) return region

  region = document.createElement("div")
  region.id = "a11y-live-region"
  region.setAttribute("role", "status")
  region.setAttribute("aria-live", "polite")
  region.setAttribute("aria-atomic", "true")
  region.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0"
  document.body.appendChild(region)
  return region
}

function announce(message, priority) {
  var region = _ensureLiveRegion()
  if (priority === "assertive") {
    region.setAttribute("aria-live", "assertive")
  } else {
    region.setAttribute("aria-live", "polite")
  }

  // Clear and re-set to trigger announcement
  region.textContent = ""
  setTimeout(function() {
    region.textContent = message
  }, A11yConfig.announceDelay)
}

// ─── High Contrast Mode ─────────────────────────────────────

function toggleHighContrast() {
  A11yConfig.highContrastEnabled = !A11yConfig.highContrastEnabled

  var styleId = "a11y-high-contrast-style"
  var existing = document.getElementById(styleId)

  if (A11yConfig.highContrastEnabled) {
    if (existing) return
    var style = document.createElement("style")
    style.id = styleId
    style.textContent = [
      ".a11y-high-contrast, .a11y-high-contrast * {",
      "  --bg: #000000 !important;",
      "  --bg2: #0a0a0a !important;",
      "  --fg: #ffffff !important;",
      "  --fg2: #e0e0e0 !important;",
      "  --accent: #ffff00 !important;",
      "  --border: #ffffff !important;",
      "  --success: #00ff00 !important;",
      "  --warning: #ffff00 !important;",
      "  --error: #ff4444 !important;",
      "}",
      ".a11y-high-contrast .tab.active {",
      "  border-bottom-color: #ffff00 !important;",
      "  color: #ffff00 !important;",
      "}",
      ".a11y-high-contrast .badge {",
      "  border: 2px solid currentColor !important;",
      "}",
      ".a11y-high-contrast .diagram-wrap {",
      "  border: 2px solid #ffffff !important;",
      "}",
      ".a11y-high-contrast svg text {",
      "  fill: #ffffff !important;",
      "}",
      ".a11y-high-contrast svg rect,",
      ".a11y-high-contrast svg polygon {",
      "  stroke: #ffffff !important;",
      "  stroke-width: 2px !important;",
      "}",
      ".a11y-high-contrast :focus {",
      "  outline: 3px solid #ffff00 !important;",
      "  outline-offset: 2px !important;",
      "}"
    ].join("\n")
    document.head.appendChild(style)
    document.body.classList.add("a11y-high-contrast")
    announce("High contrast mode enabled")
  } else {
    if (existing) existing.parentNode.removeChild(existing)
    document.body.classList.remove("a11y-high-contrast")
    announce("High contrast mode disabled")
  }
}

// ─── Reduced Motion ──────────────────────────────────────────

function toggleReducedMotion() {
  A11yConfig.reducedMotionEnabled = !A11yConfig.reducedMotionEnabled

  var styleId = "a11y-reduced-motion-style"
  var existing = document.getElementById(styleId)

  if (A11yConfig.reducedMotionEnabled) {
    if (existing) return
    var style = document.createElement("style")
    style.id = styleId
    style.textContent = [
      ".a11y-reduced-motion, .a11y-reduced-motion * {",
      "  animation-duration: 0.01ms !important;",
      "  animation-iteration-count: 1 !important;",
      "  transition-duration: 0.01ms !important;",
      "  scroll-behavior: auto !important;",
      "}"
    ].join("\n")
    document.head.appendChild(style)
    document.body.classList.add("a11y-reduced-motion")
    announce("Reduced motion enabled")
  } else {
    if (existing) existing.parentNode.removeChild(existing)
    document.body.classList.remove("a11y-reduced-motion")
    announce("Reduced motion disabled")
  }
}

// Auto-detect OS prefers-reduced-motion
if (typeof window !== "undefined" && window.matchMedia) {
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
  if (motionQuery.matches && !A11yConfig.reducedMotionEnabled) {
    toggleReducedMotion()
  }
}

// ─── Font Size Controls ──────────────────────────────────────

function increaseFontSize() {
  A11yConfig.fontSize = Math.min(A11yConfig.fontSize + A11yConfig.fontSizeStep, A11yConfig.fontSizeMax)
  _applyFontSize()
  announce("Font size: " + A11yConfig.fontSize + "px")
}

function decreaseFontSize() {
  A11yConfig.fontSize = Math.max(A11yConfig.fontSize - A11yConfig.fontSizeStep, A11yConfig.fontSizeMin)
  _applyFontSize()
  announce("Font size: " + A11yConfig.fontSize + "px")
}

function resetFontSize() {
  A11yConfig.fontSize = 13
  _applyFontSize()
  announce("Font size reset to default")
}

function _applyFontSize() {
  document.documentElement.style.fontSize = A11yConfig.fontSize + "px"
}

// ─── Focus Management ────────────────────────────────────────

function trapFocus(container) {
  if (!container) return null

  var focusable = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  var firstEl = focusable[0]
  var lastEl = focusable[focusable.length - 1]

  function handler(e) {
    if (e.key !== "Tab") return

    if (e.shiftKey) {
      if (document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      }
    } else {
      if (document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
  }

  container.addEventListener("keydown", handler)
  if (firstEl) firstEl.focus()

  return {
    release: function() {
      container.removeEventListener("keydown", handler)
    }
  }
}

// ─── ARIA Labels for Diagram Elements ────────────────────────

function labelDiagramNodes(containerId) {
  var container = document.getElementById(containerId || "diagram-flowchart")
  if (!container) return

  var svg = container.querySelector("svg")
  if (!svg) return

  svg.setAttribute("role", "img")
  svg.setAttribute("aria-label", "Code visualization diagram")

  var nodes = svg.querySelectorAll("g.node")
  nodes.forEach(function(node, index) {
    var label = node.textContent.trim()
    node.setAttribute("role", "button")
    node.setAttribute("aria-label", "Diagram node: " + label)
    node.setAttribute("tabindex", "0")

    // Keyboard support for nodes
    node.addEventListener("keydown", function(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        node.click()
        announce("Navigated to: " + label)
      }
    })
  })

  announce(nodes.length + " diagram nodes loaded")
}

// ─── Tab Navigation Enhancement ──────────────────────────────

function enhanceTabNavigation() {
  var tabs = document.querySelectorAll(".tab")
  tabs.forEach(function(tab, index) {
    tab.setAttribute("role", "tab")
    tab.setAttribute("tabindex", tab.classList.contains("active") ? "0" : "-1")
    tab.setAttribute("aria-selected", tab.classList.contains("active") ? "true" : "false")

    tab.addEventListener("keydown", function(e) {
      var newIndex = index
      if (e.key === "ArrowRight") newIndex = (index + 1) % tabs.length
      else if (e.key === "ArrowLeft") newIndex = (index - 1 + tabs.length) % tabs.length
      else return

      e.preventDefault()
      tabs[newIndex].click()
      tabs[newIndex].focus()
      announce("Tab: " + tabs[newIndex].textContent)
    })
  })

  var tabbar = document.getElementById("tabbar")
  if (tabbar) {
    tabbar.setAttribute("role", "tablist")
    tabbar.setAttribute("aria-label", "Diagram views")
  }
}

// ─── Skip Link ───────────────────────────────────────────────

function addSkipLink() {
  var existing = document.getElementById("a11y-skip-link")
  if (existing) return

  var link = document.createElement("a")
  link.id = "a11y-skip-link"
  link.href = "#content"
  link.textContent = "Skip to content"
  link.style.cssText = [
    "position:fixed",
    "top:-100px",
    "left:16px",
    "z-index:100000",
    "padding:8px 16px",
    "background:var(--accent,#89b4fa)",
    "color:var(--bg,#1e1e2e)",
    "border-radius:0 0 6px 6px",
    "font-weight:600",
    "font-size:13px",
    "text-decoration:none",
    "transition:top 0.2s"
  ].join(";")

  link.addEventListener("focus", function() {
    link.style.top = "0"
  })
  link.addEventListener("blur", function() {
    link.style.top = "-100px"
  })

  document.body.insertBefore(link, document.body.firstChild)
}

// ─── Initialize A11y ─────────────────────────────────────────

function initAccessibility() {
  addSkipLink()
  enhanceTabNavigation()
  _ensureLiveRegion()
  announce("AI Code Visualizer ready")
}

// Auto-init when DOM is ready
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAccessibility)
  } else {
    initAccessibility()
  }
}

globalThis.AccessibilityManager = {
  announce: announce,
  toggleHighContrast: toggleHighContrast,
  toggleReducedMotion: toggleReducedMotion,
  increaseFontSize: increaseFontSize,
  decreaseFontSize: decreaseFontSize,
  resetFontSize: resetFontSize,
  trapFocus: trapFocus,
  labelNodes: labelDiagramNodes,
  enhanceTabs: enhanceTabNavigation,
  config: A11yConfig
}
