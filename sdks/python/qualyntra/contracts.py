"""
File: sdks/python/qualyntra/contracts.py
Purpose: Defines lightweight Python representations of cross-language execution, result, evidence, and evaluation contracts.
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
    env: dict[str, str] = field(default_factory=dict)
    cwd: str | None = None
    timeout_seconds: float = 120.0


@dataclass(frozen=True)
class FailureDetail:
    message: str
    category: str | None = None
    stack: str | None = None
    fingerprint: str | None = None


@dataclass(frozen=True)
class AttachmentRef:
    name: str
    content_type: str
    path: str | None = None
    uri: str | None = None
    sha256: str | None = None


@dataclass(frozen=True)
class UniversalTestResult:
    id: str
    run_id: str
    name: str
    status: str
    duration_ms: int
    runtime: RuntimeIdentity
    suite: str | None = None
    failure: FailureDetail | None = None
    attachments: list[AttachmentRef] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class EvidenceRecord:
    id: str
    run_id: str
    kind: str
    name: str
    content_type: str
    created_at: str
    redacted: bool
    path: str | None = None
    uri: str | None = None
    sha256: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


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
