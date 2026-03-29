/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          Diagram Navigator — AI Code Visualizer             ║
 * ║  Minimap, pan & drag, touch gestures, fit-to-screen         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Features:
 *   • Minimap overlay showing diagram overview
 *   • Click-to-pan on minimap
 *   • Mouse drag scrolling within diagram
 *   • Pinch-zoom touch gestures
 *   • Fit-to-screen auto-scaling
 *   • Smooth animated panning
 *   • Breadcrumb path tracking for navigation history
 */

console.log("Diagram Navigator Loaded")

// ─── Configuration ───────────────────────────────────────────

var NavigatorConfig = {
  minimapWidth: 160,
  minimapHeight: 100,
  minimapOpacity: 0.85,
  minimapPosition: "bottom-right",
  defaultZoom: 1.0,
  zoomStep: 0.2,
  minZoom: 0.2,
  maxZoom: 5.0,
  enableDragPan: true,
  enableTouchGestures: true,
  panAnimationDuration: 300,
  breadcrumbMaxItems: 10
}

// ─── Navigator State ─────────────────────────────────────────

var _navState = {
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  scrollStartX: 0,
  scrollStartY: 0,
  lastPinchDist: 0,
  minimapVisible: false,
  breadcrumbs: [],
  activeContainer: null,
  zoomLevels: {} // containerId -> zoomLevel
}

// ─── Minimap ─────────────────────────────────────────────────

function createMinimap(containerId) {
  var container = document.getElementById(containerId)
  if (!container) return null

  // Remove existing minimap
  var existing = document.getElementById("minimap-" + containerId)
  if (existing) existing.parentNode.removeChild(existing)

  var minimap = document.createElement("div")
  minimap.id = "minimap-" + containerId

  var posStyle = _getMinimapPosition()

  minimap.style.cssText = [
    "position:absolute",
    posStyle,
    "width:" + NavigatorConfig.minimapWidth + "px",
    "height:" + NavigatorConfig.minimapHeight + "px",
    "background:var(--bg2, #181825)",
    "border:1px solid var(--border, #313244)",
    "border-radius:6px",
    "opacity:" + NavigatorConfig.minimapOpacity,
    "overflow:hidden",
    "cursor:pointer",
    "z-index:100",
    "box-shadow:0 4px 16px rgba(0,0,0,0.4)",
    "transition:opacity 0.2s"
  ].join(";")

  // Minimap canvas
  var canvas = document.createElement("canvas")
  canvas.id = "minimap-canvas-" + containerId
  canvas.width = NavigatorConfig.minimapWidth
  canvas.height = NavigatorConfig.minimapHeight
  canvas.style.cssText = "width:100%;height:100%"

  minimap.appendChild(canvas)

  // Viewport indicator
  var viewport = document.createElement("div")
  viewport.id = "minimap-viewport-" + containerId
  viewport.style.cssText = [
    "position:absolute",
    "border:2px solid var(--accent, #89b4fa)",
    "background:rgba(137, 180, 250, 0.15)",
    "border-radius:2px",
    "pointer-events:none",
    "transition:all 0.1s ease"
  ].join(";")

  minimap.appendChild(viewport)

  // Click to pan on minimap
  minimap.addEventListener("click", function(e) {
    var rect = minimap.getBoundingClientRect()
    var clickX = (e.clientX - rect.left) / rect.width
    var clickY = (e.clientY - rect.top) / rect.height

    panToPercent(containerId, clickX, clickY)
  })

  // Hover effects
  minimap.addEventListener("mouseenter", function() {
    minimap.style.opacity = "1"
  })
  minimap.addEventListener("mouseleave", function() {
    minimap.style.opacity = String(NavigatorConfig.minimapOpacity)
  })

  container.style.position = "relative"
  container.appendChild(minimap)

  _navState.minimapVisible = true

  // Render minimap contents
  _updateMinimap(containerId)

  // Track scroll for viewport indicator
  container.addEventListener("scroll", function() {
    _updateMinimapViewport(containerId)
  })

  return minimap
}

function _getMinimapPosition() {
  switch (NavigatorConfig.minimapPosition) {
    case "top-left":     return "top:8px;left:8px"
    case "top-right":    return "top:8px;right:8px"
    case "bottom-left":  return "bottom:8px;left:8px"
    default:             return "bottom:8px;right:8px"
  }
}

/**
 * Robustly updates the minimap by waiting for layout if necessary
 */
