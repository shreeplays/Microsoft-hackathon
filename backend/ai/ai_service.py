"""
AI Service — Stable + Fast + Non-blocking
"""

from __future__ import annotations

import hashlib
import json
import re
import time
import logging
import math
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# CONFIG

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Better model for structured output
MODEL = "openai/gpt-4o-mini"


# ─────────────────────────────────────────────
# SAFE AI CALL

def call_ai(payload, headers):
    try:
        print("➡️ Calling AI...")

        with httpx.Client(timeout=20) as client:
            response = client.post(
                OPENROUTER_URL,
                json=payload,
                headers=headers
            )

        response.raise_for_status()

        print("✅ AI responded")
        return response.json()

    except Exception as e:
        print("❌ AI ERROR:", e)
        return None


# ─────────────────────────────────────────────
# FALLBACK (NEVER BREAK UI)

def fallback_response():
    return {
        "flowchart": "graph TD; Start-->Process-->End",
        "architecture": "graph TD; User-->Extension-->Backend",
        "sequence": "sequenceDiagram\nUser->>Backend: request",
        "class_diagram": "",
        "call_graph": "graph LR; A-->B",
        "explanation": "AI unavailable — fallback used.",
        "workflow": ["Start", "Process", "End"],
        "summary": "Fallback result",
        "dependencies": [],
        "complexity": "O(n)"
    }


# ─────────────────────────────────────────────
# COMPLEXITY CALCULATION

def estimate_complexity(big_o: str, n: int = 1000):
    big_o = big_o.lower()

    if "n log n" in big_o:
        return n * math.log2(n)
    elif "n^2" in big_o:
        return n ** 2
    elif "n^3" in big_o:
        return n ** 3
    elif "log n" in big_o:
        return math.log2(n)
    elif "n" in big_o:
        return n
    elif "1" in big_o:
        return 1
    return None


def format_complexity(big_o: str):
    n = 1000
    estimate = estimate_complexity(big_o, n)

    if estimate:
        return f"Time: {big_o} ≈ {int(estimate):,} operations (n={n})"
    return f"Time: {big_o}"


# ─────────────────────────────────────────────
# PROMPTS

SYSTEM_PROMPT = """You are a senior software architect analyzing code to generate detailed architectural diagrams.

Return ONLY valid JSON.

CRITICAL RULES FOR FLOWCHARTS:

- Trace the actual runtime execution flow and business logic, NOT just structurally listing function/class definitions.
- For each piece of logic, expand its internal operations (if statements, loops, error handling, function calls).
- Include nested calls to show how components interact at runtime.
- Do NOT just draw a straight line of "Define X" --> "Define Y". This is trivial. We need the runtime logic!
- Connect caller functions to their respective callee functions.
- Flowcharts MUST be large, detailed, and completely map out the entire application logic.

Return fields:

- explanation
- workflow
- flowchart (mermaid)
- architecture (mermaid)
- sequence (mermaid)
- class_diagram
- call_graph
- dependencies
- complexity (ONLY Big-O)
- summary
"""


USER_PROMPT = """
Analyze this code and return STRICT JSON.

CRITICAL FLOWCHART RULES:

- Trace the execution logic, NOT just top-level definitions.
- If the script contains classes and functions, map out exactly how they call each other at runtime.
- Visually chart internal nested logic (loops, if/else, try/catch).
- Ensure the flowchart realistically represents the code's operation when it is run.

MERMAID RULES (IMPORTANT):

- Use flowchart TD
- Wrap ALL labels in quotes
- Avoid parentheses in node names (use quotes for labels instead, e.g., A["Function(args)"])
- Avoid special characters
- Use readable short labels

Example:

A["Start Initializer"] --> B{{"Is Valid?"}}
B -- Yes --> C["Process Request"]
B -- No --> D["Return Error"]

Code:
{code}

Question:
{question}

Return Format:

{{
  "explanation": "...",
  "workflow": ["step1","step2"],
  "flowchart": "flowchart TD; A-->B",
  "architecture": "graph TD; User-->Backend",
  "sequence": "sequenceDiagram\\nUser->>Backend: request",
  "class_diagram": "",
  "call_graph": "graph LR; A-->B",
  "dependencies": [],
  "complexity": "O(n)",
  "summary": "..."
}}
"""


# ─────────────────────────────────────────────
# CACHE

_cache: dict[str, tuple[dict, float]] = {}
CACHE_TTL = 3600


def _cache_key(code: str, question: str) -> str:
    return hashlib.sha256(f"{code}{question}v3".encode()).hexdigest()


def _cache_get(key: str):
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
    return None


def _cache_set(key: str, value: dict):
    _cache[key] = (value, time.time())


# ─────────────────────────────────────────────
# CLEAN JSON

def clean_json(text: str):
    text = text.strip()

    # remove markdown fences
    if text.startswith("```"):
        text = re.sub(r"```json|```", "", text).strip()

    # find JSON block
    start = text.find("{")
    end = text.rfind("}") + 1

    if start >= 0 and end > start:
        text = text[start:end]

    return text


# ─────────────────────────────────────────────
# MAIN FUNCTION

def analyze_code(code: str, question: str = "", api_key: str = "") -> dict[str, Any]:

    # limit input size
    code = code[:32000]

    key = _cache_key(code, question)

    cached = _cache_get(key)
    if cached:
        return cached

    prompt = USER_PROMPT.format(
        code=code,
        question=question
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "AI Code Visualizer",
    }

    payload = {
        "model": MODEL,
        "temperature": 0.1,
        "max_tokens": 16000,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    }

    data = call_ai(payload, headers)

    if not data:
        return fallback_response()

    try:

        content = data["choices"][0]["message"]["content"]

        clean = clean_json(content)

        result = json.loads(clean)

        result["complexity"] = format_complexity(
            result.get("complexity", "O(n)")
        )

        _cache_set(key, result)

        return result

    except Exception as e:
        print("❌ PARSE ERROR:", e)
        print("RAW AI:", content)
        return fallback_response()


def chat_with_code(code: str, question: str, api_key: str) -> str:
    """
    Dedicated chat function for answering questions about the analyzed code.
    """
    system_prompt = "You are a senior software developer. Answer questions about the provided code clearly and concisely."
    user_prompt = f"CODE:\n{code[:20000]}\n\nQUESTION: {question}\n\nAnswer the question based on the code provided."

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "AI Code Visualizer Chat",
    }

    payload = {
        "model": MODEL,
        "temperature": 0.5,
        "max_tokens": 1000,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    data = call_ai(payload, headers)
    if not data:
        return "Sorry, I'm unable to answer right now."

    try:
        return data["choices"][0]["message"]["content"]
    except Exception:
        return "Failed to parse AI response."
