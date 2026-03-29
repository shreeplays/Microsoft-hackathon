/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         Mermaid Validator — AI Code Visualizer              ║
 * ║  Validate, sanitize, and auto-fix mermaid diagram syntax    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Node.js utility to validate and repair mermaid syntax before
 * rendering. Catches common AI-generated errors like unquoted
 * labels, missing arrows, special characters in labels, etc.
 */

"use strict"

// ─── Supported Diagram Types ─────────────────────────────────

var DIAGRAM_TYPES = [
  "flowchart", "graph",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "erDiagram",
  "gantt",
  "pie",
  "gitgraph",
  "mindmap",
  "timeline"
]

// ─── Detect Diagram Type ─────────────────────────────────────

function detectDiagramType(source) {
  if (!source || typeof source !== "string") return null

  var firstLine = source.trim().split("\n")[0].trim().toLowerCase()

  if (firstLine.startsWith("flowchart") || firstLine.startsWith("graph")) return "flowchart"
  if (firstLine.startsWith("sequencediagram")) return "sequence"
  if (firstLine.startsWith("classdiagram")) return "class"
  if (firstLine.startsWith("statediagram")) return "state"
  if (firstLine.startsWith("erdiagram")) return "er"
  if (firstLine.startsWith("gantt")) return "gantt"
  if (firstLine.startsWith("pie")) return "pie"
  if (firstLine.startsWith("gitgraph")) return "gitgraph"
  if (firstLine.startsWith("mindmap")) return "mindmap"
  if (firstLine.startsWith("timeline")) return "timeline"

  return "unknown"
}

// ─── Validation Result ───────────────────────────────────────

function createValidationResult() {
  return {
    isValid: true,
    errors: [],
    warnings: [],
    fixes: [],
    originalSource: "",
    fixedSource: ""
  }
}

// ─── Validate Mermaid Source ─────────────────────────────────

function validate(source) {
  var result = createValidationResult()
  result.originalSource = source

  if (!source || typeof source !== "string") {
    result.isValid = false
    result.errors.push({ line: 0, message: "Empty or invalid source" })
    result.fixedSource = "graph TD\n  A[\"Start\"] --\u003e B[\"End\"]"
    return result
  }

  source = source.trim()
  var lines = source.split("\n")

  // Check for diagram type declaration
  var diagramType = detectDiagramType(source)
  if (diagramType === "unknown") {
    result.warnings.push({ line: 1, message: "Unknown diagram type" })
  }

  // Run validators based on type
  if (diagramType === "flowchart") {
    _validateFlowchart(lines, result)
  } else if (diagramType === "sequence") {
    _validateSequence(lines, result)
  } else if (diagramType === "class") {
    _validateClass(lines, result)
  }

  // General checks
  _validateGeneral(lines, result)

  // Apply fixes
  result.fixedSource = _applyFixes(source, result.fixes)

  if (result.errors.length > 0) {
    result.isValid = false
  }

  return result
}

// ─── Flowchart Validation ────────────────────────────────────

