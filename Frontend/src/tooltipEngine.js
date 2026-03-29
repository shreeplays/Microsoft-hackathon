/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           Tooltip Engine — AI Code Visualizer               ║
 * ║  Rich hover tooltips for diagram nodes and UI elements      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

console.log("Tooltip Engine Loaded")

var TooltipConfig = {
  showDelay: 400,
  hideDelay: 150,
  maxWidth: 280,
  offset: 10,
  animationDuration: 150,
  zIndex: 50000,
  enabled: true
}

var _tooltipState = {
  activeTooltip: null,
  showTimer: null,
  hideTimer: null,
  registry: new Map()
}

function _createTooltipElement(content, options) {
  options = options || {}
  var tip = document.createElement("div")
  tip.id = "tooltip-active"
  tip.setAttribute("role", "tooltip")

  tip.style.cssText = [
    "position:fixed",
    "z-index:" + TooltipConfig.zIndex,
    "max-width:" + TooltipConfig.maxWidth + "px",
    "padding:10px 14px",
    "background:rgba(24,24,37,0.85)",
    "border:1px solid rgba(255,255,255,0.12)",
    "border-radius:12px",
    "color:var(--fg, #cdd6f4)",
    "font-family:system-ui, -apple-system, sans-serif",
    "font-size:12px",
    "line-height:1.5",
    "box-shadow:0 12px 32px rgba(0,0,0,0.4)",
    "pointer-events:none",
    "opacity:0",
    "transform:translateY(8px)",
    "transition:all 0.25s cubic-bezier(0.19, 1, 0.22, 1)",
    "backdrop-filter:blur(12px)"
  ].join(";")

  if (typeof content === "string") {
    tip.innerHTML = content
  } else if (content instanceof HTMLElement) {
    tip.appendChild(content)
  } else if (typeof content === "object") {
    const info = _guessNodeType(content.title)
    
    // Header
    var header = document.createElement("div")
    header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:12px"
    
    var title = document.createElement("div")
    title.textContent = content.title
    title.style.cssText = "font-weight:700;color:#fff;font-size:13px;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
    
    var typeBadge = document.createElement("span")
    typeBadge.innerHTML = info.icon + " " + info.label
    typeBadge.style.cssText = "font-size:10px;padding:2px 8px;border-radius:20px;background:" + info.color + "33;color:" + info.color + ";font-weight:700;text-transform:uppercase;letter-spacing:0.02em;white-space:nowrap"
    
    header.appendChild(title)
    header.appendChild(typeBadge)
    tip.appendChild(header)

    if (content.body) {
      var body = document.createElement("div")
      body.textContent = content.body
      body.style.cssText = "color:var(--fg2,#a6adc8);font-size:11px;margin-bottom:12px"
      tip.appendChild(body)
    }

    if (content.details) {
      var details = document.createElement("div")
      details.style.cssText = "background:rgba(255,255,255,0.03);border-radius:8px;padding:8px"
      
      if (Array.isArray(content.details)) {
        content.details.forEach(function(d) {
          var row = document.createElement("div")
          row.style.cssText = "display:flex;justify-content:space-between;font-size:10px;padding:2px 0"
          var key = document.createElement("span")
          key.textContent = d.key
          key.style.color = "var(--fg2,#a6adc8)"
          var val = document.createElement("span")
          val.textContent = d.value
          val.style.cssText = "font-weight:600;color:var(--fg,#cdd6f4)"
          row.appendChild(key); row.appendChild(val)
          details.appendChild(row)
        })
      }
      tip.appendChild(details)
    }

    // Quick Action
    var action = document.createElement("div")
    action.innerHTML = "<span>↵</span> Click to jump to code"
    action.style.cssText = "margin-top:10px;font-size:10px;color:var(--accent,#89b4fa);font-weight:600;display:flex;align-items:center;gap:6px;opacity:0.8"
    tip.appendChild(action)
  }

  return tip
}

function _positionTooltip(tip, targetRect, placement) {
  placement = placement || "top"
  var tipRect = tip.getBoundingClientRect()
  var offset = TooltipConfig.offset
  var left, top

  switch (placement) {
    case "bottom":
      left = targetRect.left + (targetRect.width - tipRect.width) / 2
      top = targetRect.bottom + offset
      break
    case "left":
      left = targetRect.left - tipRect.width - offset
      top = targetRect.top + (targetRect.height - tipRect.height) / 2
      break
    case "right":
      left = targetRect.right + offset
      top = targetRect.top + (targetRect.height - tipRect.height) / 2
      break
    default: // top
      left = targetRect.left + (targetRect.width - tipRect.width) / 2
      top = targetRect.top - tipRect.height - offset
  }

  // Keep within viewport
  var vw = window.innerWidth, vh = window.innerHeight
  if (left < 8) left = 8
  if (left + tipRect.width > vw - 8) left = vw - tipRect.width - 8
  if (top < 8) { top = targetRect.bottom + offset } // flip to bottom
  if (top + tipRect.height > vh - 8) { top = targetRect.top - tipRect.height - offset } // flip to top

  tip.style.left = left + "px"
  tip.style.top = top + "px"
}

