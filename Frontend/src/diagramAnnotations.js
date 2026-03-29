/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║        Diagram Annotations — AI Code Visualizer             ║
 * ║  Click nodes to add sticky notes, save/load annotations     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

console.log("Diagram Annotations Loaded")

var AnnotationConfig = {
  maxAnnotations: 50,
  storageKey: "ai-visualizer-annotations",
  colors: ["#89b4fa", "#a6e3a1", "#f9e2af", "#f38ba8", "#cba6f7", "#94e2d5"],
  defaultColor: "#89b4fa",
  maxLength: 500
}

var _annotations = []
var _annotationPanelVisible = false

// ─── Load / Save Annotations ─────────────────────────────────

function loadAnnotations() {
  try {
    var stored = localStorage.getItem(AnnotationConfig.storageKey)
    if (stored) {
      _annotations = JSON.parse(stored)
    }
  } catch (e) {
    console.warn("Failed to load annotations:", e)
    _annotations = []
  }
  return _annotations
}

function saveAnnotations() {
  try {
    localStorage.setItem(AnnotationConfig.storageKey, JSON.stringify(_annotations))
  } catch (e) {
    console.warn("Failed to save annotations:", e)
  }
}

// ─── Add Annotation ──────────────────────────────────────────

function addAnnotation(nodeLabel, text, options) {
  options = options || {}

  if (_annotations.length >= AnnotationConfig.maxAnnotations) {
    console.warn("Max annotations reached")
    return null
  }

  var annotation = {
    id: "ann-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6),
    nodeLabel: nodeLabel,
    text: text.substring(0, AnnotationConfig.maxLength),
    color: options.color || AnnotationConfig.defaultColor,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pinned: options.pinned || false,
    author: options.author || "user"
  }

  _annotations.push(annotation)
  saveAnnotations()
  _renderAnnotationMarkers()

  return annotation
}

// ─── Edit Annotation ─────────────────────────────────────────

function editAnnotation(id, newText) {
  var ann = _annotations.find(function(a) { return a.id === id })
  if (!ann) return false

  ann.text = newText.substring(0, AnnotationConfig.maxLength)
  ann.updatedAt = Date.now()
  saveAnnotations()
  _renderAnnotationMarkers()
  return true
}

// ─── Remove Annotation ───────────────────────────────────────

function removeAnnotation(id) {
  var index = _annotations.findIndex(function(a) { return a.id === id })
  if (index === -1) return false

  _annotations.splice(index, 1)
  saveAnnotations()
  _renderAnnotationMarkers()
  return true
}

function clearAnnotations() {
  _annotations = []
  saveAnnotations()
  _renderAnnotationMarkers()
}

// ─── Get Annotations ─────────────────────────────────────────

function getAnnotations(nodeLabel) {
  if (nodeLabel) {
    return _annotations.filter(function(a) { return a.nodeLabel === nodeLabel })
  }
  return _annotations.slice()
}

// ─── Render Annotation Markers on Diagram ────────────────────

function _renderAnnotationMarkers() {
  // Remove existing markers
  document.querySelectorAll(".annotation-marker").forEach(function(el) {
    el.parentNode.removeChild(el)
  })

  var container = document.getElementById("diagram-flowchart")
  if (!container) return

  var nodes = container.querySelectorAll("g.node")

  nodes.forEach(function(node) {
    var label = node.textContent.trim()
    var nodeAnns = _annotations.filter(function(a) { return a.nodeLabel === label })
    if (nodeAnns.length === 0) return

    var marker = document.createElement("div")
    marker.className = "annotation-marker"
    marker.style.cssText = [
      "position:absolute",
      "width:18px",
      "height:18px",
      "background:" + nodeAnns[0].color,
      "color:#1e1e2e",
      "border-radius:50%",
      "font-size:10px",
      "font-weight:700",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "cursor:pointer",
      "box-shadow:0 2px 8px rgba(0,0,0,0.4)",
      "z-index:20",
      "pointer-events:auto",
      "transition:transform 0.15s"
    ].join(";")
    marker.textContent = String(nodeAnns.length)
    marker.title = nodeAnns.length + " annotation(s) on: " + label

    marker.addEventListener("mouseenter", function() {
      marker.style.transform = "scale(1.3)"
    })
    marker.addEventListener("mouseleave", function() {
      marker.style.transform = "scale(1)"
    })
    marker.addEventListener("click", function(e) {
      e.stopPropagation()
      _showAnnotationPopup(label, nodeAnns, e.clientX, e.clientY)
    })

    // Position relative to node
    var nodeRect = node.getBoundingClientRect()
    var containerRect = container.getBoundingClientRect()
    marker.style.position = "absolute"
    marker.style.left = (nodeRect.right - containerRect.left - 9) + "px"
    marker.style.top = (nodeRect.top - containerRect.top - 9) + "px"

    container.style.position = "relative"
    container.appendChild(marker)
  })
}

