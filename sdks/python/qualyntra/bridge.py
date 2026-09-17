"""
File: sdks/python/qualyntra/bridge.py
Purpose: Exposes a stable JSON-over-stdio bridge for Python runtime health, Pytest execution, and discovery from other Qualyntra processes.
Author: Raushan Raj
"""
from __future__ import annotations

import json
import sys
from typing import Any

from .contracts import ExecutionRequest, RuntimeIdentity
from .execution import PythonModuleRunner
from .runtime import discover_runtime


def _request_from_dict(payload: dict[str, Any]) -> ExecutionRequest:
    runtime_data = payload.get("runtime") or {}
    runtime = RuntimeIdentity(
        language=runtime_data.get("language", "python"),
        runner=runtime_data.get("runner", "pytest"),
        engine=runtime_data.get("engine"),
        runner_version=runtime_data.get("runner_version"),
        engine_version=runtime_data.get("engine_version"),
    )
    return ExecutionRequest(
        run_id=str(payload["run_id"]),
        project_id=str(payload["project_id"]),
        runtime=runtime,
        args=[str(value) for value in payload.get("args", [])],
        env={str(key): str(value) for key, value in (payload.get("env") or {}).items()},
        cwd=payload.get("cwd"),
        timeout_seconds=float(payload.get("timeout_seconds", 120.0)),
        metadata={str(key): str(value) for key, value in (payload.get("metadata") or {}).items()},
    )


def handle(payload: dict[str, Any]) -> dict[str, Any]:
    operation = payload.get("operation")
    if operation == "health":
        snapshot = discover_runtime()
        return {"status": "healthy", "runtime": snapshot.to_dict()}

    if operation not in {"pytest.execute", "pytest.discover"}:
        raise ValueError(f"Unsupported bridge operation: {operation!r}")

    runner = PythonModuleRunner()
    request = _request_from_dict(payload.get("request") or {})
    if operation == "pytest.execute":
        result = runner.execute_pytest(request, payload.get("junit_output"))
        return {"execution": result.to_dict()}
    return {"tests": runner.discover_pytest(request)}


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
        print(json.dumps({"ok": True, "data": handle(payload)}, separators=(",", ":")))
        return 0
    except Exception as exc:  # bridge boundary intentionally normalizes failures
        print(json.dumps({"ok": False, "error": {"type": type(exc).__name__, "message": str(exc)}}, separators=(",", ":")))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
