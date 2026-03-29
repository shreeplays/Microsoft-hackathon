import { spawnSync } from "child_process"
import path from "path"
import { fileURLToPath } from "url"

// 🔥 Fix for ES module __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function runParser(filePath) {

    // 🔥 FIX 1: correct absolute path to Python parser
    const parserPath = path.resolve(__dirname, "../backend/parser/main.py")

    const python = spawnSync(
        "python",
        [parserPath, filePath],
        { encoding: "utf-8" }
    )

    // 🔥 Handle execution errors
    if (python.error) {
        console.error("❌ Python execution error:", python.error)
        return { graph: {}, mermaid: "" }
    }

    // 🔥 Debug Python stderr
    if (python.stderr) {
        console.error("🔥 PYTHON STDERR:", python.stderr)
    }

    // 🔥 FIX 2: safe JSON parsing (prevents crash)
    try {
        return JSON.parse(python.stdout || "{}")
    } catch (e) {
        console.error("❌ Invalid JSON from Python")
        console.error("Python Output:", python.stdout)
        return { graph: {}, mermaid: "" }   // ✅ fallback instead of crash
    }
}


// CLI support
if (process.argv[2]) {

    const file = process.argv[2]

    const result = runParser(file)

    console.log(JSON.stringify(result, null, 2))
}