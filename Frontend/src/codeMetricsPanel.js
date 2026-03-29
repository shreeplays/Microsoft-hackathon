/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         Code Metrics Panel — AI Code Visualizer             ║
 * ║  Visual analytics dashboard with charts and stats           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

console.log("Code Metrics Panel Loaded")

var MetricsConfig = {
  colors: {
    primary: "#89b4fa", success: "#a6e3a1", warning: "#f9e2af",
    error: "#f38ba8", purple: "#cba6f7", teal: "#94e2d5",
    peach: "#fab387", pink: "#f5c2e7"
  },
  chartHeight: 220, chartPadding: 30, barGap: 4, donutThickness: 30
}

var _metricsData = {
  loc: 0, functions: 0, classes: 0, imports: 0,
  complexity: "O(n)", dependencies: [], history: []
}

function parseCodeMetrics(code) {
  if (!code) return _metricsData
  var lines = code.split("\n")
  var loc = lines.length, blankLines = 0, commentLines = 0
  var functionCount = 0, classCount = 0, importCount = 0
  var loopCount = 0, conditionalCount = 0, maxIndent = 0

  lines.forEach(function(line) {
    var trimmed = line.trim()
    if (trimmed === "") { blankLines++; return }
    if (trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("/*")) commentLines++
    if (/^(def |function |async function )/.test(trimmed)) functionCount++
    if (/^class /.test(trimmed)) classCount++
    if (/^(import |from .+ import |require\()/.test(trimmed)) importCount++
    if (/^(for |while )/.test(trimmed)) loopCount++
    if (/^(if |elif |else if )/.test(trimmed)) conditionalCount++
    var indent = line.length - line.trimStart().length
    if (indent > maxIndent) maxIndent = indent
  })

  _metricsData = {
    loc: loc, codeLines: loc - blankLines - commentLines,
    blankLines: blankLines, commentLines: commentLines,
    functions: functionCount, classes: classCount, imports: importCount,
    loops: loopCount, conditionals: conditionalCount,
    maxIndent: maxIndent, nestingDepth: Math.floor(maxIndent / 4),
    commentRatio: loc > 0 ? Math.round((commentLines / loc) * 100) : 0,
    complexity: "O(n)", dependencies: [],
    history: (_metricsData.history || []).concat([{
      timestamp: Date.now(), loc: loc, functions: functionCount
    }]).slice(-20)
  }
  return _metricsData
}

function drawDonutChart(canvasId, data, options) {
  options = options || {}
  var canvas = document.getElementById(canvasId)
  if (!canvas) return
  var ctx = canvas.getContext("2d")
  var w = canvas.width, h = canvas.height
  var cx = w / 2, cy = h / 2
  var oR = Math.min(w, h) / 2 - MetricsConfig.chartPadding
  var iR = oR - MetricsConfig.donutThickness
  ctx.clearRect(0, 0, w, h)

  var total = 0
  data.forEach(function(d) { total += d.value })
  if (total === 0) return

  var start = -Math.PI / 2
  data.forEach(function(item) {
    var slice = (item.value / total) * Math.PI * 2
    var end = start + slice
    ctx.beginPath()
    ctx.arc(cx, cy, oR, start, end)
    ctx.arc(cx, cy, iR, end, start, true)
    ctx.closePath()
    ctx.fillStyle = item.color
    ctx.fill()

    if (item.value / total > 0.05) {
      var mid = start + slice / 2
      var lx = cx + Math.cos(mid) * (oR + 15)
      var ly = cy + Math.sin(mid) * (oR + 15)
      ctx.fillStyle = "#cdd6f4"
      ctx.font = "10px sans-serif"
      ctx.textAlign = mid > Math.PI / 2 && mid < Math.PI * 1.5 ? "right" : "left"
      ctx.fillText(item.label + " (" + Math.round(item.value / total * 100) + "%)", lx, ly)
    }
    start = end
  })

  if (options.centerText) {
    ctx.fillStyle = "#cdd6f4"; ctx.font = "bold 18px sans-serif"
    ctx.textAlign = "center"; ctx.textBaseline = "middle"
    ctx.fillText(options.centerText, cx, cy - 8)
    if (options.centerSubtext) {
      ctx.font = "11px sans-serif"; ctx.fillStyle = "#a6adc8"
      ctx.fillText(options.centerSubtext, cx, cy + 12)
    }
  }
}

function drawBarChart(canvasId, data) {
  var canvas = document.getElementById(canvasId)
  if (!canvas) return
  var ctx = canvas.getContext("2d")
  var w = canvas.width, h = canvas.height, pad = MetricsConfig.chartPadding
  var cW = w - pad * 2, cH = h - pad * 2 - 20
  ctx.clearRect(0, 0, w, h)
  if (data.length === 0) return

  var maxVal = Math.max.apply(null, data.map(function(d) { return d.value }))
  if (maxVal === 0) maxVal = 1
  var barW = (cW - MetricsConfig.barGap * (data.length - 1)) / data.length

  for (var g = 0; g <= 4; g++) {
    var gy = pad + cH - (cH / 4) * g
    ctx.strokeStyle = "rgba(49,50,68,0.5)"; ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(w - pad, gy); ctx.stroke()
    ctx.fillStyle = "#a6adc8"; ctx.font = "9px sans-serif"; ctx.textAlign = "right"
    ctx.fillText(String(Math.round(maxVal / 4 * g)), pad - 4, gy + 3)
  }

  data.forEach(function(item, i) {
    var bH = (item.value / maxVal) * cH
    var x = pad + i * (barW + MetricsConfig.barGap), y = pad + cH - bH
    var cr = Math.min(barW / 4, 4)
    ctx.beginPath()
    ctx.moveTo(x + cr, y); ctx.lineTo(x + barW - cr, y)
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + cr)
    ctx.lineTo(x + barW, y + bH); ctx.lineTo(x, y + bH)
    ctx.lineTo(x, y + cr); ctx.quadraticCurveTo(x, y, x + cr, y)
    ctx.closePath()
    ctx.fillStyle = item.color || MetricsConfig.colors.primary; ctx.fill()

    ctx.fillStyle = "#cdd6f4"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"
    ctx.fillText(String(item.value), x + barW / 2, y - 4)
    ctx.fillStyle = "#a6adc8"; ctx.font = "9px sans-serif"
    ctx.fillText(item.label.length > 8 ? item.label.substring(0, 7) + "…" : item.label, x + barW / 2, pad + cH + 14)
  })
}

