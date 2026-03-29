/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║        Performance Monitor — AI Code Visualizer             ║
 * ║  Render time tracking, FPS counter, performance HUD         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

console.log("Performance Monitor Loaded")

var PerfConfig = {
  hudVisible: false,
  fpsUpdateInterval: 500,
  maxHistoryEntries: 100,
  hudPosition: "bottom-left",
  hudOpacity: 0.85
}

var _perfState = {
  fps: 0,
  frameCount: 0,
  lastFpsUpdate: 0,
  fpsHistory: [],
  renderHistory: [],
  memoryHistory: [],
  animFrameId: null,
  hudElement: null,
  startTime: performance.now()
}

// ─── FPS Counter ─────────────────────────────────────────────

function _startFPSCounter() {
  if (_perfState.animFrameId) return

  _perfState.lastFpsUpdate = performance.now()
  _perfState.frameCount = 0

  function tick(now) {
    _perfState.frameCount++
    var elapsed = now - _perfState.lastFpsUpdate

    if (elapsed >= PerfConfig.fpsUpdateInterval) {
      _perfState.fps = Math.round((_perfState.frameCount / elapsed) * 1000)
      _perfState.fpsHistory.push({ time: now, fps: _perfState.fps })

      if (_perfState.fpsHistory.length > PerfConfig.maxHistoryEntries) {
        _perfState.fpsHistory.shift()
      }

      _perfState.frameCount = 0
      _perfState.lastFpsUpdate = now

      _updateHUD()
    }

    _perfState.animFrameId = requestAnimationFrame(tick)
  }

  _perfState.animFrameId = requestAnimationFrame(tick)
}

function _stopFPSCounter() {
  if (_perfState.animFrameId) {
    cancelAnimationFrame(_perfState.animFrameId)
    _perfState.animFrameId = null
  }
}

// ─── Render Timer ────────────────────────────────────────────

function startRenderTimer(label) {
  return {
    label: label || "render",
    start: performance.now()
  }
}

function endRenderTimer(timer) {
  if (!timer) return 0
  var duration = performance.now() - timer.start

  _perfState.renderHistory.push({
    label: timer.label,
    duration: Math.round(duration * 100) / 100,
    timestamp: Date.now()
  })

  if (_perfState.renderHistory.length > PerfConfig.maxHistoryEntries) {
    _perfState.renderHistory.shift()
  }

  return duration
}

function measureRender(fn, label) {
  var timer = startRenderTimer(label)
  var result = fn()

  // Handle promises
  if (result && typeof result.then === "function") {
    return result.then(function(res) {
      endRenderTimer(timer)
      return res
    })
  }

  endRenderTimer(timer)
  return result
}

// ─── Memory Estimation ──────────────────────────────────────

function getMemoryInfo() {
  if (performance.memory) {
    return {
      usedHeap: Math.round(performance.memory.usedJSHeapSize / 1048576),
      totalHeap: Math.round(performance.memory.totalJSHeapSize / 1048576),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
      unit: "MB"
    }
  }
  return null
}

function trackMemory() {
  var mem = getMemoryInfo()
  if (mem) {
    _perfState.memoryHistory.push({
      used: mem.usedHeap,
      total: mem.totalHeap,
      timestamp: Date.now()
    })
    if (_perfState.memoryHistory.length > PerfConfig.maxHistoryEntries) {
      _perfState.memoryHistory.shift()
    }
  }
  return mem
}

// ─── DOM Stats ───────────────────────────────────────────────

function getDOMStats() {
  var allElements = document.querySelectorAll("*")
  var svgElements = document.querySelectorAll("svg *")

  return {
    totalElements: allElements.length,
    svgElements: svgElements.length,
    diagramNodes: document.querySelectorAll("g.node").length,
    listeners: _estimateListenerCount(),
    stylesheets: document.styleSheets.length
  }
}

function _estimateListenerCount() {
  // Rough estimate based on interactive elements
  var interactive = document.querySelectorAll(
    "button, a, input, [onclick], [tabindex], .tab, .palette-item, g.node"
  )
  return interactive.length
}

// ─── Performance HUD ─────────────────────────────────────────

