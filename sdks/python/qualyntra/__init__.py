"""
File: sdks/python/qualyntra/__init__.py
Purpose: Exports dependency-free Python SDK contracts and runtime helpers used by runner, automation, evidence, and control-plane integrations.
Author: Raushan Raj
"""
from .client import QualyntraClient
from .contracts import (
    AttachmentRef,
    EvaluationCase,
    EvidenceRecord,
    ExecutionRequest,
    FailureDetail,
    MetricResult,
    RuntimeIdentity,
    UniversalTestResult,
)
from .runtime import PythonRuntimeSnapshot, discover_runtime

__all__ = [
    "AttachmentRef",
    "EvaluationCase",
    "EvidenceRecord",
    "ExecutionRequest",
    "FailureDetail",
    "MetricResult",
    "PythonRuntimeSnapshot",
    "QualyntraClient",
    "RuntimeIdentity",
    "UniversalTestResult",
    "discover_runtime",
]
__version__ = "1.0.0"
