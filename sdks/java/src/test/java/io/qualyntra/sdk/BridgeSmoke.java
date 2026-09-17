/**
 * File: sdks/java/src/test/java/io/qualyntra/sdk/BridgeSmoke.java
 * Purpose: Verifies Java bridge health and JSON codec behavior without external dependencies.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

import java.util.Map;

public final class BridgeSmoke {
    public static void main(String[] args) throws Exception {
        Map<String, Object> health = Bridge.handle(Map.of("operation", "health"));
        if (!"healthy".equals(health.get("status"))) throw new IllegalStateException("bridge health failure");

        String encoded = Json.stringify(Map.of("text", "hello\nworld", "count", 2, "ok", true));
        Map<String, Object> decoded = Json.parseObject(encoded);
        if (!"hello\nworld".equals(decoded.get("text"))) throw new IllegalStateException("json round-trip failure");
        System.out.println("Java bridge smoke passed");
    }
}
