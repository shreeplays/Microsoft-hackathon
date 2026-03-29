"""
ir_to_graph.py — Convert IR dict into a graph of nodes and edges.
"""

from __future__ import annotations

import re
from typing import Any


def ir_to_graph(ir: dict[str, Any]) -> dict[str, Any]:

    nodes = {}
    edges = []

    def safe(name: str):
        return re.sub(r"[^a-zA-Z0-9_]", "_", str(name))


    # Build function lookup
    func_map = {
        f["name"]: f
        for f in ir.get("functions", [])
    }


    visited = set()


    # ─────────────────────────────────────────────
    # Expand Function (Hybrid)

    def expand_function(func_name, parent=None):

        if func_name not in func_map:
            return None

        func = func_map[func_name]

        fid = safe(func["name"])

        if fid not in nodes:

            label = func["name"]

            if func["args"]:
                label += f"({', '.join(func['args'][:3])})"

            nodes[fid] = {
                "label": label,
                "type": "async_function" if func["is_async"] else "function",
                "meta": {
                    "lineno": func["lineno"]
                }
            }

        if parent:
            edges.append((parent, fid, ""))

        prev = fid


        # ───────── Control Flow

        for i, cf in enumerate(func.get("control_flow", [])):

            cid = f"{fid}_cf_{i}"

            nodes[cid] = {
                "label": f"{cf['type']} {cf['test'][:30]}",
                "type": "control",
                "meta": {
                    "lineno": cf["lineno"]
                }
            }

            edges.append((prev, cid, ""))

            prev = cid


        # ───────── Calls

        for call in func.get("calls", []):

            call_id = safe(call)

            if call in func_map:

                # create call node

                cid = f"{prev}_{call_id}"

                nodes[cid] = {
                    "label": call,
                    "type": "call",
                    "meta": {}
                }

                edges.append((prev, cid, ""))

                # expand inside

                expand_function(call, cid)

                prev = cid

            else:

                cid = f"{prev}_{call}"

                nodes[cid] = {
                    "label": call,
                    "type": "call",
                    "meta": {}
                }

                edges.append((prev, cid, ""))

                prev = cid

        return fid


    # ─────────────────────────────────────────────
    # Entry Points (All top-level functions)

    if ir.get("functions"):
        nodes["start"] = {
            "label": "Start",
            "type": "entry",
            "meta": {}
        }

        # Connect all top-level functions to Start
        for func in ir["functions"]:
            # Basic heuristic: if it's in the IR, it's top-level unless it's a method
            # (IR 'functions' list currently only contains top-level or method nodes depending on parser)
            expand_function(func["name"], "start")


    # ─────────────────────────────────────────────
    # Classes

    for cls in ir.get("classes", []):

        cid = safe(cls["name"])

        nodes[cid] = {
            "label": cls["name"],
            "type": "class",
            "meta": {
                "lineno": cls["lineno"]
            }
        }

        for base in cls.get("bases", []):

            bid = safe(base)

            if bid in nodes:

                edges.append((cid, bid, "extends"))


    # ─────────────────────────────────────────────
    # Empty

    if not nodes:

        nodes["start"] = {
            "label": "Start",
            "type": "entry",
            "meta": {}
        }

        nodes["end"] = {
            "label": "End",
            "type": "exit",
            "meta": {}
        }

        edges.append(("start", "end", ""))


    return {
        "nodes": nodes,
        "edges": edges
    }