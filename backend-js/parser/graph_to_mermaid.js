/*
graphToMermaid.js — Convert graph dict to Mermaid diagram strings
Generates:
- flowchart
- class diagram
- call graph
*/

function safeId(s){

    return s.replace(/[^a-zA-Z0-9_]/g,"_")

}


function quoted(label){

    return `"${label.replace(/"/g,"'")}"`

}


// ─────────────────────────────────────────────
// Primary export

export function graphToMermaid(graph){

    return toFlowchart(graph)

}


// ─────────────────────────────────────────────
// Flowchart

function toFlowchart(graph){

    const nodes = graph.nodes || {}
    const edges = graph.edges || []

    const lines = ["graph TD"]


    // ───── Nodes ─────

    Object.entries(nodes).forEach(([nid,data])=>{

        const label = data.label || nid

        const type = data.type || "function"

        const safe = safeId(nid)

        const q = quoted(label)


        if(type==="class"){

            lines.push(`  ${safe}[/${q}/]`)

        }
        else if(type==="entry" || type==="exit"){

            lines.push(`  ${safe}((${q}))`)

        }
        else if(type==="async_function"){

            lines.push(`  ${safe}>${q}]`)

        }
        else{

            lines.push(`  ${safe}[${q}]`)

        }

    })


    // ───── Edges ─────

    edges.forEach(edge=>{

        const src = safeId(edge.from || edge[0])

        const dst = safeId(edge.to || edge[1])

        const label = edge.label || edge[2] || ""

        if(label){

            lines.push(`  ${src} -->|${label}| ${dst}`)

        }else{

            lines.push(`  ${src} --> ${dst}`)

        }

    })


    return lines.join("\n")

}


// ─────────────────────────────────────────────
// Class Diagram

export function toClassDiagram(ir){

    const lines = ["classDiagram"]

    const classes = ir.classes || []


    classes.forEach(cls=>{

        const name = cls.name

        lines.push(`  class ${name} {`)


        (cls.attributes || []).slice(0,6).forEach(attr=>{

            lines.push(`    +${attr}`)

        })


        (cls.methods || []).slice(0,8).forEach(method=>{

            lines.push(`    +${method}()`)

        })


        lines.push("  }")

    })


    // inheritance

    classes.forEach(cls=>{

        (cls.bases || []).forEach(base=>{

            const clean = base.split("[")[0].split("(")[0]

            const exists = classes.some(c=>c.name===clean)

            if(exists){

                lines.push(`  ${clean} <|-- ${cls.name}`)

            }

        })

    })


    return lines.length>1 ? lines.join("\n") : ""

}


// ─────────────────────────────────────────────
// Call Graph

export function toCallGraph(ir){

    const funcs = ir.functions || []

    if(!funcs.length) return ""


    const known = new Set(
        funcs.map(f=>f.name)
    )

    const lines = ["graph LR"]

    const seen = new Set()


    funcs.forEach(func=>{

        const fid = safeId(func.name)

        lines.push(`  ${fid}[${quoted(func.name)}]`)


        (func.calls || []).forEach(callee=>{

            if(
                known.has(callee) &&
                callee !== func.name
            ){

                const cid = safeId(callee)

                const edge = `${fid}-${cid}`

                if(!seen.has(edge)){

                    lines.push(`  ${fid} --> ${cid}`)

                    seen.add(edge)

                }

            }

        })

    })


    return lines.join("\n")

}