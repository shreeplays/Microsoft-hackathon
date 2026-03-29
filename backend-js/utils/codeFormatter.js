/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           Code Formatter — AI Code Visualizer               ║
 * ║  Syntax highlighting, indentation, language detection       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Node.js utility for formatting and highlighting source code
 * before visualization. Provides tokenization, line numbering,
 * indentation normalization, and language detection.
 */

"use strict"

// ─── Language Detection ──────────────────────────────────────

var LANGUAGE_PATTERNS = {
  python: {
    extensions: [".py", ".pyw"],
    keywords: ["def ", "import ", "from ", "class ", "elif ", "except ", "lambda ", "yield "],
    indicators: ["#!/usr/bin/python", "#!/usr/bin/env python", "__name__", "self."],
    commentSingle: "#",
    commentMultiStart: '"""',
    commentMultiEnd: '"""',
    stringDelimiters: ["'", '"', '"""', "'''"]
  },
  javascript: {
    extensions: [".js", ".mjs", ".cjs"],
    keywords: ["function ", "const ", "let ", "var ", "=\u003e", "require(", "module.exports"],
    indicators: ["#!/usr/bin/env node", "'use strict'", '"use strict"', "console.log"],
    commentSingle: "//",
    commentMultiStart: "/*",
    commentMultiEnd: "*/",
    stringDelimiters: ["'", '"', "`"]
  },
  typescript: {
    extensions: [".ts", ".tsx"],
    keywords: ["interface ", "type ", "enum ", "namespace ", "declare ", ": string", ": number"],
    indicators: ["import * as", "export interface", "export type", "\u003cT\u003e"],
    commentSingle: "//",
    commentMultiStart: "/*",
    commentMultiEnd: "*/",
    stringDelimiters: ["'", '"', "`"]
  },
  java: {
    extensions: [".java"],
    keywords: ["public class", "private ", "protected ", "static void", "System.out", "throws "],
    indicators: ["package ", "import java.", "@Override", "public static void main"],
    commentSingle: "//",
    commentMultiStart: "/*",
    commentMultiEnd: "*/",
    stringDelimiters: ['"']
  },
  rust: {
    extensions: [".rs"],
    keywords: ["fn ", "let mut ", "impl ", "pub fn", "match ", "enum ", "struct "],
    indicators: ["use std::", "println!", "cargo", "#[derive"],
    commentSingle: "//",
    commentMultiStart: "/*",
    commentMultiEnd: "*/",
    stringDelimiters: ['"']
  },
  go: {
    extensions: [".go"],
    keywords: ["func ", "package ", "import (", "go func", "chan ", "defer "],
    indicators: ["fmt.Println", "package main", "import \"fmt\""],
    commentSingle: "//",
    commentMultiStart: "/*",
    commentMultiEnd: "*/",
    stringDelimiters: ['"', "`"]
  },
  cpp: {
    extensions: [".cpp", ".cc", ".cxx", ".h", ".hpp"],
    keywords: ["#include", "std::", "cout", "cin", "template\u003c", "nullptr"],
    indicators: ["#include \u003ciostream\u003e", "using namespace std", "int main("],
    commentSingle: "//",
    commentMultiStart: "/*",
    commentMultiEnd: "*/",
    stringDelimiters: ['"']
  }
}

function detectLanguage(code, filename) {
  // Try by extension first
  if (filename) {
    var ext = "." + filename.split(".").pop().toLowerCase()
    for (var lang in LANGUAGE_PATTERNS) {
      if (LANGUAGE_PATTERNS[lang].extensions.indexOf(ext) !== -1) {
        return lang
      }
    }
  }

  // Score-based detection from content
  var scores = {}

  for (var langName in LANGUAGE_PATTERNS) {
    var pattern = LANGUAGE_PATTERNS[langName]
    var score = 0

    pattern.keywords.forEach(function(kw) {
      if (code.includes(kw)) score += 2
    })
    pattern.indicators.forEach(function(ind) {
      if (code.includes(ind)) score += 5
    })

    scores[langName] = score
  }

  var best = null
  var bestScore = 0
  for (var l in scores) {
    if (scores[l] > bestScore) {
      bestScore = scores[l]
      best = l
    }
  }

  return bestScore > 0 ? best : "unknown"
}

// ─── Token Types ─────────────────────────────────────────────

