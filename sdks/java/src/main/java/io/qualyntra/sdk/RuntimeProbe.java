/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/RuntimeProbe.java
 * Purpose: Discovers JVM metadata and optional JUnit/TestNG classes using only JDK APIs.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

public final class RuntimeProbe {
    private RuntimeProbe() {}

    public static RuntimeSnapshot discover() {
        return new RuntimeSnapshot(
            System.getProperty("java.version"),
            System.getProperty("java.vendor"),
            System.getProperty("java.runtime.name"),
            System.getProperty("java.vm.name"),
            System.getProperty("os.name"),
            System.getProperty("os.version"),
            System.getProperty("os.arch"),
            classAvailable("org.junit.jupiter.api.Test"),
            classAvailable("org.testng.TestNG")
        );
    }

    private static boolean classAvailable(String name) {
        try {
            Class.forName(name, false, ClassLoader.getSystemClassLoader());
            return true;
        } catch (Throwable ignored) {
            return false;
        }
    }
}
