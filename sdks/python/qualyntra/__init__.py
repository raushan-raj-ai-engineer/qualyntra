"""
File: sdks/python/qualyntra/__init__.py
Purpose: Exports the dependency-free Python SDK contracts used by Pytest, Selenium, Playwright, Appium, and custom integrations.
Author: Raushan Raj
"""
from .contracts import RuntimeIdentity, ExecutionRequest, EvaluationCase, MetricResult
from .client import QualyntraClient
__all__=["RuntimeIdentity","ExecutionRequest","EvaluationCase","MetricResult","QualyntraClient"]
__version__="1.0.0"
