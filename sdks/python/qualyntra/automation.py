"""
File: sdks/python/qualyntra/automation.py
Purpose: Implements vendor-neutral Python automation plans plus lazy Playwright/Selenium engines with normalized results, evidence, safe teardown, and remote-driver controls.
Author: Raushan Raj
"""
from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone
from importlib import import_module
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path
import re
import time
from typing import Any, Callable, Protocol
from urllib.parse import urljoin

from .contracts import (
    AutomationCommand,
    AutomationExecutionResult,
    AutomationPlan,
    AutomationStepResult,
    EvidenceRecord,
    FailureDetail,
    LocatorDescriptor,
)
from .evidence import file_evidence


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _package_version(name: str) -> str | None:
    try:
        return version(name)
    except PackageNotFoundError:
        return None


def automation_health(engine: str) -> dict[str, Any]:
    normalized = engine.strip().lower()
    package = {"playwright": "playwright", "selenium": "selenium"}.get(normalized)
    if package is None:
        raise ValueError(f"Unsupported Python automation engine: {engine!r}")
    detected = _package_version(package)
    capabilities = {
        "web": True,
        "screenshots": True,
        "tracing": normalized == "playwright",
        "remote_webdriver": normalized == "selenium",
    }
    return {"engine": normalized, "available": bool(detected), "version": detected, "capabilities": capabilities}


def automation_health_all() -> dict[str, Any]:
    return {"engines": {name: automation_health(name) for name in ("playwright", "selenium")}}


def _locator_from_dict(value: dict[str, Any] | None) -> LocatorDescriptor | None:
    if value is None:
        return None
    return LocatorDescriptor(
        strategy=str(value["strategy"]),
        value=str(value["value"]),
        options=dict(value.get("options") or {}),
    )


def automation_plan_from_dict(payload: dict[str, Any]) -> AutomationPlan:
    commands = [
        AutomationCommand(
            id=str(item["id"]),
            type=str(item["type"]),
            locator=_locator_from_dict(item.get("locator")),
            value=item.get("value"),
            url=item.get("url"),
            metadata=dict(item.get("metadata") or {}),
        )
        for item in payload.get("commands", [])
    ]
    return AutomationPlan(
        run_id=str(payload["runId"]),
        engine=str(payload["engine"]).lower(),
        commands=commands,
        browser=str(payload.get("browser") or "chromium").lower(),
        headless=bool(payload.get("headless", True)),
        base_url=payload.get("baseUrl"),
        remote_url=payload.get("remoteUrl"),
        allow_remote=bool(payload.get("allowRemote", False)),
        artifact_directory=payload.get("artifactDirectory"),
        tracing=bool(payload.get("tracing", False)),
        timeout_seconds=max(float(payload.get("timeoutMs", 30_000)) / 1000.0, 0.001),
        fail_fast=bool(payload.get("failFast", True)),
        metadata=dict(payload.get("metadata") or {}),
    )


def _artifact_path(plan: AutomationPlan, command: AutomationCommand, extension: str) -> Path:
    if not plan.artifact_directory:
        raise ValueError(f"Action {command.type!r} requires artifactDirectory.")
    directory = Path(plan.artifact_directory).resolve()
    directory.mkdir(parents=True, exist_ok=True)
    safe_id = re.sub(r"[^A-Za-z0-9_.-]+", "_", command.id).strip("._") or "artifact"
    path = (directory / f"{safe_id}.{extension}").resolve()
    if directory != path.parent:
        raise ValueError("Artifact path escaped the configured artifactDirectory.")
    return path


def _resolve_url(plan: AutomationPlan, requested: str | None) -> str:
    if not requested:
        raise ValueError("navigate action requires url.")
    if plan.base_url:
        return urljoin(plan.base_url.rstrip("/") + "/", requested)
    return requested


