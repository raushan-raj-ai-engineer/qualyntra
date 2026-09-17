/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/RuntimeSnapshot.java
 * Purpose: Represents Java runtime identity and optional JUnit/TestNG class availability in the Java SDK wire model.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

import java.util.LinkedHashMap;
import java.util.Map;

public record RuntimeSnapshot(
    String version,
    String vendor,
    String runtimeName,
    String vmName,
    String osName,
    String osVersion,
    String osArch,
    boolean junitAvailable,
    boolean testngAvailable
) {
    public Map<String, Object> toMap() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("version", version);
        out.put("vendor", vendor);
        out.put("runtimeName", runtimeName);
        out.put("vmName", vmName);
        out.put("osName", osName);
        out.put("osVersion", osVersion);
        out.put("osArch", osArch);
        out.put("junitAvailable", junitAvailable);
        out.put("testngAvailable", testngAvailable);
        return out;
    }
}
