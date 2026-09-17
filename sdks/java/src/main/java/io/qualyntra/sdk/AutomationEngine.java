/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/AutomationEngine.java
 * Purpose: Defines the dependency-neutral Java browser automation engine contract used by Playwright and Selenium implementations and test doubles.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

import java.util.List;

public interface AutomationEngine extends AutoCloseable {
    void open(AutomationModels.Plan plan) throws Exception;
    List<Evidence> execute(AutomationModels.Command command, AutomationModels.Plan plan) throws Exception;
    List<Evidence> finish(AutomationModels.Plan plan) throws Exception;
    @Override void close() throws Exception;
}