class AutomationEngine(Protocol):
    def open(self, plan: AutomationPlan) -> None: ...
    def execute(self, command: AutomationCommand, plan: AutomationPlan) -> list[EvidenceRecord]: ...
    def close(self, plan: AutomationPlan) -> list[EvidenceRecord]: ...


class PlaywrightPythonEngine:
    def __init__(self, runtime_factory: Callable[[], Any] | None = None):
        self._runtime_factory = runtime_factory
        self._manager: Any = None
        self._playwright: Any = None
        self._browser: Any = None
        self._context: Any = None
        self._page: Any = None
        self._trace_started = False

    def open(self, plan: AutomationPlan) -> None:
        if self._runtime_factory is None:
            module = import_module("playwright.sync_api")
            self._manager = module.sync_playwright()
            self._playwright = self._manager.start()
        else:
            self._playwright = self._runtime_factory()
        if plan.browser not in {"chromium", "firefox", "webkit"}:
            raise ValueError(f"Unsupported Playwright browser: {plan.browser!r}")
        browser_type = getattr(self._playwright, plan.browser)
        self._browser = browser_type.launch(headless=plan.headless)
        self._context = self._browser.new_context()
        if plan.tracing:
            if not plan.artifact_directory:
                raise ValueError("Playwright tracing requires artifactDirectory.")
            self._context.tracing.start(screenshots=True, snapshots=True, sources=True)
            self._trace_started = True
        self._page = self._context.new_page()
        self._page.set_default_timeout(plan.timeout_seconds * 1000)

    def _locator(self, locator: LocatorDescriptor):
        if self._page is None:
            raise RuntimeError("Playwright page is not initialized.")
        options = locator.options or {}
        if locator.strategy == "role":
            kwargs = {key: options[key] for key in ("name", "exact") if key in options}
            return self._page.get_by_role(locator.value, **kwargs)
        if locator.strategy == "label":
            return self._page.get_by_label(locator.value, exact=bool(options.get("exact", False)))
        if locator.strategy == "text":
            return self._page.get_by_text(locator.value, exact=bool(options.get("exact", False)))
        if locator.strategy == "testId":
            return self._page.get_by_test_id(locator.value)
        if locator.strategy in {"css", "xpath"}:
            return self._page.locator(locator.value)
        raise ValueError(f"Locator strategy {locator.strategy!r} is not supported by Playwright Python adapter.")

    def execute(self, command: AutomationCommand, plan: AutomationPlan) -> list[EvidenceRecord]:
        if self._page is None:
            raise RuntimeError("Playwright page is not initialized.")
        if command.type == "navigate":
            self._page.goto(_resolve_url(plan, command.url))
            return []
        if command.type == "screenshot":
            path = _artifact_path(plan, command, "png")
            self._page.screenshot(path=str(path), full_page=bool(command.metadata.get("fullPage", True)))
            return [file_evidence(plan.run_id, "screenshot", path)]
        if command.locator is None:
            raise ValueError(f"Action {command.type!r} requires locator.")
        locator = self._locator(command.locator)
        if command.type == "click": locator.click()
        elif command.type == "fill": locator.fill("" if command.value is None else str(command.value))
        elif command.type == "select": locator.select_option("" if command.value is None else str(command.value))
        elif command.type == "check": locator.check() if bool(command.value if command.value is not None else True) else locator.uncheck()
        else: raise ValueError(f"Unsupported Playwright action: {command.type!r}")
        return []

    def close(self, plan: AutomationPlan) -> list[EvidenceRecord]:
        evidence: list[EvidenceRecord] = []
        try:
            if self._trace_started and self._context is not None:
                synthetic = AutomationCommand(id="playwright-trace", type="custom")
                path = _artifact_path(plan, synthetic, "zip")
                self._context.tracing.stop(path=str(path))
                evidence.append(file_evidence(plan.run_id, "trace", path))
        finally:
            if self._context is not None: self._context.close()
            if self._browser is not None: self._browser.close()
            if self._manager is not None: self._manager.stop()
            self._trace_started = False
        return evidence


