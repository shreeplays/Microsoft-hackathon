"""
FastAPI backend — AI Code Visualizer (FINAL STABLE VERSION)
"""

from __future__ import annotations

import os
import subprocess
import tempfile
import json
from typing import Any

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai.ai_service import analyze_code

# 🔥 API KEY
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
print("OPENROUTER_API_KEY:", "FOUND" if OPENROUTER_API_KEY else "MISSING")

app = FastAPI(
    title="AI Code Visualizer",
    version="3.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# MODELS

class VisualizeRequest(BaseModel):
    code: str
    question: str = ""
    filename: str = "snippet.py"


class ChatRequest(BaseModel):
    code: str
    question: str


class VisualizeMultiRequest(BaseModel):
    files: dict[str, str]


class VisualizeResponse(BaseModel):
    flowchart: str
    architecture: str
    sequence: str
    class_diagram: str
    call_graph: str

    mermaid: str
    nodes: list
    edges: list

    explanation: str
    workflow: list[str]
    summary: str

    dependencies: list[str]
    complexity: str
    cached: bool
    filename: str
    code_context: str = ""


# ─────────────────────────────────────────────
# AST PIPELINE

def _run_ast_pipeline(code: str):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".py", mode="w", encoding="utf-8") as f:
            f.write(code)
            temp_file = f.name

        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        parser_path = os.path.join(base_dir, "backend-js", "runParser.js")

        result = subprocess.run(
            ["node", parser_path, temp_file],
            capture_output=True,
            text=True,
            timeout=5   # 🔥 prevents hanging
        )

        data = json.loads(result.stdout or "{}")

        graph = data.get("graph", {})
        mermaid = data.get("mermaid", "")

        nodes = [{"id": k, **v} for k, v in graph.get("nodes", {}).items()]
        edges = [{"from": e[0], "to": e[1]} for e in graph.get("edges", [])]

        return mermaid, nodes, edges

    except Exception as e:
        print("JS PARSER ERROR:", e)
        return "graph TD; Error-->End", [], []


# ─────────────────────────────────────────────
# ROUTES

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/visualize", response_model=VisualizeResponse)
async def visualize(req: VisualizeRequest):

    if not req.code.strip():
        raise HTTPException(status_code=422, detail="Code is empty")

    print("📥 Request received")

    mermaid, nodes, edges = _run_ast_pipeline(req.code)

    ai = analyze_code(
        code=req.code,
        question=req.question,
        api_key=OPENROUTER_API_KEY,
    )

    print("📤 AI response received")

    # 🔥 DEBUG (IMPORTANT)
    if not isinstance(ai, dict):
        print("❌ AI RETURN INVALID:", ai)
        ai = {}

    print("✅ FINAL KEYS:", list(ai.keys()))

    # 🔥 FINAL SAFE RESPONSE (THIS FIXES YOUR UI FREEZE)
    return {
        "flowchart": ai.get("flowchart") or mermaid or "graph TD; Start-->End",
        "architecture": ai.get("architecture") or "graph TD; User-->Backend",
        "sequence": ai.get("sequence") or "sequenceDiagram\nUser->>Backend: request",
        "class_diagram": ai.get("class_diagram") or "",
        "call_graph": ai.get("call_graph") or "graph LR; A-->B",

        # 🔥 CRITICAL FOR FRONTEND
        "mermaid": mermaid or "graph TD; Start-->End",
        "nodes": nodes if isinstance(nodes, list) else [],
        "edges": edges if isinstance(edges, list) else [],

        "explanation": ai.get("explanation") or "No explanation available",
        "workflow": ai.get("workflow") if isinstance(ai.get("workflow"), list) else ["Start", "End"],
        "summary": ai.get("summary") or "Analysis complete",

        "dependencies": ai.get("dependencies") if isinstance(ai.get("dependencies"), list) else [],

        # 🔥 FIXED COMPLEXITY (ALWAYS STRING)
        "complexity": str(ai.get("complexity") or "O(n)"),

        "cached": bool(ai.get("_cached", False)),
        "filename": req.filename,
        "code_context": req.code
    }


@app.post("/chat")
async def chat(req: ChatRequest):
    from ai.ai_service import chat_with_code
    
    print(f"💬 Chat request: {req.question[:50]}...")
    print("calling ai asssisntant")
    
    response_text = chat_with_code(
        code=req.code,
        question=req.question,
        api_key=OPENROUTER_API_KEY
    )
    
    return {"response": response_text}


@app.delete("/cache")
async def clear_cache():
    from ai.ai_service import _cache
    _cache.clear()
    return {"status": "cleared"}


@app.post("/visualize/multi", response_model=VisualizeResponse)
async def visualize_multi(req: VisualizeMultiRequest):

    if not req.files:
        raise HTTPException(status_code=422, detail="Files map is empty")

    print(f"📥 Multi Request received with {len(req.files)} files")

    code_parts = []
    for filename, code in req.files.items():
        code_parts.append(f"=== FILE: {filename} ===\n{code}\n")
    
    combined_code = "\n".join(code_parts)

    mermaid, nodes, edges = _run_ast_pipeline(combined_code)

    ai = analyze_code(
        code=combined_code,
        question="Analyze this multi-file workspace architecture.",
        api_key=OPENROUTER_API_KEY,
    )

    print("📤 AI response received for multi-file workspace")

    if not isinstance(ai, dict):
        ai = {}

    return {
        "flowchart": ai.get("flowchart") or mermaid or "graph TD; Start-->End",
        "architecture": ai.get("architecture") or "graph TD; Workspace-->Files",
        "sequence": ai.get("sequence") or "sequenceDiagram\nUser->>Workspace: visualizes",
        "class_diagram": ai.get("class_diagram") or "",
        "call_graph": ai.get("call_graph") or "graph LR; A-->B",

        "mermaid": mermaid or "graph TD; Start-->End",
        "nodes": nodes if isinstance(nodes, list) else [],
        "edges": edges if isinstance(edges, list) else [],

        "explanation": ai.get("explanation") or "Workspace analyzed.",
        "workflow": ai.get("workflow") if isinstance(ai.get("workflow"), list) else ["Read files", "End"],
        "summary": ai.get("summary") or "Workspace Analysis complete",

        "dependencies": ai.get("dependencies") if isinstance(ai.get("dependencies"), list) else [],

        "complexity": str(ai.get("complexity") or "O(n)"),

        "cached": bool(ai.get("_cached", False)),
        "filename": "workspace",
        "code_context": combined_code
    }