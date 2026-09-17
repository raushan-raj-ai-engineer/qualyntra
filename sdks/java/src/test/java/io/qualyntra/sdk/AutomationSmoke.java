/**
 * File: sdks/java/src/test/java/io/qualyntra/sdk/AutomationSmoke.java
 * Purpose: Validates Java automation plan parsing, normalized executor behavior, evidence aggregation, fail-fast handling, and guaranteed engine closure without browser dependencies.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class AutomationSmoke {
    private AutomationSmoke() {}

    public static void main(String[] args) throws Exception {
        Path dir = Files.createTempDirectory("qualyntra-java-automation-");
        try {
            AutomationModels.Plan plan = AutomationModels.planFromMap(Map.of(
                "runId", "java-auto-1",
                "engine", "fake",
                "browser", "chrome",
                "artifactDirectory", dir.toString(),
                "commands", List.of(
                    Map.of("id", "nav", "type", "navigate", "url", "/home"),
                    Map.of("id", "shot", "type", "screenshot")
                )
            ));
            FakeEngine engine = new FakeEngine(dir);
            AutomationModels.Result result = new AutomationExecutor(ignored -> engine).execute(plan);
            require("passed".equals(result.status()), "fake plan should pass");
            require(result.steps().size() == 2, "two steps expected");
            require(result.evidence().size() == 1, "one evidence expected");
            require(engine.closed, "engine must close");

            AutomationModels.Plan failing = AutomationModels.planFromMap(Map.of(
                "runId", "java-auto-2",
                "engine", "fake",
                "commands", List.of(
                    Map.of("id", "bad", "type", "click"),
                    Map.of("id", "never", "type", "click")
                )
            ));
            FakeEngine failingEngine = new FakeEngine(dir); failingEngine.fail = true;
            AutomationModels.Result failed = new AutomationExecutor(ignored -> failingEngine).execute(failing);
            require("failed".equals(failed.status()), "failed action must normalize as failed");
            require(failed.steps().size() == 1, "fail-fast must stop subsequent commands");
            require(failingEngine.closed, "failing engine must still close");

            Map<String, Object> health = AutomationSupport.healthAll();
            require(health.containsKey("engines"), "automation health must expose engines");
            System.out.println("Java automation smoke passed");
        } finally {
            try (var paths = Files.walk(dir)) {
                paths.sorted((a,b)->b.getNameCount()-a.getNameCount()).forEach(path -> { try { Files.deleteIfExists(path); } catch (Exception ignored) {} });
            }
        }
    }

    private static final class FakeEngine implements AutomationEngine {
        private final Path directory; boolean closed; boolean fail;
        private FakeEngine(Path directory) { this.directory = directory; }
        public void open(AutomationModels.Plan plan) {}
        public List<Evidence> execute(AutomationModels.Command command, AutomationModels.Plan plan) throws Exception {
            if (fail) throw new IllegalStateException("synthetic failure");
            if (!"screenshot".equals(command.type())) return List.of();
            Path file = directory.resolve("fake.png"); Files.writeString(file, "png");
            return List.of(Evidence.fromFile(plan.runId(), "screenshot", file, "image/png"));
        }
        public List<Evidence> finish(AutomationModels.Plan plan) { return new ArrayList<>(); }
        public void close() { closed = true; }
    }

    private static void require(boolean condition, String message) { if (!condition) throw new IllegalStateException(message); }
}
