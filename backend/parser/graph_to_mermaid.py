"""
graph_to_mermaid.py — Convert graph dict to Mermaid diagram strings.
Generates: flowchart, call graph, class diagram.
"""
from __future__ import annotations

import re
from typing import Any


def _safe_id(s: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_]", "_", s)


def _quoted(label: str) -> str:
    """Wrap label in Mermaid double-quotes, escaping internal quotes."""
    return '"' + label.replace('"', "'") + '"'


def graph_to_mermaid(graph: dict[str, Any]) -> str:
    """Primary export: flowchart (TD) showing all nodes and edges."""
    return _to_flowchart(graph)


def _to_flowchart(graph: dict[str, Any]) -> str:
    nodes = graph.get("nodes", {})
    edges = graph.get("edges", [])

    lines = ["graph TD"]

    # Emit node shapes
    for nid, data in nodes.items():
        label = data.get("label", nid)
        ntype = data.get("type", "function")
        safe = _safe_id(nid)
        q = _quoted(label)
        if ntype == "class":
            lines.append(f"  {safe}[/{q}/]")
        elif ntype in ("entry", "exit"):
            lines.append(f"  {safe}(({q}))")
        elif ntype == "async_function":
            lines.append(f"  {safe}>{q}]")
        else:
            lines.append(f"  {safe}[{q}]")

    # Emit edges
    for edge in edges:
        src, dst = _safe_id(edge[0]), _safe_id(edge[1])
        label = edge[2] if len(edge) > 2 else ""
        if label:
            lines.append(f"  {src} -->|{label}| {dst}")
        else:
            lines.append(f"  {src} --> {dst}")

    return "\n".join(lines)


def to_class_diagram(ir: dict[str, Any]) -> str:
    """Generate a Mermaid classDiagram from IR."""
    lines = ["classDiagram"]
    classes = ir.get("classes", [])

    for cls in classes:
        name = cls["name"]
        lines.append(f"  class {name} {{")
        for attr in cls.get("attributes", [])[:6]:
            lines.append(f"    +{attr}")
        for method in cls.get("methods", [])[:8]:
            lines.append(f"    +{method}()")
        lines.append("  }")

    # Inheritance
    for cls in classes:
        for base in cls.get("bases", []):
            base_clean = base.split("[")[0].split("(")[0]
            if any(c["name"] == base_clean for c in classes):
                lines.append(f"  {base_clean} <|-- {cls['name']}")

    return "\n".join(lines) if len(lines) > 1 else ""


def to_call_graph(ir: dict[str, Any]) -> str:
    """Generate a Mermaid call graph (LR) from IR."""
    funcs = ir.get("functions", [])
    if not funcs:
        return ""

    known_names = {f["name"] for f in funcs}
    lines = ["graph LR"]
    seen_edges: set[tuple[str, str]] = set()

    for func in funcs:
        fid = _safe_id(func["name"])
        lines.append(f"  {fid}[{_quoted(func['name'])}]")
        for callee in func.get("calls", []):
            if callee in known_names and callee != func["name"]:
                cid = _safe_id(callee)
                edge = (fid, cid)
                if edge not in seen_edges:
                    lines.append(f"  {fid} --> {cid}")
                    seen_edges.add(edge)

    return "\n".join(lines)