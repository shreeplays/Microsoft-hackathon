/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           Diagram Exporter — AI Code Visualizer             ║
 * ║  Export diagrams as PNG, SVG, or copy to clipboard          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Features:
 *   • Export any diagram pane as PNG (canvas rendering)
 *   • Download SVG directly from rendered mermaid output
 *   • Copy diagram image to clipboard
 *   • Batch export all diagrams as a ZIP-like bundle
 *   • Configurable resolution multiplier for high-DPI
 *   • Watermark support
 */

console.log("Diagram Exporter Loaded")

// ─── Configuration ───────────────────────────────────────────

const ExporterConfig = {
  scale: 2,             // Resolution multiplier
  backgroundColor: "#1e1e2e",
  padding: 40,
  watermark: "",        // Set to text for watermark
  watermarkOpacity: 0.15,
  filenamePrefix: "ai-visualizer-",
  format: "png"         // default export format
}

// ─── SVG to Data URL ─────────────────────────────────────────

function _svgToDataUrl(svgElement) {
  const serializer = new XMLSerializer()
  let svgString = serializer.serializeToString(svgElement)

  // Ensure xmlns
  if (!svgString.includes("xmlns")) {
    svgString = svgString.replace(
      "<svg",
      '<svg xmlns="http://www.w3.org/2000/svg"'
    )
  }

  const encoded = encodeURIComponent(svgString)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22")

  return "data:image/svg+xml;charset=utf-8," + encoded
}

// ─── SVG to Canvas ───────────────────────────────────────────

function _svgToCanvas(svgElement, options) {
  return new Promise(function(resolve, reject) {
    const scale = (options && options.scale) || ExporterConfig.scale
    const bgColor = (options && options.backgroundColor) || ExporterConfig.backgroundColor
    const padding = (options && options.padding) || ExporterConfig.padding

    const bbox = svgElement.getBoundingClientRect()
    const width = bbox.width
    const height = bbox.height

    const canvas = document.createElement("canvas")
    canvas.width = (width + padding * 2) * scale
    canvas.height = (height + padding * 2) * scale

    const ctx = canvas.getContext("2d")

    // Background
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.scale(scale, scale)

    const dataUrl = _svgToDataUrl(svgElement)

    const img = new Image()
    img.onload = function() {
      ctx.drawImage(img, padding, padding, width, height)

      // Watermark
      if (ExporterConfig.watermark) {
        ctx.globalAlpha = ExporterConfig.watermarkOpacity
        ctx.fillStyle = "#ffffff"
        ctx.font = "14px sans-serif"
        ctx.textAlign = "right"
        ctx.fillText(
          ExporterConfig.watermark,
          width + padding - 10,
          height + padding - 10
        )
        ctx.globalAlpha = 1
      }

      resolve(canvas)
    }
    img.onerror = function(err) {
      reject(new Error("Failed to load SVG image: " + err))
    }
    img.src = dataUrl
  })
}

// ─── Download Helper ─────────────────────────────────────────

function _downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()

  setTimeout(function() {
    URL.revokeObjectURL(url)
    if (link.parentNode) {
      link.parentNode.removeChild(link)
    }
  }, 100)
}

function _downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a")
  link.href = dataUrl
  link.download = filename
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()

  setTimeout(function() {
    if (link.parentNode) {
      link.parentNode.removeChild(link)
    }
  }, 100)
}

// ─── Get Timestamp for Filename ──────────────────────────────

function _getTimestamp() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const h = String(now.getHours()).padStart(2, "0")
  const min = String(now.getMinutes()).padStart(2, "0")
  const s = String(now.getSeconds()).padStart(2, "0")
  return y + m + d + "-" + h + min + s
}

// ─── Export as PNG ───────────────────────────────────────────

function exportAsPng(containerId, filename) {
  const container = document.getElementById(containerId)
  if (!container) {
    console.error("Export: container not found:", containerId)
    return Promise.reject(new Error("Container not found"))
  }

  const svg = container.querySelector("svg")
  if (!svg) {
    console.error("Export: no SVG found in container:", containerId)
    return Promise.reject(new Error("No SVG diagram found"))
  }

  const name = filename || (ExporterConfig.filenamePrefix + containerId + "-" + _getTimestamp() + ".png")

  return _svgToCanvas(svg).then(function(canvas) {
    return new Promise(function(resolve, reject) {
      canvas.toBlob(function(blob) {
        if (blob) {
          _downloadBlob(blob, name)
          resolve({ filename: name, size: blob.size })
        } else {
          reject(new Error("Failed to create PNG blob"))
        }
      }, "image/png")
    })
  })
}

