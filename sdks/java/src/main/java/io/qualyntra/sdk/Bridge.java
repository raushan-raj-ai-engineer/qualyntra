/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/Bridge.java
 * Purpose: Exposes the Java SDK through a stable dependency-free JSON-over-stdio bridge for runtime health, result normalization, and evidence collection.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class Bridge {
    private Bridge() {}

    public static Map<String, Object> handle(Map<String, Object> payload) throws Exception {
        String operation = string(payload.get("operation"));
        return switch (operation) {
            case "health" -> Map.of("status", "healthy", "runtime", RuntimeProbe.discover().toMap());
            case "results.junit.normalize" -> Map.of(
                "results",
                ResultNormalizer.parseJUnit(
                    requiredString(payload, "xml"),
                    requiredString(payload, "runId"),
                    object(payload.get("runtime"))
                )
            );
            case "results.testng.normalize" -> Map.of(
                "results",
                ResultNormalizer.parseTestNg(
                    requiredString(payload, "xml"),
                    requiredString(payload, "runId"),
                    object(payload.get("runtime"))
                )
            );
            case "evidence.file" -> Map.of(
                "evidence",
                Evidence.fromFile(
                    requiredString(payload, "runId"),
                    stringOr(payload.get("kind"), "custom"),
                    Path.of(requiredString(payload, "path")),
                    stringOr(payload.get("contentType"), "application/octet-stream")
                ).toMap()
            );
            default -> throw new IllegalArgumentException("Unsupported bridge operation: " + operation);
        };
    }

    public static void main(String[] args) {
        Map<String, Object> response = new LinkedHashMap<>();
        try {
            String input = new String(System.in.readAllBytes(), StandardCharsets.UTF_8);
            Map<String, Object> payload = Json.parseObject(input.isBlank() ? "{}" : input);
            response.put("ok", true);
            response.put("data", handle(payload));
            System.out.println(Json.stringify(response));
        } catch (Exception exception) {
            response.put("ok", false);
            response.put("error", Map.of(
                "type", exception.getClass().getSimpleName(),
                "message", exception.getMessage() == null ? "Java bridge failure" : exception.getMessage()
            ));
            System.out.println(Json.stringify(response));
            System.exit(1);
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> object(Object value) {
        return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of("language", "java", "runner", "unknown");
    }

    private static String requiredString(Map<String, Object> payload, String key) {
        String value = string(payload.get(key));
        if (value == null || value.isBlank()) throw new IllegalArgumentException(key + " is required");
        return value;
    }

    private static String string(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static String stringOr(Object value, String fallback) {
        String text = string(value);
        return text == null || text.isBlank() ? fallback : text;
    }
}