class SeleniumPythonEngine:
    def __init__(self, driver_factory: Callable[[AutomationPlan], Any] | None = None):
        self._driver_factory = driver_factory
        self._driver: Any = None
        self._by: Any = None
        self._select_type: Any = None

    def _real_driver(self, plan: AutomationPlan):
        if plan.remote_url and not plan.allow_remote:
            raise ValueError("Selenium remoteUrl requires allowRemote=true.")
        webdriver = import_module("selenium.webdriver")
        by_module = import_module("selenium.webdriver.common.by")
        select_module = import_module("selenium.webdriver.support.ui")
        self._by = by_module.By
        self._select_type = select_module.Select
        browser = plan.browser.lower()
        if browser == "chrome":
            options = webdriver.ChromeOptions()
            if plan.headless: options.add_argument("--headless=new")
            local_factory = webdriver.Chrome
        elif browser == "firefox":
            options = webdriver.FirefoxOptions()
            if plan.headless: options.add_argument("-headless")
            local_factory = webdriver.Firefox
        elif browser == "edge":
            options = webdriver.EdgeOptions()
            if plan.headless: options.add_argument("--headless=new")
            local_factory = webdriver.Edge
        elif browser == "safari":
            options = webdriver.SafariOptions()
            local_factory = webdriver.Safari
        else:
            raise ValueError(f"Unsupported Selenium browser: {plan.browser!r}")
        if plan.remote_url:
            return webdriver.Remote(command_executor=plan.remote_url, options=options)
        return local_factory(options=options)

    def open(self, plan: AutomationPlan) -> None:
        self._driver = self._driver_factory(plan) if self._driver_factory else self._real_driver(plan)
        if self._by is None:
            class FallbackBy:
                CSS_SELECTOR="css selector"; XPATH="xpath"
            self._by = FallbackBy
        self._driver.set_page_load_timeout(plan.timeout_seconds)

    @staticmethod
    def _xpath_literal(value: str) -> str:
        if "'" not in value: return f"'{value}'"
        if '"' not in value: return f'"{value}"'
        pieces = value.split("'")
        return "concat(" + ", \"'\", ".join(f"'{piece}'" for piece in pieces) + ")"

    def _locator(self, locator: LocatorDescriptor) -> tuple[str, str]:
        by = self._by
        if locator.strategy == "css": return (by.CSS_SELECTOR, locator.value)
        if locator.strategy == "xpath": return (by.XPATH, locator.value)
        if locator.strategy == "testId":
            escaped = locator.value.replace('"', '\\"')
            return (by.CSS_SELECTOR, f'[data-testid="{escaped}"]')
        if locator.strategy == "text":
            return (by.XPATH, f"//*[normalize-space()={self._xpath_literal(locator.value)}]")
        if locator.strategy == "role":
            escaped = locator.value.replace('"', '\\"')
            return (by.CSS_SELECTOR, f'[role="{escaped}"]')
        if locator.strategy == "label":
            literal = self._xpath_literal(locator.value)
            return (by.XPATH, f"//label[normalize-space()={literal}]/following::input[1]")
        raise ValueError(f"Locator strategy {locator.strategy!r} is not supported by Selenium Python adapter.")

    def execute(self, command: AutomationCommand, plan: AutomationPlan) -> list[EvidenceRecord]:
        if self._driver is None: raise RuntimeError("Selenium driver is not initialized.")
        if command.type == "navigate":
            self._driver.get(_resolve_url(plan, command.url)); return []
        if command.type == "screenshot":
            path = _artifact_path(plan, command, "png")
            if not self._driver.save_screenshot(str(path)): raise RuntimeError("Selenium did not create screenshot evidence.")
            return [file_evidence(plan.run_id, "screenshot", path)]
        if command.locator is None: raise ValueError(f"Action {command.type!r} requires locator.")
        element = self._driver.find_element(*self._locator(command.locator))
        if command.type == "click": element.click()
        elif command.type == "fill":
            element.clear(); element.send_keys("" if command.value is None else str(command.value))
        elif command.type == "select":
            if self._select_type is None: self._select_type = import_module("selenium.webdriver.support.ui").Select
            self._select_type(element).select_by_value("" if command.value is None else str(command.value))
        elif command.type == "check":
            desired = bool(command.value if command.value is not None else True)
            if bool(element.is_selected()) != desired: element.click()
        else: raise ValueError(f"Unsupported Selenium action: {command.type!r}")
        return []

    def close(self, plan: AutomationPlan) -> list[EvidenceRecord]:
        if self._driver is not None:
            self._driver.quit(); self._driver = None
        return []