// ─── Annotation Popup ────────────────────────────────────────

function _showAnnotationPopup(nodeLabel, annotations, x, y) {
  _hideAnnotationPopup()

  var popup = document.createElement("div")
  popup.id = "annotation-popup"
  popup.style.cssText = [
    "position:fixed",
    "left:" + Math.min(x, window.innerWidth - 320) + "px",
    "top:" + Math.min(y, window.innerHeight - 300) + "px",
    "width:300px",
    "max-height:280px",
    "overflow-y:auto",
    "background:var(--bg, #1e1e2e)",
    "border:1px solid var(--border, #313244)",
    "border-radius:10px",
    "box-shadow:0 12px 40px rgba(0,0,0,0.5)",
    "z-index:60000",
    "padding:12px",
    "font-size:12px",
    "backdrop-filter:blur(8px)"
  ].join(";")

  // Header
  var header = document.createElement("div")
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"
  var title = document.createElement("span")
  title.textContent = "📌 " + nodeLabel
  title.style.cssText = "font-weight:600;color:var(--accent,#89b4fa);font-size:13px"
  var closeBtn = document.createElement("span")
  closeBtn.textContent = "✕"
  closeBtn.style.cssText = "cursor:pointer;color:var(--fg2,#a6adc8);font-size:16px;padding:2px 6px;border-radius:4px"
  closeBtn.addEventListener("click", _hideAnnotationPopup)
  header.appendChild(title)
  header.appendChild(closeBtn)
  popup.appendChild(header)

  // Annotation list
  annotations.forEach(function(ann) {
    var item = document.createElement("div")
    item.style.cssText = "padding:8px 10px;background:var(--bg2,#181825);border-radius:6px;margin-bottom:6px;border-left:3px solid " + ann.color

    var text = document.createElement("div")
    text.textContent = ann.text
    text.style.cssText = "color:var(--fg,#cdd6f4);line-height:1.5;margin-bottom:4px"

    var meta = document.createElement("div")
    meta.style.cssText = "display:flex;align-items:center;justify-content:space-between;font-size:10px;color:var(--fg2,#a6adc8)"

    var date = document.createElement("span")
    date.textContent = new Date(ann.createdAt).toLocaleDateString()

    var deleteBtn = document.createElement("span")
    deleteBtn.textContent = "🗑"
    deleteBtn.style.cssText = "cursor:pointer;font-size:12px;padding:2px"
    deleteBtn.addEventListener("click", function() {
      removeAnnotation(ann.id)
      _hideAnnotationPopup()
    })

    meta.appendChild(date)
    meta.appendChild(deleteBtn)
    item.appendChild(text)
    item.appendChild(meta)
    popup.appendChild(item)
  })

  // Add new annotation form
  var addRow = document.createElement("div")
  addRow.style.cssText = "display:flex;gap:6px;margin-top:8px"

  var input = document.createElement("input")
  input.placeholder = "Add a note..."
  input.style.cssText = "flex:1;padding:6px 10px;background:var(--bg2,#181825);border:1px solid var(--border,#313244);color:var(--fg,#cdd6f4);border-radius:6px;font-size:11px;outline:none"

  var addBtn = document.createElement("button")
  addBtn.textContent = "+"
  addBtn.style.cssText = "padding:6px 12px;background:var(--accent,#89b4fa);color:var(--bg,#1e1e2e);border:none;border-radius:6px;cursor:pointer;font-weight:700;font-size:14px"

  addBtn.addEventListener("click", function() {
    if (input.value.trim()) {
      addAnnotation(nodeLabel, input.value.trim())
      _hideAnnotationPopup()
    }
  })

  input.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && input.value.trim()) {
      addAnnotation(nodeLabel, input.value.trim())
      _hideAnnotationPopup()
    }
  })

  addRow.appendChild(input)
  addRow.appendChild(addBtn)
  popup.appendChild(addRow)

  document.body.appendChild(popup)

  // Close on outside click
  setTimeout(function() {
    document.addEventListener("click", _onOutsideClick)
  }, 100)
}