function _updateMinimap(containerId, retryCount) {
  retryCount = retryCount || 0
  var container = document.getElementById(containerId)
  var canvas = document.getElementById("minimap-canvas-" + containerId)
  if (!container || !canvas) return

  var svg = container.querySelector("svg")
  
  // If SVG not found or not yet sized, retry a few times
  if (!svg || svg.getBoundingClientRect().width === 0) {
    if (retryCount < 10) {
      setTimeout(function() {
        _updateMinimap(containerId, retryCount + 1)
      }, 100)
    }
    return
  }

  var ctx = canvas.getContext("2d")
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  var svgRect = svg.getBoundingClientRect()
  
  // Use viewBox or BBox if available for more accurate "content" size
  var contentWidth = svgRect.width
  var contentHeight = svgRect.height
  
  if (contentWidth === 0 || contentHeight === 0) return

  var scaleX = (canvas.width - 8) / contentWidth
  var scaleY = (canvas.height - 8) / contentHeight
  var scale = Math.min(scaleX, scaleY)

  // Draw nodes
  var nodes = svg.querySelectorAll("g.node")
  ctx.fillStyle = "rgba(137, 180, 250, 0.7)"

  nodes.forEach(function(node) {
    var nodeRect = node.getBoundingClientRect()
    var x = (nodeRect.left - svgRect.left) * scale + 4
    var y = (nodeRect.top - svgRect.top) * scale + 4
    var w = Math.max(nodeRect.width * scale, 2)
    var h = Math.max(nodeRect.height * scale, 2)

    ctx.fillRect(x, y, w, h)
  })

  // Draw edges
  var edges = svg.querySelectorAll("path.flowchart-link, g.edgePath path, .edgePath path")
  ctx.strokeStyle = "rgba(166, 173, 200, 0.4)"
  ctx.lineWidth = 0.5

  edges.forEach(function(edge) {
    // For edges, we just draw a line from start to end of their bounding box roughly
    // Better: use the path data, but that's complex. Bounding box is ok for overview.
    var edgeRect = edge.getBoundingClientRect()
    var x = (edgeRect.left - svgRect.left) * scale + 4
    var y = (edgeRect.top - svgRect.top) * scale + 4
    var w = edgeRect.width * scale
    var h = edgeRect.height * scale

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + w, y + h)
    ctx.stroke()
  })

  _updateMinimapViewport(containerId)
}

function _updateMinimapViewport(containerId) {
  var container = document.getElementById(containerId)
  var viewport = document.getElementById("minimap-viewport-" + containerId)
  var canvas = document.getElementById("minimap-canvas-" + containerId)

  if (!container || !viewport || !canvas) return

  var svg = container.querySelector("svg")
  if (!svg) return

  var svgRect = svg.getBoundingClientRect()
  var containerRect = container.getBoundingClientRect()

  var totalWidth = Math.max(svgRect.width, containerRect.width)
  var totalHeight = Math.max(svgRect.height, containerRect.height)

  var scaleX = canvas.width / totalWidth
  var scaleY = canvas.height / totalHeight
  var scale = Math.min(scaleX, scaleY) * 0.9

  var vpX = container.scrollLeft * scale + 4
  var vpY = container.scrollTop * scale + 4
  var vpW = containerRect.width * scale
  var vpH = containerRect.height * scale

  viewport.style.left = vpX + "px"
  viewport.style.top = vpY + "px"
  viewport.style.width = vpW + "px"
  viewport.style.height = vpH + "px"
}

function toggleMinimap(containerId) {
  containerId = containerId || "diagram-wrapper"
  var minimap = document.getElementById("minimap-" + containerId)

  if (minimap) {
    minimap.parentNode.removeChild(minimap)
    _navState.minimapVisible = false
  } else {
    createMinimap(containerId)
  }
}

// ─── Pan to Percent ──────────────────────────────────────────

function panToPercent(containerId, percentX, percentY) {
  var container = document.getElementById(containerId)
  if (!container) return

  var targetX = (container.scrollWidth - container.clientWidth) * percentX
  var targetY = (container.scrollHeight - container.clientHeight) * percentY

  smoothScrollTo(container, targetX, targetY)
}

// ─── Smooth Scroll ───────────────────────────────────────────

function smoothScrollTo(element, targetX, targetY) {
  var startX = element.scrollLeft
  var startY = element.scrollTop
  var diffX = targetX - startX
  var diffY = targetY - startY
  var startTime = performance.now()
  var duration = NavigatorConfig.panAnimationDuration

  function step(now) {
    var elapsed = now - startTime
    var progress = Math.min(elapsed / duration, 1)
    // Ease out cubic
    var eased = 1 - Math.pow(1 - progress, 3)

    element.scrollLeft = startX + diffX * eased
    element.scrollTop = startY + diffY * eased

    if (progress < 1) {
      requestAnimationFrame(step)
    }
  }

  requestAnimationFrame(step)
}

