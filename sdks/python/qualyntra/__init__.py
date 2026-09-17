"""
File: sdks/python/qualyntra/__init__.py
Purpose: Exports dependency-free Python SDK contracts, runtime helpers, and automation orchestration while keeping Playwright/Selenium optional and lazy-loaded.
Author: Raushan Raj
"""
from .automation import automation_health, automation_health_all, execute_automation_plan
from .client import QualyntraClient
from .contracts import (
    AttachmentRef, AutomationCommand, AutomationExecutionResult, AutomationPlan, AutomationStepResult,
    EvaluationCase, EvidenceRecord, ExecutionRequest, FailureDetail, LocatorDescriptor, MetricResult,
    RuntimeIdentity, UniversalTestResult,
)
from .runtime import PythonRuntimeSnapshot, discover_runtime

__all__=[
    "AttachmentRef","AutomationCommand","AutomationExecutionResult","AutomationPlan","AutomationStepResult",
    "EvaluationCase","EvidenceRecord","ExecutionRequest","FailureDetail","LocatorDescriptor","MetricResult",
    "PythonRuntimeSnapshot","QualyntraClient","RuntimeIdentity","UniversalTestResult","automation_health",
    "automation_health_all","discover_runtime","execute_automation_plan",
]
__version__="1.0.0"
