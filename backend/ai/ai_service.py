"""
AI Service — OpenRouter / DeepSeek
Non-blocking, FastAPI-safe version
"""

from __future__ import annotations

import hashlib
import json
import re
import time
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "deepseek/deepseek-chat"

# ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a senior software architect.

Return ONLY valid JSON.

You must generate:
- explanation
- workflow
- flowchart (mermaid)
- architecture (mermaid)
- sequence (mermaid)
- class_diagram
- call_graph
- dependencies
- complexity
- summary
"""

USER_PROMPT = """
Analyze this Python code and return STRICT JSON.

Code:
{code}

Question:
{question}

Format:

{{
  "explanation": "...",
  "workflow": ["step1","step2"],
  "flowchart": "graph TD; Start --> End",
  "architecture": "graph TD; User --> Backend --> AI",
  "sequence": "sequenceDiagram\nUser->>Backend: request",
  "class_diagram": "",
  "call_graph": "graph LR; A --> B",
  "dependencies": [],
  "complexity": "low|medium|high",
  "summary": "..."
}}
"""

# ─────────────────────────────────────────────────────────────
# CACHE

_cache: dict[str, tuple[dict, float]] = {}
CACHE_TTL = 3600


def _cache_key(code: str, question: str) -> str:
    return hashlib.sha256(f"{code}{question}".encode()).hexdigest()


def _cache_get(key: str):
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
    return None


def _cache_set(key: str, value: dict):
    _cache[key] = (value, time.time())


# ─────────────────────────────────────────────────────────────
# CLEANING

def clean_json(text: str):
    text = text.strip()

    # remove ```json
    if text.startswith("```"):
        text = re.sub(r"```json|```", "", text).strip()

    start = text.find("{")
    end = text.rfind("}") + 1

    if start >= 0 and end > start:
        text = text[start:end]

    return text


# ─────────────────────────────────────────────────────────────
# MAIN FUNCTION (SYNC VERSION - IMPORTANT)

def analyze_code(code: str, question: str = "", api_key: str = "") -> dict[str, Any]:

    key = _cache_key(code, question)

    cached = _cache_get(key)
    if cached:
        return cached

    prompt = USER_PROMPT.format(code=code, question=question)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": MODEL,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    }

    try:
        # 🔥 IMPORTANT: using sync client (no async freeze)
        with httpx.Client(timeout=60) as client:
            response = client.post(OPENROUTER_URL, json=payload, headers=headers)

        data = response.json()

        content = data["choices"][0]["message"]["content"]

        clean = clean_json(content)

        result = json.loads(clean)

        _cache_set(key, result)

        return result

    except Exception as e:
        logger.error("AI error: %s", e)

        # fallback response
        return {
            "explanation": "AI failed, fallback used",
            "workflow": ["Start", "Process", "End"],
            "flowchart": "graph TD; Start --> End",
            "architecture": "graph TD; User --> Backend --> Error",
            "sequence": "sequenceDiagram\nUser->>Backend: request",
            "class_diagram": "",
            "call_graph": "graph LR; A --> B",
            "dependencies": [],
            "complexity": "medium",
            "summary": "Fallback result",
        }