function _validateFlowchart(lines, result) {
  var nodeIdPattern = /^[a-zA-Z_][a-zA-Z0-9_]*/
  var arrowPatterns = ["--\u003e", "---", "-.-\u003e", "==\u003e", "--", "-.->"]

  lines.forEach(function(line, i) {
    var trimmed = line.trim()
    if (!trimmed || i === 0) return  // Skip header and empty lines

    // Check for unquoted labels with special chars
    var labelMatch = trimmed.match(/\[([^\]"]+)\]/)
    if (labelMatch) {
      var label = labelMatch[1]
      var specialChars = /[(){}|&\u003c\u003e#;]/
      if (specialChars.test(label)) {
        result.warnings.push({
          line: i + 1,
          message: "Label contains special characters that should be quoted: " + label
        })
        result.fixes.push({
          line: i + 1,
          find: "[" + label + "]",
          replace: '["' + label.replace(/"/g, "'") + '"]'
        })
      }
    }

    // Check for missing arrow between nodes
    if (trimmed.match(nodeIdPattern) && !i === 0) {
      var hasArrow = arrowPatterns.some(function(a) { return trimmed.includes(a) })
      var hasNodeDef = /[\[\]({}>]/.test(trimmed)
      var isSubgraph = trimmed.startsWith("subgraph") || trimmed === "end"
      var isStyle = trimmed.startsWith("style") || trimmed.startsWith("class")
      var isDirection = /^(TD|TB|LR|RL|BT)$/.test(trimmed)

      if (!hasArrow && !hasNodeDef && !isSubgraph && !isStyle && !isDirection && trimmed.length > 2) {
        result.warnings.push({
          line: i + 1,
          message: "Line may be missing an arrow or node definition"
        })
      }
    }

    // Check for semicolons (common AI error — should be newlines)
    if (trimmed.includes(";") && !trimmed.startsWith("style") && !trimmed.startsWith("class")) {
      var parts = trimmed.split(";").filter(function(p) { return p.trim() })
      if (parts.length > 1) {
        result.warnings.push({
          line: i + 1,
          message: "Multiple statements on one line separated by semicolons"
        })
        // Fix: split into multiple lines
        result.fixes.push({
          line: i + 1,
          find: trimmed,
          replace: parts.map(function(p) { return "  " + p.trim() }).join("\n")
        })
      }
    }

    // Check for parentheses in labels (causes mermaid syntax errors)
    var parenLabel = trimmed.match(/\[([^\]]*\([^\)]*\)[^\]]*)\]/)
    if (parenLabel && !parenLabel[0].startsWith('["')) {
      result.errors.push({
        line: i + 1,
        message: "Label with parentheses must be quoted: " + parenLabel[1]
      })
      result.fixes.push({
        line: i + 1,
        find: "[" + parenLabel[1] + "]",
        replace: '["' + parenLabel[1].replace(/"/g, "'") + '"]'
      })
    }
  })
}

// ─── Sequence Diagram Validation ─────────────────────────────

function _validateSequence(lines, result) {
  lines.forEach(function(line, i) {
    var trimmed = line.trim()
    if (!trimmed || i === 0) return

    // Check for proper arrow syntax
    if (trimmed.includes("-\u003e") && !trimmed.includes("-\u003e\u003e") && !trimmed.includes("--\u003e")) {
      result.warnings.push({
        line: i + 1,
        message: "Sequence diagram arrows should use -\u003e\u003e or --\u003e\u003e syntax"
      })
      result.fixes.push({
        line: i + 1,
        find: "-\u003e",
        replace: "-\u003e\u003e",
        firstOnly: true
      })
    }

    // Check for missing colon in messages
    if ((trimmed.includes("-\u003e\u003e") || trimmed.includes("--\u003e\u003e")) && !trimmed.includes(":")) {
      result.warnings.push({
        line: i + 1,
        message: "Sequence message should include a colon and message text"
      })
    }
  })
}

// ─── Class Diagram Validation ────────────────────────────────

function _validateClass(lines, result) {
  lines.forEach(function(line, i) {
    var trimmed = line.trim()
    if (!trimmed || i === 0) return

    // Check for valid member syntax
    if (trimmed.includes(":") && !trimmed.includes("\u003c|") && !trimmed.includes("|>") && !trimmed.includes("--")) {
      var parts = trimmed.split(":")
      if (parts.length > 2) {
        result.warnings.push({
          line: i + 1,
          message: "Multiple colons in class member definition"
        })
      }
    }
  })
}

// ─── General Validation ──────────────────────────────────────

function _validateGeneral(lines, result) {
  // Check for empty diagram
  if (lines.length <= 1) {
    result.warnings.push({ line: 1, message: "Diagram appears to be empty" })
  }

  // Check for extremely long lines
  lines.forEach(function(line, i) {
    if (line.length > 500) {
      result.warnings.push({
        line: i + 1,
        message: "Very long line (" + line.length + " chars) may cause rendering issues"
      })
    }
  })

  // Check for unmatched quotes
  lines.forEach(function(line, i) {
    var quoteCount = (line.match(/"/g) || []).length
    if (quoteCount % 2 !== 0) {
      result.errors.push({
        line: i + 1,
        message: "Unmatched quote detected"
      })
    }
  })

  // Check for common markdown artifacts
  var fullText = lines.join("\n")
  if (fullText.includes("```")) {
    result.errors.push({
      line: 1,
      message: "Markdown code fence detected — remove ``` markers"
    })
    result.fixes.push({
      line: 1,
      find: /```(?:mermaid)?\n?/g,
      replace: ""
    })
  }
}

// ─── Apply Fixes ─────────────────────────────────────────────

function _applyFixes(source, fixes) {
  var result = source

  fixes.forEach(function(fix) {
    if (fix.find instanceof RegExp) {
      result = result.replace(fix.find, fix.replace)
    } else if (fix.firstOnly) {
      var idx = result.indexOf(fix.find)
      if (idx !== -1) {
        result = result.substring(0, idx) + fix.replace + result.substring(idx + fix.find.length)
      }
    } else {
      result = result.split(fix.find).join(fix.replace)
    }
  })

  return result
}

// ─── Sanitize for Safe Rendering ─────────────────────────────

function sanitize(source) {
  if (!source) return ""

  var sanitized = source
    // Remove HTML tags
    .replace(/\u003cscript[\s\S]*?\u003c\/script\u003e/gi, "")
    .replace(/\u003c[^>]+\u003e/g, "")
    // Remove potentially dangerous characters in labels
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    // Clean up whitespace
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  return sanitized
}

// ─── Quick Fix Common AI Errors ──────────────────────────────

function quickFix(source) {
  if (!source) return ""

  var fixed = source

  // Remove markdown code fences
  fixed = fixed.replace(/```mermaid\s*\n/g, "")
  fixed = fixed.replace(/```\s*$/gm, "")
  fixed = fixed.replace(/^```\s*/gm, "")

  // Fix double arrows (AI sometimes outputs --> -->)
  fixed = fixed.replace(/-->\s*-->/g, "-->")

  // Fix missing spaces around arrows
  fixed = fixed.replace(/([a-zA-Z0-9\]"\}])-->/g, "$1 -->")
  fixed = fixed.replace(/-->([a-zA-Z0-9\["\{])/g, "--> $1")

  // Fix unquoted labels with parentheses
  fixed = fixed.replace(/\[([^\]"]*\([^\)]*\)[^\]"]*)\]/g, function(match, label) {
    return '["' + label.replace(/"/g, "'") + '"]'
  })

  // Ensure proper line endings
  fixed = fixed.replace(/;\s*/g, "\n  ")

  return fixed.trim()
}

// ─── Exports ─────────────────────────────────────────────────

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    validate: validate,
    sanitize: sanitize,
    quickFix: quickFix,
    detectDiagramType: detectDiagramType,
    DIAGRAM_TYPES: DIAGRAM_TYPES
  }
}

if (typeof globalThis !== "undefined") {
  globalThis.MermaidValidator = {
    validate: validate,
    sanitize: sanitize,
    quickFix: quickFix,
    detectDiagramType: detectDiagramType,
    DIAGRAM_TYPES: DIAGRAM_TYPES
  }
}
