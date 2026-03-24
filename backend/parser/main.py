import ast
import json

from ast_to_ir import parse_code_to_ir
from ir_to_graph import ir_to_graph


code = """
for i in range(5):
    if i % 2 == 0:
        print(i)
"""

tree = ast.parse(code)

ir = parse_code_to_ir(code)

graph = ir_to_graph(ir)

print(json.dumps(graph, indent=2))

from graph_to_mermaid import graph_to_mermaid

mermaid = graph_to_mermaid(graph)

print(mermaid)