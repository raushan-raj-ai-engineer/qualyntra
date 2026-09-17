"""
File: sdks/python/qualyntra/results.py
Purpose: Normalizes JUnit XML produced by Python runners into the same universal result shape used by the platform.
Author: Raushan Raj
"""
from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from uuid import uuid4
import xml.etree.ElementTree as ET

from .contracts import FailureDetail, RuntimeIdentity, UniversalTestResult


def parse_junit_xml(content: str, run_id: str, runtime: RuntimeIdentity) -> list[UniversalTestResult]:
    root = ET.fromstring(content)
    results: list[UniversalTestResult] = []
    for case in root.iter("testcase"):
        failure = case.find("failure")
        error = case.find("error")
        skipped = case.find("skipped")
        problem = failure if failure is not None else error
        status = "failed" if problem is not None else "skipped" if skipped is not None else "passed"
        detail = None
        if problem is not None:
            detail = FailureDetail(
                message=(problem.get("message") or problem.text or "failure").strip(),
                category="error" if error is not None else "assertion",
            )
        results.append(
            UniversalTestResult(
                id=f"test_{uuid4().hex}",
                run_id=run_id,
                suite=case.get("classname"),
                name=case.get("name") or "unnamed",
                status=status,
                duration_ms=round(float(case.get("time") or 0) * 1000),
                runtime=runtime,
                failure=detail,
            )
        )
    return results


def parse_junit_file(path: str | Path, run_id: str, runtime: RuntimeIdentity) -> list[UniversalTestResult]:
    return parse_junit_xml(Path(path).read_text(encoding="utf-8"), run_id, runtime)


def results_to_dict(results: list[UniversalTestResult]) -> list[dict]:
    return [asdict(result) for result in results]
