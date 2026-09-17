/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/AutomationFactory.java
 * Purpose: Selects optional Java automation engines by normalized engine id without exposing vendor dependencies to bridge or orchestration code.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

public final class AutomationFactory {
    private AutomationFactory() {}
    public static AutomationEngine create(AutomationModels.Plan plan) {
        return switch (plan.engine().strip().toLowerCase()) {
            case "playwright" -> new PlaywrightJavaEngine();
            case "selenium" -> new SeleniumJavaEngine();
            default -> throw new IllegalArgumentException("Unsupported Java automation engine: " + plan.engine());
        };
    }
}