function showTooltip(targetElement, content, options) {
  if (!TooltipConfig.enabled) return
  options = options || {}
  hideTooltip()

  var tip = _createTooltipElement(content, options)
  document.body.appendChild(tip)

  var targetRect = targetElement.getBoundingClientRect()
  _positionTooltip(tip, targetRect, options.placement)

  requestAnimationFrame(function() {
    tip.style.opacity = "1"
    tip.style.transform = "translateY(0)"
  })

  _tooltipState.activeTooltip = tip
  return tip
}

function hideTooltip() {
  if (_tooltipState.activeTooltip) {
    var tip = _tooltipState.activeTooltip
    tip.style.opacity = "0"
    tip.style.transform = "translateY(4px)"
    setTimeout(function() {
      if (tip.parentNode) tip.parentNode.removeChild(tip)
    }, TooltipConfig.animationDuration)
    _tooltipState.activeTooltip = null
  }
}

function registerTooltip(element, content, options) {
  options = options || {}
  if (!element) return

  var showDelay = options.showDelay || TooltipConfig.showDelay
  var hideDelay = options.hideDelay || TooltipConfig.hideDelay

  function onEnter() {
    clearTimeout(_tooltipState.hideTimer)
    _tooltipState.showTimer = setTimeout(function() {
      showTooltip(element, content, options)
    }, showDelay)
  }

  function onLeave() {
    clearTimeout(_tooltipState.showTimer)
    _tooltipState.hideTimer = setTimeout(hideTooltip, hideDelay)
  }

  element.addEventListener("mouseenter", onEnter)
  element.addEventListener("mouseleave", onLeave)
  element.addEventListener("focus", onEnter)
  element.addEventListener("blur", onLeave)

  element.setAttribute("aria-describedby", "tooltip-active")

  _tooltipState.registry.set(element, { onEnter: onEnter, onLeave: onLeave })
}

function unregisterTooltip(element) {
  if (!element) return
  var handlers = _tooltipState.registry.get(element)
  if (handlers) {
    element.removeEventListener("mouseenter", handlers.onEnter)
    element.removeEventListener("mouseleave", handlers.onLeave)
    _tooltipState.registry.delete(element)
  }
}

function registerNodeTooltips(containerId) {
  var container = document.getElementById(containerId || "diagram-flowchart")
  if (!container) return

  var nodes = container.querySelectorAll("g.node")
  nodes.forEach(function(node) {
    var label = node.textContent.trim()
    registerTooltip(node, {
      title: label,
      type: "Node",
      body: "Click to jump to this section in your code.",
      details: [
        { key: "Type", value: _guessNodeType(label) },
        { key: "Connections", value: String(_countNodeEdges(node)) }
      ]
    }, { placement: "top" })
  })
}

function _guessNodeType(label) {
  var l = label.toLowerCase()
  if (l.includes("start") || l.includes("begin")) return { label: "Entry", icon: "🟢", color: "#a6e3a1" }
  if (l.includes("end") || l.includes("return")) return { label: "Exit", icon: "🛑", color: "#f38ba8" }
  if (l.includes("if") || l.includes("check") || l.includes("condition")) return { label: "Logic", icon: "⎇", color: "#fab387" }
  if (l.includes("loop") || l.includes("for") || l.includes("while")) return { label: "Loop", icon: "🔄", color: "#cba6f7" }
  if (l.includes("call") || l.includes("invoke")) return { label: "Call", icon: "⚡", color: "#89b4fa" }
  if (l.includes("error") || l.includes("except")) return { label: "Error", icon: "⚠️", color: "#f38ba8" }
  return { label: "Process", icon: "📦", color: "#94e2d5" }
}

function _countNodeEdges(node) {
  var id = node.id || ""
  var svg = node.closest("svg")
  if (!svg) return 0
  var edges = svg.querySelectorAll("g.edgePath, path.flowchart-link")
  var count = 0
  edges.forEach(function() { count++ })
  return Math.min(count, 10)
}

function configureTooltips(options) {
  if (options.showDelay !== undefined) TooltipConfig.showDelay = options.showDelay
  if (options.hideDelay !== undefined) TooltipConfig.hideDelay = options.hideDelay
  if (options.maxWidth !== undefined) TooltipConfig.maxWidth = options.maxWidth
  if (options.offset !== undefined) TooltipConfig.offset = options.offset
}

function toggleTooltips() {
  TooltipConfig.enabled = !TooltipConfig.enabled
  if (globalThis.AccessibilityManager) {
    globalThis.AccessibilityManager.announce("Tooltips " + (TooltipConfig.enabled ? "Enabled" : "Disabled"))
  }
}

globalThis.TooltipEngine = {
  toggle: toggleTooltips,
  show: showTooltip,
  hide: hideTooltip,
  register: registerTooltip,
  unregister: unregisterTooltip,
  registerNodes: registerNodeTooltips,
  configure: configureTooltips
}