function drawSparkline(canvasId, values, color) {
  var canvas = document.getElementById(canvasId)
  if (!canvas || values.length < 2) return
  var ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height
  ctx.clearRect(0, 0, w, h)
  var max = Math.max.apply(null, values), min = Math.min.apply(null, values)
  var range = max - min || 1, stepX = w / (values.length - 1)

  ctx.beginPath(); ctx.moveTo(0, h)
  values.forEach(function(v, i) {
    ctx.lineTo(i * stepX, h - ((v - min) / range) * (h - 4) - 2)
  })
  ctx.lineTo(w, h); ctx.closePath()
  ctx.fillStyle = (color || MetricsConfig.colors.primary) + "4d"; ctx.fill()

  ctx.beginPath()
  values.forEach(function(v, i) {
    var x = i * stepX, y = h - ((v - min) / range) * (h - 4) - 2
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.strokeStyle = color || MetricsConfig.colors.primary; ctx.lineWidth = 1.5; ctx.stroke()
}

function createStatCard(opts) {
  var card = document.createElement("div")
  card.style.cssText = "background:var(--bg2,#181825);border:1px solid var(--border,#313244);border-radius:8px;padding:12px 16px;min-width:120px"
  var lbl = document.createElement("div")
  lbl.textContent = opts.label
  lbl.style.cssText = "font-size:11px;color:var(--fg2,#a6adc8);text-transform:uppercase;letter-spacing:0.05em"
  var val = document.createElement("div")
  val.textContent = String(opts.value)
  val.style.cssText = "font-size:24px;font-weight:700;color:" + (opts.color || "var(--fg,#cdd6f4)")
  card.appendChild(lbl); card.appendChild(val)
  return card
}

function renderMetricsPanel(containerId, metrics) {
  var container = document.getElementById(containerId)
  if (!container) return
  metrics = metrics || _metricsData
  container.innerHTML = ""
  container.style.cssText = "display:flex;flex-direction:column;gap:16px"

  var statsRow = document.createElement("div")
  statsRow.style.cssText = "display:flex;gap:10px;flex-wrap:wrap"
  var items = [
    { label: "Lines of Code", value: metrics.loc || 0, color: MetricsConfig.colors.primary },
    { label: "Functions", value: metrics.functions || 0, color: MetricsConfig.colors.success },
    { label: "Classes", value: metrics.classes || 0, color: MetricsConfig.colors.purple },
    { label: "Imports", value: metrics.imports || 0, color: MetricsConfig.colors.teal },
    { label: "Comment %", value: (metrics.commentRatio || 0) + "%", color: MetricsConfig.colors.peach }
  ]
  items.forEach(function(it) { statsRow.appendChild(createStatCard(it)) })
  container.appendChild(statsRow)

  if (metrics.loc > 0) {
    var dWrap = document.createElement("div")
    dWrap.style.cssText = "background:var(--bg2,#181825);border:1px solid var(--border,#313244);border-radius:8px;padding:16px"
    var dCanvas = document.createElement("canvas")
    dCanvas.id = "metrics-donut"; dCanvas.width = 340; dCanvas.height = 200
    dWrap.appendChild(dCanvas); container.appendChild(dWrap)
    drawDonutChart("metrics-donut", [
      { label: "Code", value: metrics.codeLines || 0, color: MetricsConfig.colors.primary },
      { label: "Comments", value: metrics.commentLines || 0, color: MetricsConfig.colors.success },
      { label: "Blank", value: metrics.blankLines || 0, color: MetricsConfig.colors.purple }
    ], { centerText: String(metrics.loc), centerSubtext: "total lines" })
  }

  var bWrap = document.createElement("div")
  bWrap.style.cssText = "background:var(--bg2,#181825);border:1px solid var(--border,#313244);border-radius:8px;padding:16px"
  var bCanvas = document.createElement("canvas")
  bCanvas.id = "metrics-bars"; bCanvas.width = 340; bCanvas.height = MetricsConfig.chartHeight
  bWrap.appendChild(bCanvas); container.appendChild(bWrap)
  drawBarChart("metrics-bars", [
    { label: "Functions", value: metrics.functions || 0, color: MetricsConfig.colors.primary },
    { label: "Classes", value: metrics.classes || 0, color: MetricsConfig.colors.purple },
    { label: "Imports", value: metrics.imports || 0, color: MetricsConfig.colors.teal },
    { label: "Loops", value: metrics.loops || 0, color: MetricsConfig.colors.warning },
    { label: "Conditionals", value: metrics.conditionals || 0, color: MetricsConfig.colors.peach }
  ])
}

function getMetrics() { return Object.assign({}, _metricsData) }

function toggleMetrics() {
  const panel = document.getElementById("metrics-panel-overlay")
  if (panel) {
    panel.remove()
  } else {
    const overlay = document.createElement("div")
    overlay.id = "metrics-panel-overlay"
    overlay.style.cssText = "position:fixed;top:60px;right:20px;width:420px;max-height:80vh;overflow-y:auto;background:var(--bg2,#181825);border:1px solid var(--border,#313244);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,0.4);z-index:9000;padding:20px;animation:slideInRight 0.3s ease"
    
    // Inject animation
    if (!document.getElementById("metrics-anim-style")) {
      const s = document.createElement("style")
      s.id = "metrics-anim-style"
      s.textContent = "@keyframes slideInRight{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}"
      document.head.appendChild(s)
    }

    const header = document.createElement("div")
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"
    header.innerHTML = '<h3 style="margin:0;font-size:16px;color:var(--accent)">Code Insights</h3><button onclick="globalThis.CodeMetrics.toggle()" style="background:transparent;border:none;color:var(--fg2);cursor:pointer;font-size:18px">&times;</button>'
    overlay.appendChild(header)

    const content = document.createElement("div")
    content.id = "metrics-content-area"
    overlay.appendChild(content)
    document.body.appendChild(overlay)
    renderMetricsPanel("metrics-content-area", _metricsData)
  }
}

globalThis.CodeMetrics = {
  toggle: toggleMetrics,
  parse: parseCodeMetrics, render: renderMetricsPanel,
  drawDonut: drawDonutChart, drawBars: drawBarChart,
  drawSparkline: drawSparkline, createStatCard: createStatCard,
  get: getMetrics, config: MetricsConfig
}
