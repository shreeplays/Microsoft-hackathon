"""
graph_to_mermaid.py — Convert graph dict to Mermaid diagram strings.
Generates: flowchart, call graph, class diagram.
"""

import re


def _safe_id(s):
    return re.sub(r"[^a-zA-Z0-9_]", "_", str(s))


def _quoted(label):
    return '"' + str(label).replace('"', "'") + '"'


# ─────────────────────────────────────────────
# FLOWCHART


def graph_to_mermaid(graph):

    return _to_flowchart(graph)


def _to_flowchart(graph):

    nodes = graph.get("nodes", {})
    edges = graph.get("edges", [])

    lines = ["flowchart TD"]

    # ───────── Nodes

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

        elif ntype == "control":
            lines.append(f"  {safe}{{{q}}}")

        elif ntype == "call":
            lines.append(f"  {safe}([{q}])")

        else:
            lines.append(f"  {safe}[{q}]")

    # ───────── Edges

    for edge in edges:

        if isinstance(edge, dict):
            src = _safe_id(edge.get("from"))
            dst = _safe_id(edge.get("to"))
            label = edge.get("label", "")

        else:
            src = _safe_id(edge[0])
            dst = _safe_id(edge[1])
            label = edge[2] if len(edge) > 2 else ""

        if label:
            lines.append(f"  {src} -->|{label}| {dst}")
        else:
            lines.append(f"  {src} --> {dst}")

    return "\n".join(lines)


# ─────────────────────────────────────────────
# CLASS DIAGRAM


def to_class_diagram(ir):

    lines = ["classDiagram"]

    classes = ir.get("classes", [])

    for cls in classes:

        name = cls.get("name")

        lines.append(f"  class {name} {{")

        for attr in cls.get("attributes", [])[:6]:
            lines.append(f"    +{attr}")

        for method in cls.get("methods", [])[:8]:
            lines.append(f"    +{method}()")

        lines.append("  }")

    # inheritance

    for cls in classes:

        for base in cls.get("bases", []):

            base_clean = base.split("[")[0].split("(")[0]

            for c in classes:
                if c.get("name") == base_clean:
                    lines.append(f"  {base_clean} <|-- {cls['name']}")

    if len(lines) == 1:
        return ""

    return "\n".join(lines)


# ─────────────────────────────────────────────
# CALL GRAPH


def to_call_graph(ir):

    funcs = ir.get("functions", [])

    if not funcs:
        return ""

    known = {f["name"] for f in funcs}

    lines = ["flowchart LR"]

    seen = set()

    for func in funcs:

        fid = _safe_id(func["name"])

        lines.append(f"  {fid}[{_quoted(func['name'])}]")

        for callee in func.get("calls", []):

            if callee in known and callee != func["name"]:

                cid = _safe_id(callee)

                edge = (fid, cid)

                if edge not in seen:
                    lines.append(f"  {fid} --> {cid}")
                    seen.add(edge)

    return "\n".join(lines)


def to_architecture(ir):
    """Generates a high-level system diagram showing module/class interactions."""
    lines = ["graph TD"]
    classes = ir.get("classes", [])
    if not classes:
        return "graph TD\n  UnknownModule[Unknown Module]"

    for c in classes:
        name = c.get("name")
        cid = _safe_id(name)
        lines.append(f"  {cid}[{_quoted(name)}]")
        for base in c.get("bases", []):
            bid = _safe_id(base)
            lines.append(f"  {bid} -.-> {cid}")
    return "\n".join(lines)


def to_sequence(ir):
    """Generates a sequence diagram based on function call order in the IR."""
    funcs = ir.get("functions", [])
    if not funcs:
        return "sequenceDiagram\n  User->>+System: call\n  System-->>-User: return"

    lines = ["sequenceDiagram", "  actor User"]
    for func in funcs[:4]:
        name = func["name"]
        fid = _safe_id(name)
        lines.append(f"  participant {fid} as {name}")
        lines.append(f"  User->>+ {fid}: call")
        for call in func.get("calls", [])[:2]:
            cid = _safe_id(call)
            lines.append(f"  {fid}->> {cid}: invoke")
        lines.append(f"  {fid}-->>- User: return")
    return "\n".join(lines)