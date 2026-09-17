/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/PlaywrightJavaEngine.java
 * Purpose: Executes Qualyntra web automation plans against optional Playwright Java libraries through reflection, including screenshots and trace evidence.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class PlaywrightJavaEngine implements AutomationEngine {
    private Object playwright;
    private Object browser;
    private Object context;
    private Object page;
    private boolean traceStarted;

    @Override public void open(AutomationModels.Plan plan) throws Exception {
        if (!Reflection.available("com.microsoft.playwright.Playwright")) throw new IllegalStateException("Playwright Java is not available on the runtime classpath.");
        playwright = Reflection.callStatic("com.microsoft.playwright.Playwright", "create");
        Object browserType = switch (plan.browser().toLowerCase(Locale.ROOT)) {
            case "chromium", "chrome" -> Reflection.call(playwright, "chromium");
            case "firefox" -> Reflection.call(playwright, "firefox");
            case "webkit" -> Reflection.call(playwright, "webkit");
            default -> throw new IllegalArgumentException("Unsupported Playwright Java browser: " + plan.browser());
        };
        Object launchOptions = Reflection.construct("com.microsoft.playwright.BrowserType$LaunchOptions");
        Reflection.call(launchOptions, "setHeadless", plan.headless());
        browser = Reflection.call(browserType, "launch", launchOptions);
        context = Reflection.call(browser, "newContext");
        if (plan.tracing()) {
            if (plan.artifactDirectory() == null || plan.artifactDirectory().isBlank()) throw new IllegalArgumentException("Playwright tracing requires artifactDirectory.");
            Object tracing = Reflection.call(context, "tracing");
            Object options = Reflection.construct("com.microsoft.playwright.Tracing$StartOptions");
            Reflection.call(options, "setScreenshots", true);
            Reflection.call(options, "setSnapshots", true);
            Reflection.call(options, "setSources", true);
            Reflection.call(tracing, "start", options);
            traceStarted = true;
        }
        page = Reflection.call(context, "newPage");
        Reflection.call(page, "setDefaultTimeout", (double) plan.timeoutMs());
    }

    @Override public List<Evidence> execute(AutomationModels.Command command, AutomationModels.Plan plan) throws Exception {
        if (page == null) throw new IllegalStateException("Playwright page is not initialized.");
        if ("navigate".equals(command.type())) {
            Reflection.call(page, "navigate", AutomationSupport.resolveUrl(plan, command.url()));
            return List.of();
        }
        if ("screenshot".equals(command.type())) {
            Path path = AutomationSupport.artifactPath(plan, command, "png");
            Object options = Reflection.construct("com.microsoft.playwright.Page$ScreenshotOptions");
            Reflection.call(options, "setPath", path);
            Object fullPage = command.metadata().get("fullPage");
            Reflection.call(options, "setFullPage", !(fullPage instanceof Boolean b) || b);
            Reflection.call(page, "screenshot", options);
            return List.of(Evidence.fromFile(plan.runId(), "screenshot", path, "image/png"));
        }
        if (command.locator() == null) throw new IllegalArgumentException("Action " + command.type() + " requires locator.");
        Object locator = locator(command.locator());
        switch (command.type()) {
            case "click" -> Reflection.call(locator, "click");
            case "fill" -> Reflection.call(locator, "fill", command.value() == null ? "" : String.valueOf(command.value()));
            case "select" -> Reflection.call(locator, "selectOption", command.value() == null ? "" : String.valueOf(command.value()));
            case "check" -> {
                boolean checked = !(command.value() instanceof Boolean b) || b;
                Reflection.call(locator, checked ? "check" : "uncheck");
            }
            default -> throw new IllegalArgumentException("Unsupported Playwright Java action: " + command.type());
        }
        return List.of();
    }

    private Object locator(AutomationModels.Locator locator) throws Exception {
        return switch (locator.strategy()) {
            case "css", "xpath" -> Reflection.call(page, "locator", locator.value());
            case "testId" -> Reflection.call(page, "getByTestId", locator.value());
            case "text" -> Reflection.call(page, "getByText", locator.value());
            case "label" -> Reflection.call(page, "getByLabel", locator.value());
            case "role" -> roleLocator(locator);
            default -> throw new IllegalArgumentException("Locator strategy " + locator.strategy() + " is not supported by Playwright Java adapter.");
        };
    }

    private Object roleLocator(AutomationModels.Locator locator) throws Exception {
        String enumName = locator.value().trim().replace('-', '_').replace(' ', '_').toUpperCase(Locale.ROOT);
        Object role = Reflection.enumValue("com.microsoft.playwright.options.AriaRole", enumName);
        Object name = locator.options().get("name");
        if (name == null) return Reflection.call(page, "getByRole", role);
        Object options = Reflection.construct("com.microsoft.playwright.Page$GetByRoleOptions");
        Reflection.call(options, "setName", String.valueOf(name));
        Object exact = locator.options().get("exact");
        if (exact instanceof Boolean b) Reflection.call(options, "setExact", b);
        return Reflection.call(page, "getByRole", role, options);
    }

    @Override public List<Evidence> finish(AutomationModels.Plan plan) throws Exception {
        List<Evidence> evidence = new ArrayList<>();
        if (traceStarted && context != null) {
            Object tracing = Reflection.call(context, "tracing");
            AutomationModels.Command synthetic = new AutomationModels.Command("playwright-trace", "custom", null, null, null, null);
            Path path = AutomationSupport.artifactPath(plan, synthetic, "zip");
            Object options = Reflection.construct("com.microsoft.playwright.Tracing$StopOptions");
            Reflection.call(options, "setPath", path);
            Reflection.call(tracing, "stop", options);
            evidence.add(Evidence.fromFile(plan.runId(), "trace", path, "application/zip"));
            traceStarted = false;
        }
        return evidence;
    }

    @Override public void close() throws Exception {
        Exception first = null;
        try { if (context != null) Reflection.call(context, "close"); } catch (Exception e) { first = e; }
        try { if (browser != null) Reflection.call(browser, "close"); } catch (Exception e) { if (first == null) first = e; }
        try { if (playwright != null) Reflection.call(playwright, "close"); } catch (Exception e) { if (first == null) first = e; }
        context = null; browser = null; playwright = null; page = null; traceStarted = false;
        if (first != null) throw first;
    }
}
