/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/SeleniumJavaEngine.java
 * Purpose: Executes Qualyntra web automation plans against optional Selenium Java libraries through reflection with local/remote WebDriver safety and screenshot evidence.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Locale;

public final class SeleniumJavaEngine implements AutomationEngine {
    private Object driver;

    @Override public void open(AutomationModels.Plan plan) throws Exception {
        if (!Reflection.available("org.openqa.selenium.WebDriver")) throw new IllegalStateException("Selenium Java is not available on the runtime classpath.");
        if (plan.remoteUrl() != null && !plan.remoteUrl().isBlank() && !plan.allowRemote()) throw new IllegalArgumentException("Selenium remoteUrl requires allowRemote=true.");
        Object options = options(plan);
        if (plan.remoteUrl() != null && !plan.remoteUrl().isBlank()) {
            Class<?> capabilities = Reflection.type("org.openqa.selenium.Capabilities");
            driver = Reflection.construct(
                Reflection.type("org.openqa.selenium.remote.RemoteWebDriver"),
                URI.create(plan.remoteUrl()).toURL(),
                capabilities.cast(options)
            );
        } else {
            driver = localDriver(plan, options);
        }
        Object manage = Reflection.call(driver, "manage");
        Object timeouts = Reflection.call(manage, "timeouts");
        Reflection.call(timeouts, "implicitlyWait", Duration.ofMillis(plan.timeoutMs()));
    }

    private Object options(AutomationModels.Plan plan) throws Exception {
        String browser = plan.browser().toLowerCase(Locale.ROOT);
        Object options = switch (browser) {
            case "chromium", "chrome" -> Reflection.construct("org.openqa.selenium.chrome.ChromeOptions");
            case "firefox" -> Reflection.construct("org.openqa.selenium.firefox.FirefoxOptions");
            case "edge" -> Reflection.construct("org.openqa.selenium.edge.EdgeOptions");
            case "safari" -> Reflection.construct("org.openqa.selenium.safari.SafariOptions");
            default -> throw new IllegalArgumentException("Unsupported Selenium Java browser: " + plan.browser());
        };
        if (plan.headless() && !"safari".equals(browser)) {
            String argument = "firefox".equals(browser) ? "-headless" : "--headless=new";
            try { Reflection.call(options, "addArguments", List.of(argument)); }
            catch (NoSuchMethodException ignored) { Reflection.call(options, "addArguments", argument); }
        }
        return options;
    }

    private Object localDriver(AutomationModels.Plan plan, Object options) throws Exception {
        return switch (plan.browser().toLowerCase(Locale.ROOT)) {
            case "chromium", "chrome" -> Reflection.construct("org.openqa.selenium.chrome.ChromeDriver", options);
            case "firefox" -> Reflection.construct("org.openqa.selenium.firefox.FirefoxDriver", options);
            case "edge" -> Reflection.construct("org.openqa.selenium.edge.EdgeDriver", options);
            case "safari" -> Reflection.construct("org.openqa.selenium.safari.SafariDriver", options);
            default -> throw new IllegalArgumentException("Unsupported Selenium Java browser: " + plan.browser());
        };
    }

    @Override public List<Evidence> execute(AutomationModels.Command command, AutomationModels.Plan plan) throws Exception {
        if (driver == null) throw new IllegalStateException("Selenium driver is not initialized.");
        if ("navigate".equals(command.type())) {
            Reflection.call(driver, "get", AutomationSupport.resolveUrl(plan, command.url()));
            return List.of();
        }
        if ("screenshot".equals(command.type())) {
            Path path = AutomationSupport.artifactPath(plan, command, "png");
            Object outputType = Reflection.fieldStatic("org.openqa.selenium.OutputType", "BYTES");
            byte[] bytes = (byte[]) Reflection.call(driver, "getScreenshotAs", outputType);
            Files.write(path, bytes);
            return List.of(Evidence.fromFile(plan.runId(), "screenshot", path, "image/png"));
        }
        if (command.locator() == null) throw new IllegalArgumentException("Action " + command.type() + " requires locator.");
        Object element = Reflection.call(driver, "findElement", by(command.locator()));
        switch (command.type()) {
            case "click" -> Reflection.call(element, "click");
            case "fill" -> {
                Reflection.call(element, "clear");
                Reflection.call(element, "sendKeys", (Object) new CharSequence[]{command.value() == null ? "" : String.valueOf(command.value())});
            }
            case "select" -> {
                Object select = Reflection.construct("org.openqa.selenium.support.ui.Select", element);
                Reflection.call(select, "selectByValue", command.value() == null ? "" : String.valueOf(command.value()));
            }
            case "check" -> {
                boolean target = !(command.value() instanceof Boolean b) || b;
                boolean selected = Boolean.TRUE.equals(Reflection.call(element, "isSelected"));
                if (selected != target) Reflection.call(element, "click");
            }
            default -> throw new IllegalArgumentException("Unsupported Selenium Java action: " + command.type());
        }
        return List.of();
    }

    private Object by(AutomationModels.Locator locator) throws Exception {
        String value = locator.value();
        return switch (locator.strategy()) {
            case "css" -> Reflection.callStatic("org.openqa.selenium.By", "cssSelector", value);
            case "xpath" -> Reflection.callStatic("org.openqa.selenium.By", "xpath", value);
            case "testId" -> Reflection.callStatic("org.openqa.selenium.By", "cssSelector", "[data-testid='" + cssEscape(value) + "']");
            case "text" -> Reflection.callStatic("org.openqa.selenium.By", "xpath", "//*[normalize-space()=" + AutomationSupport.xpathLiteral(value) + "]");
            case "role" -> Reflection.callStatic("org.openqa.selenium.By", "cssSelector", "[role='" + cssEscape(value) + "']");
            case "label" -> Reflection.callStatic("org.openqa.selenium.By", "xpath", "//label[normalize-space()=" + AutomationSupport.xpathLiteral(value) + "]//*[@id] | //*[@id=//label[normalize-space()=" + AutomationSupport.xpathLiteral(value) + "]/@for]");
            default -> throw new IllegalArgumentException("Locator strategy " + locator.strategy() + " is not supported by Selenium Java adapter.");
        };
    }

    private static String cssEscape(String value) { return value.replace("\\", "\\\\").replace("'", "\\'"); }

    @Override public List<Evidence> finish(AutomationModels.Plan plan) { return List.of(); }

    @Override public void close() throws Exception {
        if (driver != null) {
            try { Reflection.call(driver, "quit"); }
            finally { driver = null; }
        }
    }
}
