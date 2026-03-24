"""
ast_to_ir.py — Parse Python source into an Intermediate Representation (IR).

IR schema:
{
  "functions": [
    {
      "name": str,
      "args": [str],
      "returns": str | None,
      "calls": [str],          # functions called inside this function
      "decorators": [str],
      "lineno": int,
      "is_async": bool,
    }
  ],
  "classes": [
    {
      "name": str,
      "bases": [str],
      "methods": [str],
      "attributes": [str],
      "lineno": int,
    }
  ],
  "imports": [str],            # module names only (e.g. "os", "fastapi")
  "top_level_calls": [str],    # function calls at module scope
  "control_flow": [
    {"type": "for"|"while"|"if"|"try"|"with", "lineno": int, "test": str}
  ],
  "global_vars": [str],
}
"""
from __future__ import annotations

import ast
from typing import Any


def parse_code_to_ir(source: str) -> dict[str, Any]:
    """Parse Python source and return IR dict."""
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        return _empty_ir(error=str(exc))

    visitor = _IRVisitor()
    visitor.visit(tree)
    return visitor.ir


def _empty_ir(error: str = "") -> dict[str, Any]:
    return {
        "functions": [],
        "classes": [],
        "imports": [],
        "top_level_calls": [],
        "control_flow": [],
        "global_vars": [],
        "error": error,
    }


# ── Visitors ──────────────────────────────────────────────────────────────────

class _CallCollector(ast.NodeVisitor):
    """Collect all function call names within a subtree."""

    def __init__(self) -> None:
        self.calls: list[str] = []

    def visit_Call(self, node: ast.Call) -> None:
        name = _call_name(node)
        if name:
            self.calls.append(name)
        self.generic_visit(node)


class _IRVisitor(ast.NodeVisitor):
    def __init__(self) -> None:
        self.ir: dict[str, Any] = _empty_ir()
        self._scope: list[str] = []   # current class/function scope

    # ── Imports ──────────────────────────────────────────────────────────────

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            mod = alias.name.split(".")[0]
            if mod not in self.ir["imports"]:
                self.ir["imports"].append(mod)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        if node.module:
            mod = node.module.split(".")[0]
            if mod not in self.ir["imports"]:
                self.ir["imports"].append(mod)

    # ── Functions ─────────────────────────────────────────────────────────────

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._handle_func(node, is_async=False)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._handle_func(node, is_async=True)

    def _handle_func(self, node: ast.FunctionDef | ast.AsyncFunctionDef, is_async: bool) -> None:
        args = [a.arg for a in node.args.args]

        # Return annotation
        returns = None
        if node.returns:
            returns = ast.unparse(node.returns)

        # Decorators
        decorators = [ast.unparse(d) for d in node.decorator_list]

        # Calls made within this function
        cc = _CallCollector()
        for child in node.body:
            cc.visit(child)

        self.ir["functions"].append({
            "name": node.name,
            "args": args,
            "returns": returns,
            "calls": list(dict.fromkeys(cc.calls)),  # deduplicated, order preserved
            "decorators": decorators,
            "lineno": node.lineno,
            "is_async": is_async,
        })
        self.generic_visit(node)

    # ── Classes ──────────────────────────────────────────────────────────────

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        bases = [ast.unparse(b) for b in node.bases]
        methods: list[str] = []
        attributes: list[str] = []

        for child in ast.walk(node):
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if child is not node:  # skip the class node itself
                    methods.append(child.name)
            elif isinstance(child, ast.Assign):
                for target in child.targets:
                    if isinstance(target, ast.Name):
                        attributes.append(target.id)
            elif isinstance(child, ast.AnnAssign):
                if isinstance(child.target, ast.Name):
                    attributes.append(child.target.id)

        self.ir["classes"].append({
            "name": node.name,
            "bases": bases,
            "methods": list(dict.fromkeys(methods)),
            "attributes": list(dict.fromkeys(attributes)),
            "lineno": node.lineno,
        })
        self.generic_visit(node)

    # ── Control flow ─────────────────────────────────────────────────────────

    def visit_For(self, node: ast.For) -> None:
        self.ir["control_flow"].append({
            "type": "for",
            "lineno": node.lineno,
            "test": ast.unparse(node.iter),
        })
        self.generic_visit(node)

    def visit_While(self, node: ast.While) -> None:
        self.ir["control_flow"].append({
            "type": "while",
            "lineno": node.lineno,
            "test": ast.unparse(node.test),
        })
        self.generic_visit(node)

    def visit_If(self, node: ast.If) -> None:
        self.ir["control_flow"].append({
            "type": "if",
            "lineno": node.lineno,
            "test": ast.unparse(node.test),
        })
        self.generic_visit(node)

    def visit_Try(self, node: ast.Try) -> None:
        self.ir["control_flow"].append({
            "type": "try",
            "lineno": node.lineno,
            "test": "",
        })
        self.generic_visit(node)

    # ── Module-level calls ────────────────────────────────────────────────────

    def visit_Expr(self, node: ast.Expr) -> None:
        if isinstance(node.value, ast.Call):
            name = _call_name(node.value)
            if name:
                self.ir["top_level_calls"].append(name)
        self.generic_visit(node)

    # ── Global assignments ────────────────────────────────────────────────────

    def visit_Assign(self, node: ast.Assign) -> None:
        for target in node.targets:
            if isinstance(target, ast.Name):
                self.ir["global_vars"].append(target.id)
        self.generic_visit(node)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _call_name(node: ast.Call) -> str | None:
    """Extract a human-readable function name from a Call node."""
    if isinstance(node.func, ast.Name):
        return node.func.id
    if isinstance(node.func, ast.Attribute):
        return node.func.attr
    return None