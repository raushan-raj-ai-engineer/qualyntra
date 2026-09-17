"""
File: sdks/python/qualyntra/contracts.py
Purpose: Defines lightweight Python representations of the cross-language Qualyntra contracts.
Author: Raushan Raj
"""
from dataclasses import dataclass, field
from typing import Any

@dataclass(frozen=True)
class RuntimeIdentity:
    language: str
    runner: str
    engine: str | None = None
    runner_version: str | None = None
    engine_version: str | None = None

@dataclass(frozen=True)
class ExecutionRequest:
    run_id: str
    project_id: str
    runtime: RuntimeIdentity
    args: list[str] = field(default_factory=list)
    metadata: dict[str, str] = field(default_factory=dict)

@dataclass(frozen=True)
class EvaluationCase:
    id: str
    input: str
    actual_output: str
    expected_output: str | None = None
    context: list[str] = field(default_factory=list)
    retrieval_context: list[str] = field(default_factory=list)

@dataclass(frozen=True)
class MetricResult:
    metric_id: str
    score: float
    passed: bool
    reason: str
    details: dict[str, Any] = field(default_factory=dict)

