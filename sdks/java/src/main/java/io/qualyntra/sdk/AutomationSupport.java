/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/AutomationSupport.java
 * Purpose: Centralizes artifact confinement, URL resolution, locator escaping, and optional-engine health checks for Java automation adapters.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

final class AutomationSupport {
    private AutomationSupport() {}

    static Map<String, Object> healthAll() {
        Map<String, Object> engines = new LinkedHashMap<>();
        engines.put("playwright", health("playwright"));
        engines.put("selenium", health("selenium"));
        return Map.of("engines", engines);
    }

    static Map<String, Object> health(String engine) {
        String normalized = engine == null ? "" : engine.strip().toLowerCase();
        boolean available = switch (normalized) {
            case "playwright" -> Reflection.available("com.microsoft.playwright.Playwright");
            case "selenium" -> Reflection.available("org.openqa.selenium.WebDriver");
            default -> throw new IllegalArgumentException("Unsupported Java automation engine: " + engine);
        };
        return Map.of(
            "engine", normalized,
            "available", available,
            "capabilities", Map.of(
                "web", true,
                "screenshots", true,
                "tracing", "playwright".equals(normalized),
                "remoteWebDriver", "selenium".equals(normalized)
            )
        );
    }

    static Path artifactPath(AutomationModels.Plan plan, AutomationModels.Command command, String extension) throws Exception {
        if (plan.artifactDirectory() == null || plan.artifactDirectory().isBlank()) {
            throw new IllegalArgumentException("Action " + command.type() + " requires artifactDirectory.");
        }
        Path directory = Path.of(plan.artifactDirectory()).toAbsolutePath().normalize();
        Files.createDirectories(directory);
        String safeId = command.id().replaceAll("[^A-Za-z0-9_.-]+", "_").replaceAll("^[._]+|[._]+$", "");
        if (safeId.isBlank()) safeId = "artifact";
        Path path = directory.resolve(safeId + "." + extension).toAbsolutePath().normalize();
        if (!directory.equals(path.getParent())) throw new IllegalArgumentException("Artifact path escaped artifactDirectory.");
        return path;
    }

    static String resolveUrl(AutomationModels.Plan plan, String requested) {
        if (requested == null || requested.isBlank()) throw new IllegalArgumentException("navigate action requires url.");
        if (plan.baseUrl() == null || plan.baseUrl().isBlank()) return requested;
        URI base = URI.create(plan.baseUrl().endsWith("/") ? plan.baseUrl() : plan.baseUrl() + "/");
        return base.resolve(requested).toString();
    }

    static String xpathLiteral(String value) {
        if (!value.contains("'")) return "'" + value + "'";
        if (!value.contains("\"")) return "\"" + value + "\"";
        String[] parts = value.split("'", -1);
        StringBuilder out = new StringBuilder("concat(");
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) out.append(",\"'\",");
            out.append("'").append(parts[i]).append("'");
        }
        return out.append(")").toString();
    }
}