// ─── Export as SVG ───────────────────────────────────────────

function exportAsSvg(containerId, filename) {
  const container = document.getElementById(containerId)
  if (!container) {
    return Promise.reject(new Error("Container not found"))
  }

  const svg = container.querySelector("svg")
  if (!svg) {
    return Promise.reject(new Error("No SVG diagram found"))
  }

  const name = filename || (ExporterConfig.filenamePrefix + containerId + "-" + _getTimestamp() + ".svg")

  const serializer = new XMLSerializer()
  let svgString = serializer.serializeToString(svg)

  // Add XML header
  svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString

  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
  _downloadBlob(blob, name)

  return Promise.resolve({ filename: name, size: blob.size })
}

// ─── Copy to Clipboard ──────────────────────────────────────

function copyToClipboard(containerId) {
  const container = document.getElementById(containerId)
  if (!container) {
    return Promise.reject(new Error("Container not found"))
  }

  const svg = container.querySelector("svg")
  if (!svg) {
    return Promise.reject(new Error("No SVG diagram found"))
  }

  return _svgToCanvas(svg).then(function(canvas) {
    return new Promise(function(resolve, reject) {
      canvas.toBlob(function(blob) {
        if (!blob) {
          reject(new Error("Failed to create blob"))
          return
        }

        if (navigator.clipboard && navigator.clipboard.write) {
          var item = new ClipboardItem({ "image/png": blob })
          navigator.clipboard.write([item]).then(function() {
            resolve({ success: true, message: "Copied to clipboard!" })
          }).catch(function(err) {
            reject(new Error("Clipboard write failed: " + err.message))
          })
        } else {
          // Fallback: open in new window
          var url = URL.createObjectURL(blob)
          window.open(url, "_blank")
          resolve({ success: true, message: "Opened in new window (clipboard not available)" })
        }
      }, "image/png")
    })
  })
}

// ─── Batch Export All Diagrams ───────────────────────────────

function exportAllDiagrams(format) {
  format = format || ExporterConfig.format

  var containerIds = [
    "diagram-flowchart",
    "diagram-architecture",
    "diagram-sequence",
    "diagram-class",
    "diagram-callgraph"
  ]

  var exportFn = format === "svg" ? exportAsSvg : exportAsPng

  var results = []
  var index = 0

  function exportNext() {
    if (index >= containerIds.length) {
      return Promise.resolve(results)
    }

    var id = containerIds[index]
    index++

    var container = document.getElementById(id)
    if (!container || !container.querySelector("svg")) {
      results.push({ id: id, status: "skipped", reason: "No diagram" })
      return exportNext()
    }

    return exportFn(id).then(function(result) {
      results.push({ id: id, status: "success", filename: result.filename })
      return exportNext()
    }).catch(function(err) {
      results.push({ id: id, status: "error", error: err.message })
      return exportNext()
    })
  }

  return exportNext()
}

// ─── Get Diagram Stats ──────────────────────────────────────

function getDiagramStats(containerId) {
  var container = document.getElementById(containerId)
  if (!container) return null

  var svg = container.querySelector("svg")
  if (!svg) return null

  var bbox = svg.getBoundingClientRect()
  var nodes = svg.querySelectorAll("g.node")
  var edges = svg.querySelectorAll("g.edgePath, path.flowchart-link")

  return {
    width: Math.round(bbox.width),
    height: Math.round(bbox.height),
    nodeCount: nodes.length,
    edgeCount: edges.length,
    estimatedPngSize: Math.round(bbox.width * bbox.height * ExporterConfig.scale * 4 / 1024) + " KB"
  }
}

// ─── Configure Exporter ─────────────────────────────────────

function configureExporter(options) {
  if (options.scale !== undefined) ExporterConfig.scale = options.scale
  if (options.backgroundColor !== undefined) ExporterConfig.backgroundColor = options.backgroundColor
  if (options.padding !== undefined) ExporterConfig.padding = options.padding
  if (options.watermark !== undefined) ExporterConfig.watermark = options.watermark
  if (options.filenamePrefix !== undefined) ExporterConfig.filenamePrefix = options.filenamePrefix
  if (options.format !== undefined) ExporterConfig.format = options.format
}

// ─── Expose Globally ────────────────────────────────────────

globalThis.DiagramExporter = {
  exportAsPng: exportAsPng,
  exportAsSvg: exportAsSvg,
  copyToClipboard: copyToClipboard,
  exportAll: exportAllDiagrams,
  getStats: getDiagramStats,
  configure: configureExporter
}
