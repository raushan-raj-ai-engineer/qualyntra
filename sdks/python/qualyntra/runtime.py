"""
File: sdks/python/qualyntra/runtime.py
Purpose: Discovers the local Python runtime and optional Pytest, Playwright, Selenium, and xdist packages using only the standard library.
Author: Raushan Raj
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from importlib.metadata import PackageNotFoundError, version
import platform
import sys
from typing import Any

_OPTIONAL_DISTRIBUTIONS = ("pytest", "playwright", "selenium", "pytest-xdist")


def _distribution_version(name: str) -> str | None:
    try:
        return version(name)
    except PackageNotFoundError:
        return None


@dataclass(frozen=True)
class PythonRuntimeSnapshot:
    executable: str
    version: str
    implementation: str
    platform: str
    packages: dict[str, str | None] = field(default_factory=dict)

    @property
    def capabilities(self) -> dict[str, bool]:
        return {
            "process_execution": True,
            "pytest": bool(self.packages.get("pytest")),
            "playwright": bool(self.packages.get("playwright")),
            "selenium": bool(self.packages.get("selenium")),
            "parallel_pytest": bool(self.packages.get("pytest-xdist")),
        }

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["capabilities"] = self.capabilities
        return data


def discover_runtime() -> PythonRuntimeSnapshot:
    return PythonRuntimeSnapshot(
        executable=sys.executable,
        version=platform.python_version(),
        implementation=platform.python_implementation(),
        platform=platform.platform(),
        packages={name: _distribution_version(name) for name in _OPTIONAL_DISTRIBUTIONS},
    )
