"""
ir_to_graph.py — Convert IR dict into a graph of nodes and edges.

Graph schema:
{
  "nodes": { node_id: {"label": str, "type": str, "meta": dict} },
  "edges": [(from_id, to_id, label)],
}
"""
from __future__ import annotations

import re
from typing import Any


def ir_to_graph(ir: dict[str, Any]) -> dict[str, Any]:
    nodes: dict[str, dict] = {}
    edges: list[tuple[str, str, str]] = []

    def _safe_id(name: str) -> str:
        return re.sub(r"[^a-zA-Z0-9_]", "_", name)

    # ── Functions ─────────────────────────────────────────────────────────────
    for func in ir.get("functions", []):
        fid = _safe_id(func["name"])
        label = func["name"]
        if func["args"]:
            label += f"({', '.join(func['args'][:3])}{'...' if len(func['args']) > 3 else ''})"
        nodes[fid] = {
            "label": label,
            "type": "async_function" if func["is_async"] else "function",
            "meta": {
                "lineno": func["lineno"],
                "decorators": func.get("decorators", []),
            },
        }
        # Call edges
        for callee in func.get("calls", []):
            callee_id = _safe_id(callee)
            # Only add edge if callee is a known function in this file
            known = {_safe_id(f["name"]) for f in ir.get("functions", [])}
            if callee_id in known and callee_id != fid:
                edges.append((fid, callee_id, "calls"))

    # ── Classes ───────────────────────────────────────────────────────────────
    for cls in ir.get("classes", []):
        cid = _safe_id(cls["name"])
        nodes[cid] = {
            "label": cls["name"],
            "type": "class",
            "meta": {
                "lineno": cls["lineno"],
                "methods": cls.get("methods", []),
                "attributes": cls.get("attributes", []),
            },
        }
        # Inheritance edges
        for base in cls.get("bases", []):
            base_id = _safe_id(base)
            if base_id in nodes:
                edges.append((cid, base_id, "extends"))

    # ── Control flow nodes (only if no functions) ─────────────────────────────
    if not ir.get("functions") and not ir.get("classes"):
        prev_id: str | None = None
        for i, cf in enumerate(ir.get("control_flow", [])[:8]):
            cid = f"cf_{i}"
            nodes[cid] = {
                "label": f"{cf['type']}: {cf['test'][:30]}",
                "type": "control",
                "meta": {"lineno": cf["lineno"]},
            }
            if prev_id:
                edges.append((prev_id, cid, ""))
            prev_id = cid

    # ── Entry / exit for call graph ────────────────────────────────────────────
    if not nodes:
        nodes["start"] = {"label": "Start", "type": "entry", "meta": {}}
        nodes["end"] = {"label": "End", "type": "exit", "meta": {}}
        edges.append(("start", "end", ""))

    return {"nodes": nodes, "edges": edges}