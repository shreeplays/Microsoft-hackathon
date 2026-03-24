"""
FastAPI backend — AI Code Visualizer
"""

from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai.ai_service import analyze_code
from parser.ast_to_ir import parse_code_to_ir
from parser.ir_to_graph import ir_to_graph
from parser.graph_to_mermaid import graph_to_mermaid


app = FastAPI(
    title="AI Code Visualizer",
    version="2.0.0",
    description="Analyze Python code and generate diagrams + explanations.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")


# ─────────────────────────────────────────────
# MODELS

class VisualizeRequest(BaseModel):
    code: str = Field(..., description="Python source code to analyse")
    question: str = Field("", description="Optional follow-up question")
    filename: str = Field("snippet.py", description="Filename hint")


class MultiFileRequest(BaseModel):
    files: dict[str, str] = Field(..., description="filename → code")
    question: str = Field("", description="Optional question")
    entry_point: str = Field("", description="Main file")


class VisualizeResponse(BaseModel):
    flowchart: str
    architecture: str
    sequence: str
    class_diagram: str
    call_graph: str

    mermaid: str
    nodes: list[dict]
    edges: list[dict]

    explanation: str
    workflow: list[str]
    summary: str

    dependencies: list[str]
    complexity: str
    cached: bool
    filename: str


# ─────────────────────────────────────────────
# AST PIPELINE

def _run_ast_pipeline(code: str):
    try:
        ir = parse_code_to_ir(code)
        graph = ir_to_graph(ir)

        mermaid = graph_to_mermaid(graph)

        nodes = [{"id": n, **graph["nodes"].get(n, {})} for n in graph["nodes"]]
        edges = [{"from": e[0], "to": e[1]} for e in graph["edges"]]

        return mermaid, nodes, edges

    except Exception as e:
        return f"graph TD\nError[{str(e)}]", [], []


# ─────────────────────────────────────────────
# ROUTES

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/visualize", response_model=VisualizeResponse)
async def visualize(req: VisualizeRequest):

    if not req.code.strip():
        raise HTTPException(status_code=422, detail="Code is empty")

    mermaid, nodes, edges = _run_ast_pipeline(req.code)

    # 🔥 FIX: NO await here
    ai = analyze_code(
        code=req.code,
        question=req.question,
        api_key=OPENROUTER_API_KEY,
    )

    return {
        "flowchart": ai.get("flowchart", mermaid),
        "architecture": ai.get("architecture", ""),
        "sequence": ai.get("sequence", ""),
        "class_diagram": ai.get("class_diagram", ""),
        "call_graph": ai.get("call_graph", ""),

        "mermaid": mermaid,
        "nodes": nodes,
        "edges": edges,

        "explanation": ai.get("explanation", ""),
        "workflow": ai.get("workflow", []),
        "summary": ai.get("summary", ""),

        "dependencies": ai.get("dependencies", []),
        "complexity": ai.get("complexity", "medium"),
        "cached": ai.get("_cached", False),

        "filename": req.filename,
    }


@app.post("/visualize/multi")
async def visualize_multi(req: MultiFileRequest):

    if not req.files:
        raise HTTPException(status_code=422, detail="No files provided")

    combined = "\n\n".join(
        f"# FILE: {name}\n{code}"
        for name, code in req.files.items()
    )

    mermaid, nodes, edges = _run_ast_pipeline(combined)

    question = req.question or "Explain the architecture of this project"

    # 🔥 FIX: NO await here
    ai = analyze_code(
        code=combined,
        question=question,
        api_key=OPENROUTER_API_KEY,
    )

    return {
        "files": list(req.files.keys()),
        "flowchart": ai.get("flowchart", mermaid),
        "architecture": ai.get("architecture", ""),
        "sequence": ai.get("sequence", ""),
        "class_diagram": ai.get("class_diagram", ""),
        "call_graph": ai.get("call_graph", ""),

        "mermaid": mermaid,
        "nodes": nodes,
        "edges": edges,

        "explanation": ai.get("explanation", ""),
        "workflow": ai.get("workflow", []),
        "summary": ai.get("summary", ""),

        "dependencies": ai.get("dependencies", []),
        "complexity": ai.get("complexity", "medium"),
        "cached": ai.get("_cached", False),
    }


@app.delete("/cache")
async def clear_cache():
    from ai.ai_service import _cache
    _cache.clear()
    return {"status": "cleared"}