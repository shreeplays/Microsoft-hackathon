import { parseCodeToIR } from "./ast_to_ir.js"
import { irToGraph } from "./ir_to_graph.js"
import { graphToMermaid, toClassDiagram, toCallGraph } from "./graph_to_mermaid.js"
import { cleanMermaid } from "./cleanmermaid.js"


export function runParser(code){

    const ir = parseCodeToIR(code)

    const graph = irToGraph(ir)

    let mermaid = graphToMermaid(graph)

    mermaid = cleanMermaid(mermaid)

    const classDiagram = cleanMermaid(
        toClassDiagram(ir)
    )

    const callGraph = cleanMermaid(
        toCallGraph(ir)
    )

    return {
        ir,
        graph,
        mermaid,
        classDiagram,
        callGraph
    }

}