var TOKEN_TYPES = {
  KEYWORD: "keyword",
  STRING: "string",
  NUMBER: "number",
  COMMENT: "comment",
  OPERATOR: "operator",
  PUNCTUATION: "punctuation",
  IDENTIFIER: "identifier",
  WHITESPACE: "whitespace",
  FUNCTION: "function",
  CLASS_NAME: "class_name",
  DECORATOR: "decorator"
}

// ─── Simple Tokenizer ───────────────────────────────────────

var COMMON_KEYWORDS = {
  python: ["def", "class", "import", "from", "return", "if", "elif", "else", "for", "while", "try", "except", "finally", "with", "as", "yield", "lambda", "pass", "break", "continue", "raise", "and", "or", "not", "in", "is", "None", "True", "False", "global", "nonlocal", "assert", "del", "async", "await"],
  javascript: ["function", "const", "let", "var", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "try", "catch", "finally", "throw", "new", "delete", "typeof", "instanceof", "void", "this", "class", "extends", "super", "import", "export", "default", "from", "async", "await", "yield", "true", "false", "null", "undefined"],
  typescript: ["function", "const", "let", "var", "return", "if", "else", "for", "while", "interface", "type", "enum", "namespace", "declare", "implements", "extends", "abstract", "readonly", "as", "is", "keyof", "typeof", "infer", "never", "unknown", "any", "void", "true", "false", "null", "undefined"],
  java: ["public", "private", "protected", "static", "final", "abstract", "class", "interface", "extends", "implements", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "try", "catch", "finally", "throw", "throws", "new", "this", "super", "import", "package", "void", "int", "double", "float", "boolean", "String", "true", "false", "null"]
}

function tokenize(code, language) {
  language = language || "javascript"
  var keywords = COMMON_KEYWORDS[language] || COMMON_KEYWORDS.javascript
  var tokens = []
  var lines = code.split("\n")

  lines.forEach(function(line, lineIndex) {
    var i = 0
    while (i < line.length) {
      // Whitespace
      if (/\s/.test(line[i])) {
        var ws = ""
        while (i < line.length && /\s/.test(line[i])) {
          ws += line[i]; i++
        }
        tokens.push({ type: TOKEN_TYPES.WHITESPACE, value: ws, line: lineIndex + 1 })
        continue
      }

      // Single-line comment
      if (line.substr(i, 2) === "//" || (language === "python" && line[i] === "#")) {
        tokens.push({ type: TOKEN_TYPES.COMMENT, value: line.substring(i), line: lineIndex + 1 })
        i = line.length
        continue
      }

      // String
      if (line[i] === '"' || line[i] === "'" || line[i] === "`") {
        var quote = line[i]
        var str = quote; i++
        while (i < line.length && line[i] !== quote) {
          if (line[i] === "\\") { str += line[i]; i++ }
          if (i < line.length) { str += line[i]; i++ }
        }
        if (i < line.length) { str += line[i]; i++ }
        tokens.push({ type: TOKEN_TYPES.STRING, value: str, line: lineIndex + 1 })
        continue
      }

      // Number
      if (/\d/.test(line[i])) {
        var num = ""
        while (i < line.length && /[\d.xXeE_abcdefABCDEF]/.test(line[i])) {
          num += line[i]; i++
        }
        tokens.push({ type: TOKEN_TYPES.NUMBER, value: num, line: lineIndex + 1 })
        continue
      }

      // Decorator/Annotation
      if (line[i] === "@") {
        var dec = "@"; i++
        while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) {
          dec += line[i]; i++
        }
        tokens.push({ type: TOKEN_TYPES.DECORATOR, value: dec, line: lineIndex + 1 })
        continue
      }

      // Identifier or keyword
      if (/[a-zA-Z_$]/.test(line[i])) {
        var id = ""
        while (i < line.length && /[a-zA-Z0-9_$]/.test(line[i])) {
          id += line[i]; i++
        }

        if (keywords.indexOf(id) !== -1) {
          tokens.push({ type: TOKEN_TYPES.KEYWORD, value: id, line: lineIndex + 1 })
        } else if (i < line.length && line[i] === "(") {
          tokens.push({ type: TOKEN_TYPES.FUNCTION, value: id, line: lineIndex + 1 })
        } else if (id[0] === id[0].toUpperCase() && id[0] !== "_") {
          tokens.push({ type: TOKEN_TYPES.CLASS_NAME, value: id, line: lineIndex + 1 })
        } else {
          tokens.push({ type: TOKEN_TYPES.IDENTIFIER, value: id, line: lineIndex + 1 })
        }
        continue
      }

      // Operators
      if (/[+\-*/%=\u003c\u003e!&|^~?:]/.test(line[i])) {
        var op = line[i]; i++
        if (i < line.length && /[=\u003e\u003c&|+\-]/.test(line[i])) { op += line[i]; i++ }
        tokens.push({ type: TOKEN_TYPES.OPERATOR, value: op, line: lineIndex + 1 })
        continue
      }

      // Punctuation
      tokens.push({ type: TOKEN_TYPES.PUNCTUATION, value: line[i], line: lineIndex + 1 })
      i++
    }

    // End of line marker
    if (lineIndex < lines.length - 1) {
      tokens.push({ type: TOKEN_TYPES.WHITESPACE, value: "\n", line: lineIndex + 1 })
    }
  })

  return tokens
}

