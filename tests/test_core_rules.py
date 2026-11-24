"""Quy tắc đề bài: module lõi không dùng dict/set dựng sẵn thay cho CTDL tự cài đặt (ADR-0001)."""

import ast
from pathlib import Path

CORE = Path(__file__).resolve().parents[1] / "logigraph" / "core"

BANNED_CALLS = ("dict", "set", "frozenset")
# Chỉ thư viện chuẩn không chứa CTDL dựng sẵn; heapq/collections/functools(lru_cache) bị cấm.
ALLOWED_IMPORTS = ("__future__", "math", "random", "typing", "dataclasses", "csv", "pathlib", "logigraph")


def violations(source: str) -> list[str]:
    found = []
    for node in ast.walk(ast.parse(source)):
        line = getattr(node, "lineno", "?")
        if isinstance(node, (ast.Dict, ast.Set, ast.DictComp, ast.SetComp)):
            found.append(f"dòng {line}: {type(node).__name__}")
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in BANNED_CALLS:
            found.append(f"dòng {line}: gọi {node.func.id}()")
        elif isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split(".")[0] not in ALLOWED_IMPORTS:
                    found.append(f"dòng {line}: import {alias.name}")
        elif isinstance(node, ast.ImportFrom) and node.level == 0:
            if (node.module or "").split(".")[0] not in ALLOWED_IMPORTS:
                found.append(f"dòng {line}: from {node.module} import")
    return found


def test_checker_catches_every_banned_construct():
    source = "\n".join([
        "a = {}",
        "b = {1, 2}",
        "c = {k: k for k in range(3)}",
        "d = {k for k in range(3)}",
        "e = dict()",
        "f = set()",
        "import heapq",
        "from collections import defaultdict",
        "from functools import lru_cache",
    ])
    assert len(violations(source)) == 9


def test_checker_allows_arrays_and_whitelisted_imports():
    source = "\n".join([
        "import math",
        "from typing import Optional",
        "from .graph import RoadNetwork",
        "dist = [math.inf] * 10",
        "keep = bytearray(10)",
    ])
    assert violations(source) == []


def test_core_has_no_builtin_dict_set_or_library_structures():
    report = {}  # file test, không thuộc lõi
    for path in sorted(CORE.rglob("*.py")):
        found = violations(path.read_text(encoding="utf-8"))
        if found:
            report[str(path.relative_to(CORE))] = found
    assert report == {}, f"Vi phạm quy tắc lõi: {report}"
