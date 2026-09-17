/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/AutomationExecutor.java
 * Purpose: Executes Java automation plans with deterministic step timing, fail-fast policy, normalized failures, evidence aggregation, and guaranteed teardown.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class AutomationExecutor {
    @FunctionalInterface public interface EngineFactory { AutomationEngine create(AutomationModels.Plan plan) throws Exception; }
    private final EngineFactory factory;

    public AutomationExecutor(EngineFactory factory) { this.factory = factory; }

    public AutomationModels.Result execute(AutomationModels.Plan plan) {
        Instant started = Instant.now();
        List<AutomationModels.Step> steps = new ArrayList<>();
        List<Evidence> evidence = new ArrayList<>();
        Map<String, Object> topFailure = null;
        String status = "passed";
        AutomationEngine engine = null;
        try {
            engine = factory.create(plan);
            engine.open(plan);
            for (AutomationModels.Command command : plan.commands()) {
                long before = System.nanoTime();
                try {
                    evidence.addAll(engine.execute(command, plan));
                    steps.add(new AutomationModels.Step(command.id(), command.type(), "passed", elapsed(before), null));
                } catch (Exception exception) {
                    Map<String, Object> failure = failure(exception);
                    steps.add(new AutomationModels.Step(command.id(), command.type(), "failed", elapsed(before), failure));
                    status = "failed";
                    if (topFailure == null) topFailure = failure;
                    if (plan.failFast()) break;
                }
            }
        } catch (Exception exception) {
            status = "error";
            topFailure = failure(exception);
        } finally {
            if (engine != null) {
                try { evidence.addAll(engine.finish(plan)); }
                catch (Exception exception) {
                    if (topFailure == null) topFailure = failure(exception);
                    if ("passed".equals(status)) status = "error";
                }
                try { engine.close(); }
                catch (Exception exception) {
                    if (topFailure == null) topFailure = failure(exception);
                    if ("passed".equals(status)) status = "error";
                }
            }
        }
        return new AutomationModels.Result(
            plan.runId(), plan.engine(), status, started.toString(), Instant.now().toString(),
            steps, evidence, topFailure, Map.of("language", "java", "browser", plan.browser())
        );
    }

    private static long elapsed(long start) { return Math.max(0L, (System.nanoTime() - start) / 1_000_000L); }
    private static Map<String, Object> failure(Exception exception) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("category", exception.getClass().getSimpleName());
        out.put("message", exception.getMessage() == null ? "Java automation failure" : exception.getMessage());
        return out;
    }
}
