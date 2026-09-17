"""
File: sdks/python/qualyntra/execution.py
Purpose: Executes Python modules without shell interpolation and returns a normalized, JSON-safe execution result for Qualyntra bridges.
Author: Raushan Raj
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import os
from pathlib import Path
import re
import subprocess
import sys
from typing import Any

from .contracts import ExecutionRequest

_MODULE_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_.]*$")


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@dataclass(frozen=True)
class PythonExecutionResult:
    run_id: str
    status: str
    started_at: str
    finished_at: str
    exit_code: int | None = None
    stdout: str = ""
    stderr: str = ""
    result_files: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["result_files"] = list(self.result_files)
        return data


class PythonModuleRunner:
    def __init__(self, executable: str | None = None):
        self.executable = executable or sys.executable

    def execute_module(
        self,
        module: str,
        request: ExecutionRequest,
        *,
        extra_args: list[str] | None = None,
        result_files: list[str] | None = None,
    ) -> PythonExecutionResult:
        if not _MODULE_PATTERN.fullmatch(module):
            raise ValueError(f"Invalid Python module name: {module!r}")
        if request.runtime.language.lower() != "python":
            raise ValueError("PythonModuleRunner requires runtime.language='python'.")

        started_at = _utc_now()
        command = [self.executable, "-m", module, *(extra_args or []), *request.args]
        environment = os.environ.copy()
        environment.update(request.env)

        try:
            completed = subprocess.run(
                command,
                cwd=Path(request.cwd) if request.cwd else None,
                env=environment,
                capture_output=True,
                text=True,
                shell=False,
                timeout=request.timeout_seconds,
                check=False,
            )
            status = "passed" if completed.returncode == 0 else "failed"
            return PythonExecutionResult(
                run_id=request.run_id,
                status=status,
                exit_code=completed.returncode,
                started_at=started_at,
                finished_at=_utc_now(),
                stdout=completed.stdout,
                stderr=completed.stderr,
                result_files=tuple(result_files or ()),
            )
        except subprocess.TimeoutExpired as exc:
            return PythonExecutionResult(
                run_id=request.run_id,
                status="error",
                started_at=started_at,
                finished_at=_utc_now(),
                stdout=(exc.stdout or "") if isinstance(exc.stdout, str) else "",
                stderr=f"Execution timed out after {request.timeout_seconds} seconds",
                result_files=tuple(result_files or ()),
            )

    def execute_pytest(self, request: ExecutionRequest, junit_output: str | None = None) -> PythonExecutionResult:
        extra_args: list[str] = []
        result_files: list[str] = []
        if junit_output:
            extra_args.append(f"--junitxml={junit_output}")
            result_files.append(junit_output)
        return self.execute_module("pytest", request, extra_args=extra_args, result_files=result_files)

    def discover_pytest(self, request: ExecutionRequest) -> list[str]:
        result = self.execute_module("pytest", request, extra_args=["--collect-only", "-q"])
        if result.exit_code not in (0, 5):
            raise RuntimeError(result.stderr.strip() or "Pytest discovery failed.")
        return [line.strip() for line in result.stdout.splitlines() if "::" in line]
