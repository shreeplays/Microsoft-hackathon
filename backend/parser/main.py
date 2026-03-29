import sys
import json

from ast_to_ir import parse_code_to_ir
from ir_to_graph import ir_to_graph
from graph_to_mermaid import graph_to_mermaid, to_class_diagram, to_call_graph, to_architecture, to_sequence


def run(file):

    with open(file, "r", encoding="utf-8") as f:
        code = f.read()

    ir = parse_code_to_ir(code)

    graph = ir_to_graph(ir)

    mermaid = graph_to_mermaid(graph)

    return {
        "ir": ir,
        "graph": graph,
        "flowchart": mermaid,
        "class_diagram": to_class_diagram(ir),
        "call_graph": to_call_graph(ir),
        "architecture": to_architecture(ir),
        "sequence": to_sequence(ir),
        "code_context": code
    }


if __name__ == "__main__":

    file = sys.argv[1]

    result = run(file)

    print(json.dumps(result))