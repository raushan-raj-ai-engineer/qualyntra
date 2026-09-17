"""
File: sdks/python/qualyntra/bridge.py
Purpose: Exposes a stable JSON-over-stdio bridge for Python runtime health, Pytest execution/discovery, and Playwright/Selenium automation execution.
Author: Raushan Raj
"""
from __future__ import annotations
import json, sys
from typing import Any
from .automation import automation_health_all, automation_plan_from_dict, automation_result_to_dict, execute_automation_plan
from .contracts import ExecutionRequest, RuntimeIdentity
from .execution import PythonModuleRunner
from .runtime import discover_runtime

def _request_from_dict(payload: dict[str,Any]) -> ExecutionRequest:
    runtime_data=payload.get("runtime") or {}
    runtime=RuntimeIdentity(language=runtime_data.get("language","python"),runner=runtime_data.get("runner","pytest"),engine=runtime_data.get("engine"),runner_version=runtime_data.get("runner_version"),engine_version=runtime_data.get("engine_version"))
    return ExecutionRequest(run_id=str(payload["run_id"]),project_id=str(payload["project_id"]),runtime=runtime,args=[str(v) for v in payload.get("args",[])],env={str(k):str(v) for k,v in (payload.get("env") or {}).items()},cwd=payload.get("cwd"),timeout_seconds=float(payload.get("timeout_seconds",120.0)),metadata={str(k):str(v) for k,v in (payload.get("metadata") or {}).items()})

def handle(payload: dict[str,Any]) -> dict[str,Any]:
    operation=payload.get("operation")
    if operation=="health": return {"status":"healthy","runtime":discover_runtime().to_dict()}
    if operation=="automation.health": return automation_health_all()
    if operation=="automation.execute":
        plan=automation_plan_from_dict(payload.get("plan") or {})
        return {"result":automation_result_to_dict(execute_automation_plan(plan))}
    if operation not in {"pytest.execute","pytest.discover"}: raise ValueError(f"Unsupported bridge operation: {operation!r}")
    runner=PythonModuleRunner(); request=_request_from_dict(payload.get("request") or {})
    if operation=="pytest.execute": return {"execution":runner.execute_pytest(request,payload.get("junit_output")).to_dict()}
    return {"tests":runner.discover_pytest(request)}

def main() -> int:
    try:
        payload=json.loads(sys.stdin.read() or "{}")
        print(json.dumps({"ok":True,"data":handle(payload)},separators=(",",":")))
        return 0
    except Exception as exc:
        print(json.dumps({"ok":False,"error":{"type":type(exc).__name__,"message":str(exc)}},separators=(",",":")))
        return 1

if __name__=="__main__": raise SystemExit(main())