function _createHUD() {
  if (_perfState.hudElement) return _perfState.hudElement

  var hud = document.createElement("div")
  hud.id = "performance-hud"

  var posStyle = PerfConfig.hudPosition === "bottom-right"
    ? "bottom:8px;right:8px"
    : "bottom:8px;left:8px"

  hud.style.cssText = [
    "position:fixed",
    posStyle,
    "z-index:99998",
    "background:rgba(17,17,27,0.92)",
    "border:1px solid #313244",
    "border-radius:8px",
    "padding:10px 14px",
    "font-family:'Cascadia Code','Fira Code',monospace",
    "font-size:11px",
    "color:#cdd6f4",
    "min-width:200px",
    "opacity:" + PerfConfig.hudOpacity,
    "backdrop-filter:blur(8px)",
    "box-shadow:0 4px 20px rgba(0,0,0,0.5)",
    "user-select:none",
    "cursor:move"
  ].join(";")

  // Make draggable
  var isDragging = false, offsetX = 0, offsetY = 0
  hud.addEventListener("mousedown", function(e) {
    isDragging = true
    offsetX = e.clientX - hud.getBoundingClientRect().left
    offsetY = e.clientY - hud.getBoundingClientRect().top
    hud.style.transition = "none"
  })
  document.addEventListener("mousemove", function(e) {
    if (!isDragging) return
    hud.style.left = (e.clientX - offsetX) + "px"
    hud.style.top = (e.clientY - offsetY) + "px"
    hud.style.bottom = "auto"
    hud.style.right = "auto"
  })
  document.addEventListener("mouseup", function() { isDragging = false })

  // Header
  var header = document.createElement("div")
  header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"
  var title = document.createElement("span")
  title.textContent = "⚡ PERF"
  title.style.cssText = "font-weight:700;color:#89b4fa;letter-spacing:0.1em"
  var closeBtn = document.createElement("span")
  closeBtn.textContent = "✕"
  closeBtn.style.cssText = "cursor:pointer;color:#a6adc8;font-size:14px"
  closeBtn.addEventListener("click", function() { toggleHUD() })
  header.appendChild(title)
  header.appendChild(closeBtn)
  hud.appendChild(header)

  // FPS row
  var fpsRow = document.createElement("div")
  fpsRow.id = "hud-fps"
  fpsRow.style.cssText = "margin-bottom:4px"
  hud.appendChild(fpsRow)

  // Memory row
  var memRow = document.createElement("div")
  memRow.id = "hud-memory"
  memRow.style.cssText = "margin-bottom:4px"
  hud.appendChild(memRow)

  // DOM row
  var domRow = document.createElement("div")
  domRow.id = "hud-dom"
  domRow.style.cssText = "margin-bottom:4px"
  hud.appendChild(domRow)

  // Render history
  var renderRow = document.createElement("div")
  renderRow.id = "hud-render"
  renderRow.style.cssText = "margin-bottom:4px"
  hud.appendChild(renderRow)

  // Uptime
  var uptimeRow = document.createElement("div")
  uptimeRow.id = "hud-uptime"
  hud.appendChild(uptimeRow)

  // Mini FPS sparkline
  var sparkCanvas = document.createElement("canvas")
  sparkCanvas.id = "hud-fps-spark"
  sparkCanvas.width = 180
  sparkCanvas.height = 30
  sparkCanvas.style.cssText = "margin-top:6px;width:100%;height:30px;border-radius:4px;background:rgba(0,0,0,0.3)"
  hud.appendChild(sparkCanvas)

  _perfState.hudElement = hud
  return hud
}

