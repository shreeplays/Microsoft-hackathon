/*
cleanMermaid.js

Clean and optimize Mermaid diagrams:
- remove duplicate edges
- remove duplicate nodes
- limit large graphs
- improve readability
- fix layout
*/

export function cleanMermaid(mermaid){

    if(!mermaid) return ""

    let lines = mermaid.split("\n")

    const seen = new Set()
    const cleaned = []

    // ─────────────────────────────
    // Remove duplicate lines

    lines.forEach(line=>{

        const trimmed = line.trim()

        if(!seen.has(trimmed)){

            cleaned.push(line)
            seen.add(trimmed)

        }

    })

    lines = cleaned


    // ─────────────────────────────
    // Convert graph TD → flowchart TD

    if(lines[0].includes("graph TD")){

        lines[0] = "flowchart TD"

    }


    // ─────────────────────────────
    // Limit large graphs

    const MAX_LINES = 120

    if(lines.length > MAX_LINES){

        const header = lines[0]

        const body = lines.slice(1, MAX_LINES)

        body.push("  more[\"... Large graph truncated ...\"]")

        lines = [header, ...body]

    }


    // ─────────────────────────────
    // Clean empty lines

    lines = lines.filter(line => line.trim() !== "")


    // ─────────────────────────────
    // Improve spacing

    const spaced = []

    lines.forEach(line=>{

        spaced.push(line)

        if(line.includes("-->")){
            spaced.push("")
        }

    })


    return spaced.join("\n")

}