// ─── Drag Pan ────────────────────────────────────────────────

function enableDragPan(containerId) {
  var container = document.getElementById(containerId)
  if (!container) return

  container.addEventListener("mousedown", _onDragStart)
  container.addEventListener("mousemove", _onDragMove)
  container.addEventListener("mouseup", _onDragEnd)
  container.addEventListener("mouseleave", _onDragEnd)

  function _onDragStart(e) {
    if (e.target.closest("g.node")) return  // Don't interfere with node clicks
    if (e.button !== 0) return              // Left button only

    _navState.isDragging = true
    _navState.dragStartX = e.clientX
    _navState.dragStartY = e.clientY
    _navState.scrollStartX = container.scrollLeft
    _navState.scrollStartY = container.scrollTop
    container.style.cursor = "grabbing"
    e.preventDefault()
  }

  function _onDragMove(e) {
    if (!_navState.isDragging) {
      if (!e.target.closest("g.node")) {
        container.style.cursor = "grab"
      }
      return
    }

    var dx = e.clientX - _navState.dragStartX
    var dy = e.clientY - _navState.dragStartY

    container.scrollLeft = _navState.scrollStartX - dx
    container.scrollTop = _navState.scrollStartY - dy
  }

  function _onDragEnd() {
    _navState.isDragging = false
    container.style.cursor = "grab"
  }
}

// ─── Touch Gestures ──────────────────────────────────────────

function enableTouchGestures(containerId) {
  var container = document.getElementById(containerId)
  if (!container) return

  container.addEventListener("touchstart", _onTouchStart, { passive: false })
  container.addEventListener("touchmove", _onTouchMove, { passive: false })
  container.addEventListener("touchend", _onTouchEnd)

  function _onTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault()
      _navState.lastPinchDist = _getTouchDistance(e.touches)
    }
  }

  function _onTouchMove(e) {
    if (e.touches.length === 2) {
      e.preventDefault()
      var dist = _getTouchDistance(e.touches)
      var diff = dist - _navState.lastPinchDist

      if (Math.abs(diff) > 2) {
        if (diff > 0 && globalThis.zoomIn) {
          globalThis.zoomIn()
        } else if (diff < 0 && globalThis.zoomOut) {
          globalThis.zoomOut()
        }
        _navState.lastPinchDist = dist
      }
    }
  }

  function _onTouchEnd() {
    _navState.lastPinchDist = 0
  }
}