def create_automation_engine(plan: AutomationPlan) -> AutomationEngine:
    if plan.engine == "playwright": return PlaywrightPythonEngine()
    if plan.engine == "selenium": return SeleniumPythonEngine()
    raise ValueError(f"Unsupported Python automation engine: {plan.engine!r}")


def execute_automation_plan(
    plan: AutomationPlan,
    engine_factory: Callable[[AutomationPlan], AutomationEngine] = create_automation_engine,
) -> AutomationExecutionResult:
    started_at = _utc_now()
    steps: list[AutomationStepResult] = []
    evidence: list[EvidenceRecord] = []
    engine: AutomationEngine | None = None
    failure: FailureDetail | None = None
    status = "passed"
    try:
        engine = engine_factory(plan)
        engine.open(plan)
        for command in plan.commands:
            step_started = time.monotonic()
            try:
                evidence.extend(engine.execute(command, plan))
                steps.append(AutomationStepResult(command_id=command.id, action=command.type, status="passed", duration_ms=round((time.monotonic()-step_started)*1000)))
            except Exception as exc:
                detail = FailureDetail(message=str(exc), category=type(exc).__name__)
                steps.append(AutomationStepResult(command_id=command.id, action=command.type, status="failed", duration_ms=round((time.monotonic()-step_started)*1000), failure=detail))
                failure = detail; status = "failed"
                if plan.fail_fast: break
    except Exception as exc:
        failure = FailureDetail(message=str(exc), category=type(exc).__name__)
        status = "error"
    finally:
        if engine is not None:
            try: evidence.extend(engine.close(plan))
            except Exception as exc:
                if failure is None:
                    failure = FailureDetail(message=f"Automation teardown failed: {exc}", category=type(exc).__name__)
                    status = "error"
    return AutomationExecutionResult(
        run_id=plan.run_id, engine=plan.engine, status=status,
        started_at=started_at, finished_at=_utc_now(), steps=steps,
        evidence=evidence, failure=failure,
        metadata={"browser": plan.browser, "headless": plan.headless},
    )


def _failure_to_dict(failure: FailureDetail | None) -> dict[str, Any] | None:
    if failure is None: return None
    return {
        "message": failure.message, "category": failure.category,
        "stack": failure.stack, "fingerprint": failure.fingerprint,
    }

def _evidence_to_dict(record: EvidenceRecord) -> dict[str, Any]:
    return {
        "id": record.id, "runId": record.run_id, "kind": record.kind, "name": record.name,
        "contentType": record.content_type, "createdAt": record.created_at, "path": record.path,
        "uri": record.uri, "sha256": record.sha256, "redacted": record.redacted, "metadata": record.metadata,
    }

def automation_result_to_dict(result: AutomationExecutionResult) -> dict[str, Any]:
    return {
        "runId": result.run_id, "engine": result.engine, "status": result.status,
        "startedAt": result.started_at, "finishedAt": result.finished_at,
        "steps": [
            {
                "commandId": step.command_id, "action": step.action, "status": step.status,
                "durationMs": step.duration_ms, "failure": _failure_to_dict(step.failure),
            }
            for step in result.steps
        ],
        "evidence": [_evidence_to_dict(record) for record in result.evidence],
        "failure": _failure_to_dict(result.failure), "metadata": result.metadata,
    }
