/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/AutomationModels.java
 * Purpose: Defines vendor-neutral Java automation plan, command, locator, step, and normalized execution-result models shared by Playwright and Selenium engines.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class AutomationModels {
    private AutomationModels() {}

    public record Locator(String strategy, String value, Map<String, Object> options) {
        public Locator {
            if (strategy == null || strategy.isBlank()) throw new IllegalArgumentException("locator strategy is required");
            if (value == null || value.isBlank()) throw new IllegalArgumentException("locator value is required");
            options = options == null ? Map.of() : Map.copyOf(options);
        }
    }

    public record Command(
        String id,
        String type,
        Locator locator,
        Object value,
        String url,
        Map<String, Object> metadata
    ) {
        public Command {
            if (id == null || id.isBlank()) throw new IllegalArgumentException("command id is required");
            if (type == null || type.isBlank()) throw new IllegalArgumentException("command type is required");
            metadata = metadata == null ? Map.of() : Map.copyOf(metadata);
        }
    }

    public record Plan(
        String runId,
        String engine,
        String browser,
        boolean headless,
        String baseUrl,
        String remoteUrl,
        boolean allowRemote,
        String artifactDirectory,
        boolean tracing,
        long timeoutMs,
        boolean failFast,
        List<Command> commands,
        Map<String, Object> metadata
    ) {
        public Plan {
            if (runId == null || runId.isBlank()) throw new IllegalArgumentException("runId is required");
            if (engine == null || engine.isBlank()) throw new IllegalArgumentException("engine is required");
            browser = browser == null || browser.isBlank() ? "chromium" : browser.toLowerCase();
            if (timeoutMs <= 0) timeoutMs = 30_000L;
            commands = commands == null ? List.of() : List.copyOf(commands);
            metadata = metadata == null ? Map.of() : Map.copyOf(metadata);
        }
    }

    public record Step(
        String commandId,
        String action,
        String status,
        long durationMs,
        Map<String, Object> failure
    ) {
        public Map<String, Object> toMap() {
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("commandId", commandId);
            out.put("action", action);
            out.put("status", status);
            out.put("durationMs", durationMs);
            if (failure != null && !failure.isEmpty()) out.put("failure", failure);
            return out;
        }
    }

    public record Result(
        String runId,
        String engine,
        String status,
        String startedAt,
        String finishedAt,
        List<Step> steps,
        List<Evidence> evidence,
        Map<String, Object> failure,
        Map<String, Object> metadata
    ) {
        public Map<String, Object> toMap() {
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("runId", runId);
            out.put("engine", engine);
            out.put("status", status);
            out.put("startedAt", startedAt);
            out.put("finishedAt", finishedAt);
            out.put("steps", steps.stream().map(Step::toMap).toList());
            out.put("evidence", evidence.stream().map(Evidence::toMap).toList());
            if (failure != null && !failure.isEmpty()) out.put("failure", failure);
            if (metadata != null && !metadata.isEmpty()) out.put("metadata", metadata);
            return out;
        }
    }

    @SuppressWarnings("unchecked")
    public static Plan planFromMap(Map<String, Object> payload) {
        Object commandsValue = payload.get("commands");
        List<Command> commands = new ArrayList<>();
        if (commandsValue instanceof List<?> list) {
            for (Object item : list) {
                if (!(item instanceof Map<?, ?> raw)) throw new IllegalArgumentException("commands must contain objects");
                Map<String, Object> map = (Map<String, Object>) raw;
                Map<String, Object> locatorMap = object(map.get("locator"));
                Locator locator = locatorMap.isEmpty() ? null : new Locator(
                    required(locatorMap, "strategy"),
                    required(locatorMap, "value"),
                    object(locatorMap.get("options"))
                );
                commands.add(new Command(
                    required(map, "id"),
                    required(map, "type"),
                    locator,
                    map.get("value"),
                    string(map.get("url")),
                    object(map.get("metadata"))
                ));
            }
        }
        return new Plan(
            required(payload, "runId"),
            required(payload, "engine").toLowerCase(),
            stringOr(payload.get("browser"), "chromium"),
            bool(payload.get("headless"), true),
            string(payload.get("baseUrl")),
            string(payload.get("remoteUrl")),
            bool(payload.get("allowRemote"), false),
            string(payload.get("artifactDirectory")),
            bool(payload.get("tracing"), false),
            number(payload.get("timeoutMs"), 30_000L),
            bool(payload.get("failFast"), true),
            commands,
            object(payload.get("metadata"))
        );
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> object(Object value) {
        return value instanceof Map<?, ?> map ? new LinkedHashMap<>((Map<String, Object>) map) : Map.of();
    }

    private static String required(Map<String, Object> map, String key) {
        String value = string(map.get(key));
        if (value == null || value.isBlank()) throw new IllegalArgumentException(key + " is required");
        return value;
    }

    private static String string(Object value) { return value == null ? null : String.valueOf(value); }
    private static String stringOr(Object value, String fallback) { String text = string(value); return text == null || text.isBlank() ? fallback : text; }
    private static boolean bool(Object value, boolean fallback) { return value instanceof Boolean b ? b : fallback; }
    private static long number(Object value, long fallback) { return value instanceof Number n ? n.longValue() : fallback; }
}