function _updateHUD() {
  if (!PerfConfig.hudVisible || !_perfState.hudElement) return

  // FPS
  var fpsEl = document.getElementById("hud-fps")
  if (fpsEl) {
    var fpsColor = _perfState.fps >= 50 ? "#a6e3a1" : _perfState.fps >= 30 ? "#f9e2af" : "#f38ba8"
    fpsEl.innerHTML = "<span style='color:" + fpsColor + ";font-weight:700'>" + _perfState.fps + " FPS</span>"
  }

  // Memory
  var memEl = document.getElementById("hud-memory")
  var mem = getMemoryInfo()
  if (memEl && mem) {
    memEl.innerHTML = "MEM: <span style='color:#cba6f7;font-weight:600'>" + mem.usedHeap + "</span>/" + mem.totalHeap + " MB"
  } else if (memEl) {
    memEl.innerHTML = "MEM: <span style='color:#a6adc8'>N/A</span>"
  }

  // DOM
  var domEl = document.getElementById("hud-dom")
  if (domEl) {
    var dom = getDOMStats()
    domEl.innerHTML = "DOM: <span style='color:#94e2d5;font-weight:600'>" + dom.totalElements + "</span> elements, <span style='color:#89b4fa'>" + dom.diagramNodes + "</span> nodes"
  }

  // Last render
  var renderEl = document.getElementById("hud-render")
  if (renderEl && _perfState.renderHistory.length > 0) {
    var last = _perfState.renderHistory[_perfState.renderHistory.length - 1]
    var rColor = last.duration < 100 ? "#a6e3a1" : last.duration < 500 ? "#f9e2af" : "#f38ba8"
    renderEl.innerHTML = "LAST: <span style='color:" + rColor + ";font-weight:600'>" + last.duration + "ms</span> (" + last.label + ")"
  }

  // Uptime
  var uptimeEl = document.getElementById("hud-uptime")
  if (uptimeEl) {
    var uptime = Math.round((performance.now() - _perfState.startTime) / 1000)
    var minutes = Math.floor(uptime / 60)
    var seconds = uptime % 60
    uptimeEl.innerHTML = "UP: " + minutes + "m " + seconds + "s"
  }

  // FPS sparkline
  _drawFPSSparkline()
}

function _drawFPSSparkline() {
  var canvas = document.getElementById("hud-fps-spark")
  if (!canvas) return
  var ctx = canvas.getContext("2d")
  var w = canvas.width, h = canvas.height
  ctx.clearRect(0, 0, w, h)

  var history = _perfState.fpsHistory.slice(-60)
  if (history.length < 2) return

  var values = history.map(function(e) { return e.fps })
  var max = Math.max.apply(null, values.concat([60]))
  var stepX = w / (values.length - 1)

  ctx.beginPath()
  values.forEach(function(v, i) {
    var x = i * stepX
    var y = h - (v / max) * (h - 2)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.strokeStyle = "#89b4fa"
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 60fps reference line
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(0, h - (60 / max) * (h - 2))
  ctx.lineTo(w, h - (60 / max) * (h - 2))
  ctx.strokeStyle = "rgba(166,227,161,0.4)"
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.setLineDash([])
}

// ─── Toggle HUD ──────────────────────────────────────────────

function toggleHUD() {
  PerfConfig.hudVisible = !PerfConfig.hudVisible

  if (PerfConfig.hudVisible) {
    var hud = _createHUD()
    document.body.appendChild(hud)
    _startFPSCounter()
  } else {
    _stopFPSCounter()
    if (_perfState.hudElement && _perfState.hudElement.parentNode) {
      _perfState.hudElement.parentNode.removeChild(_perfState.hudElement)
    }
    _perfState.hudElement = null
  }
}

// ─── Get Performance Report ──────────────────────────────────

function getPerformanceReport() {
  var avgFps = 0
  if (_perfState.fpsHistory.length > 0) {
    var sum = 0
    _perfState.fpsHistory.forEach(function(e) { sum += e.fps })
    avgFps = Math.round(sum / _perfState.fpsHistory.length)
  }

  var avgRender = 0
  if (_perfState.renderHistory.length > 0) {
    var rSum = 0
    _perfState.renderHistory.forEach(function(e) { rSum += e.duration })
    avgRender = Math.round(rSum / _perfState.renderHistory.length * 100) / 100
  }

  return {
    currentFPS: _perfState.fps,
    averageFPS: avgFps,
    averageRenderTime: avgRender,
    renderCount: _perfState.renderHistory.length,
    memory: getMemoryInfo(),
    dom: getDOMStats(),
    uptime: Math.round((performance.now() - _perfState.startTime) / 1000)
  }
}

globalThis.PerformanceMonitor = {
  toggle: toggleHUD,
  startTimer: startRenderTimer,
  endTimer: endRenderTimer,
  measure: measureRender,
  getMemory: getMemoryInfo,
  getDOMStats: getDOMStats,
  getReport: getPerformanceReport,
  config: PerfConfig
}