function _getTouchDistance(touches) {
  var dx = touches[0].clientX - touches[1].clientX
  var dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

// ─── Fit to Screen ───────────────────────────────────────────

function fitToScreen(containerId) {
  containerId = containerId || "diagram-wrapper"
  var container = document.getElementById(containerId)
  if (!container) return

  var svg = container.querySelector("svg")
  if (!svg) return

  var containerRect = container.getBoundingClientRect()
  var svgRect = svg.getBoundingClientRect()

  var scaleX = (containerRect.width - 40) / svgRect.width
  var scaleY = (containerRect.height - 40) / svgRect.height
  var scale = Math.min(scaleX, scaleY, 2)  // Max 2x

  // Apply to diagram-flowchart (the inner element)
  var diagram = container.querySelector("[id^='diagram-']") || container.firstElementChild
  if (diagram) {
    diagram.style.transform = "scale(" + scale + ")"
    diagram.style.transformOrigin = "top left"
  }

  // Update global zoom level if available
  if (typeof globalThis.zoomLevel !== "undefined") {
    globalThis.zoomLevel = scale
  }

  // Center the diagram
  container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2
  container.scrollTop = 0
}

function zoomIn(containerId) {
  _adjustZoom(containerId || "diagram-wrapper", NavigatorConfig.zoomStep)
}

function zoomOut(containerId) {
  _adjustZoom(containerId || "diagram-wrapper", -NavigatorConfig.zoomStep)
}

function resetZoom(containerId) {
  _setZoom(containerId || "diagram-wrapper", NavigatorConfig.defaultZoom)
}

function _adjustZoom(containerId, delta) {
  var current = _navState.zoomLevels[containerId] || NavigatorConfig.defaultZoom
  var next = current + delta
  _setZoom(containerId, next)
}

function _setZoom(containerId, level) {
  var container = document.getElementById(containerId)
  if (!container) return

  var zoom = Math.max(NavigatorConfig.minZoom, Math.min(NavigatorConfig.maxZoom, level))
  _navState.zoomLevels[containerId] = zoom

  var diagram = container.querySelector("[id^='diagram-']") || container.firstElementChild
  if (diagram) {
    diagram.style.transform = "scale(" + zoom + ")"
    diagram.style.transformOrigin = "top left"
  }
  
  _updateMinimapViewport(containerId)
}

// ─── Breadcrumb Navigation ───────────────────────────────────

function addBreadcrumb(label, containerId, scrollX, scrollY) {
  _navState.breadcrumbs.push({
    label: label,
    containerId: containerId || "diagram-wrapper",
    scrollX: scrollX || 0,
    scrollY: scrollY || 0,
    timestamp: Date.now()
  })

  // Trim to max
  while (_navState.breadcrumbs.length > NavigatorConfig.breadcrumbMaxItems) {
    _navState.breadcrumbs.shift()
  }
}

function goToBreadcrumb(index) {
  if (index < 0 || index >= _navState.breadcrumbs.length) return

  var crumb = _navState.breadcrumbs[index]
  var container = document.getElementById(crumb.containerId)
  if (!container) return

  smoothScrollTo(container, crumb.scrollX, crumb.scrollY)
}

function getBreadcrumbs() {
  return _navState.breadcrumbs.slice()
}

function clearBreadcrumbs() {
  _navState.breadcrumbs.length = 0
}

function renderBreadcrumbBar(parentId) {
  var parent = document.getElementById(parentId)
  if (!parent) return

  var bar = document.getElementById("breadcrumb-bar")
  if (!bar) {
    bar = document.createElement("div")
    bar.id = "breadcrumb-bar"
    bar.style.cssText = [
      "display:flex",
      "gap:4px",
      "align-items:center",
      "padding:6px 12px",
      "background:var(--bg2, #181825)",
      "border:1px solid var(--border, #313244)",
      "border-radius:6px",
      "margin-bottom:8px",
      "overflow-x:auto",
      "font-size:11px"
    ].join(";")
    parent.insertBefore(bar, parent.firstChild)
  }

  bar.innerHTML = ""

  if (_navState.breadcrumbs.length === 0) {
    bar.style.display = "none"
    return
  }

  bar.style.display = "flex"

  _navState.breadcrumbs.forEach(function(crumb, i) {
    if (i > 0) {
      var sep = document.createElement("span")
      sep.textContent = "›"
      sep.style.color = "var(--fg2, #a6adc8)"
      bar.appendChild(sep)
    }

    var btn = document.createElement("span")
    btn.textContent = crumb.label
    btn.style.cssText = [
      "cursor:pointer",
      "color:var(--accent, #89b4fa)",
      "padding:2px 6px",
      "border-radius:3px",
      "white-space:nowrap",
      "transition:background 0.15s"
    ].join(";")

    btn.addEventListener("mouseenter", function() {
      btn.style.background = "rgba(137, 180, 250, 0.15)"
    })
    btn.addEventListener("mouseleave", function() {
      btn.style.background = "transparent"
    })
    btn.addEventListener("click", function() {
      goToBreadcrumb(i)
    })

    bar.appendChild(btn)
  })
}

// ─── Configure ───────────────────────────────────────────────

function configureNavigator(options) {
  if (options.minimapWidth !== undefined) NavigatorConfig.minimapWidth = options.minimapWidth
  if (options.minimapHeight !== undefined) NavigatorConfig.minimapHeight = options.minimapHeight
  if (options.minimapPosition !== undefined) NavigatorConfig.minimapPosition = options.minimapPosition
  if (options.enableDragPan !== undefined) NavigatorConfig.enableDragPan = options.enableDragPan
  if (options.enableTouchGestures !== undefined) NavigatorConfig.enableTouchGestures = options.enableTouchGestures
  if (options.panAnimationDuration !== undefined) NavigatorConfig.panAnimationDuration = options.panAnimationDuration
}

// ─── Expose Globally ────────────────────────────────────────

globalThis.DiagramNavigator = {
  zoomIn: zoomIn,
  zoomOut: zoomOut,
  resetZoom: resetZoom,
  createMinimap: createMinimap,
  toggleMinimap: toggleMinimap,
  panToPercent: panToPercent,
  enableDragPan: enableDragPan,
  enableTouchGestures: enableTouchGestures,
  fitToScreen: fitToScreen,
  addBreadcrumb: addBreadcrumb,
  goToBreadcrumb: goToBreadcrumb,
  getBreadcrumbs: getBreadcrumbs,
  clearBreadcrumbs: clearBreadcrumbs,
  renderBreadcrumbBar: renderBreadcrumbBar,
  configure: configureNavigator
}