// ─── Line Numbering ──────────────────────────────────────────

function addLineNumbers(code, startLine) {
  startLine = startLine || 1
  var lines = code.split("\n")
  var padWidth = String(startLine + lines.length - 1).length

  return lines.map(function(line, i) {
    var num = String(startLine + i)
    while (num.length < padWidth) num = " " + num
    return num + " │ " + line
  }).join("\n")
}

// ─── Indentation Normalizer ──────────────────────────────────

function normalizeIndentation(code, options) {
  options = options || {}
  var tabSize = options.tabSize || 4
  var useSpaces = options.useSpaces !== false

  var lines = code.split("\n")

  // Convert tabs to spaces
  lines = lines.map(function(line) {
    return line.replace(/\t/g, " ".repeat(tabSize))
  })

  // Find minimum indentation (ignoring blank lines)
  var minIndent = Infinity
  lines.forEach(function(line) {
    if (line.trim().length > 0) {
      var indent = line.length - line.trimStart().length
      if (indent < minIndent) minIndent = indent
    }
  })

  // Remove common leading whitespace
  if (minIndent > 0 && minIndent < Infinity) {
    lines = lines.map(function(line) {
      return line.substring(Math.min(minIndent, line.length - line.trimStart().length))
    })
  }

  return lines.join("\n")
}

// ─── Code Statistics ─────────────────────────────────────────

function getCodeStats(code, language) {
  var tokens = tokenize(code, language)
  var stats = {
    totalTokens: tokens.length,
    keywords: 0,
    strings: 0,
    comments: 0,
    functions: 0,
    numbers: 0,
    operators: 0,
    identifiers: 0,
    uniqueIdentifiers: new Set(),
    decorators: 0
  }

  tokens.forEach(function(t) {
    switch (t.type) {
      case TOKEN_TYPES.KEYWORD: stats.keywords++; break
      case TOKEN_TYPES.STRING: stats.strings++; break
      case TOKEN_TYPES.COMMENT: stats.comments++; break
      case TOKEN_TYPES.FUNCTION: stats.functions++; break
      case TOKEN_TYPES.NUMBER: stats.numbers++; break
      case TOKEN_TYPES.OPERATOR: stats.operators++; break
      case TOKEN_TYPES.DECORATOR: stats.decorators++; break
      case TOKEN_TYPES.IDENTIFIER:
        stats.identifiers++
        stats.uniqueIdentifiers.add(t.value)
        break
    }
  })

  stats.uniqueIdentifierCount = stats.uniqueIdentifiers.size
  delete stats.uniqueIdentifiers

  return stats
}

// ─── Exports ─────────────────────────────────────────────────

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    detectLanguage: detectLanguage,
    tokenize: tokenize,
    addLineNumbers: addLineNumbers,
    normalizeIndentation: normalizeIndentation,
    getCodeStats: getCodeStats,
    TOKEN_TYPES: TOKEN_TYPES,
    LANGUAGE_PATTERNS: LANGUAGE_PATTERNS
  }
}

if (typeof globalThis !== "undefined") {
  globalThis.CodeFormatter = {
    detectLanguage: detectLanguage,
    tokenize: tokenize,
    addLineNumbers: addLineNumbers,
    normalizeIndentation: normalizeIndentation,
    getCodeStats: getCodeStats,
    TOKEN_TYPES: TOKEN_TYPES
  }
}