function _onOutsideClick(e) {
  var popup = document.getElementById("annotation-popup")
  if (popup && !popup.contains(e.target)) {
    _hideAnnotationPopup()
  }
}

function _hideAnnotationPopup() {
  var popup = document.getElementById("annotation-popup")
  if (popup && popup.parentNode) popup.parentNode.removeChild(popup)
  document.removeEventListener("click", _onOutsideClick)
}

// ─── Annotation Panel (Sidebar) ──────────────────────────────

function toggleAnnotationPanel(parentId) {
  _annotationPanelVisible = !_annotationPanelVisible
  var existing = document.getElementById("annotation-panel")

  if (!_annotationPanelVisible && existing) {
    existing.parentNode.removeChild(existing)
    return
  }

  if (_annotationPanelVisible) {
    renderAnnotationPanel(parentId || "content")
  }
}

function renderAnnotationPanel(parentId) {
  var parent = document.getElementById(parentId)
  if (!parent) return

  var existing = document.getElementById("annotation-panel")
  if (existing) existing.parentNode.removeChild(existing)

  var panel = document.createElement("div")
  panel.id = "annotation-panel"
  panel.style.cssText = [
    "background:var(--bg2,#181825)",
    "border:1px solid var(--border,#313244)",
    "border-radius:8px",
    "padding:14px",
    "margin-bottom:12px",
    "max-height:400px",
    "overflow-y:auto"
  ].join(";")

  var header = document.createElement("div")
  header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"
  var title = document.createElement("span")
  title.textContent = "📝 Annotations (" + _annotations.length + ")"
  title.style.cssText = "font-weight:600;color:var(--accent,#89b4fa);font-size:13px"
  var clearBtn = document.createElement("button")
  clearBtn.textContent = "Clear All"
  clearBtn.style.cssText = "padding:4px 10px;border:1px solid var(--error,#f38ba8);background:transparent;color:var(--error,#f38ba8);border-radius:4px;cursor:pointer;font-size:10px"
  clearBtn.addEventListener("click", function() {
    clearAnnotations()
    renderAnnotationPanel(parentId)
  })
  header.appendChild(title)
  header.appendChild(clearBtn)
  panel.appendChild(header)

  if (_annotations.length === 0) {
    var empty = document.createElement("div")
    empty.textContent = "No annotations yet. Click a node to add one."
    empty.style.cssText = "color:var(--fg2,#a6adc8);font-size:12px;text-align:center;padding:20px 0"
    panel.appendChild(empty)
  } else {
    _annotations.forEach(function(ann) {
      var item = document.createElement("div")
      item.style.cssText = "padding:8px 10px;background:var(--bg,#1e1e2e);border-radius:6px;margin-bottom:6px;border-left:3px solid " + ann.color
      var nodeLabel = document.createElement("div")
      nodeLabel.textContent = ann.nodeLabel
      nodeLabel.style.cssText = "font-weight:600;font-size:11px;color:var(--accent,#89b4fa);margin-bottom:2px"
      var text = document.createElement("div")
      text.textContent = ann.text
      text.style.cssText = "font-size:12px;color:var(--fg,#cdd6f4);line-height:1.4"
      item.appendChild(nodeLabel)
      item.appendChild(text)
      panel.appendChild(item)
    })
  }

  parent.insertBefore(panel, parent.firstChild)
}

// ─── Init ─────────────────────────────────────────────────────

loadAnnotations()

globalThis.DiagramAnnotations = {
  toggle: toggleAnnotationPanel,
  add: addAnnotation,
  edit: editAnnotation,
  remove: removeAnnotation,
  clear: clearAnnotations,
  getAll: getAnnotations,
  load: loadAnnotations,
  save: saveAnnotations,
  togglePanel: toggleAnnotationPanel,
  renderPanel: renderAnnotationPanel
}
