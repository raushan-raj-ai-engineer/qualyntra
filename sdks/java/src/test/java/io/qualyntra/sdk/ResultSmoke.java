/**
 * File: sdks/java/src/test/java/io/qualyntra/sdk/ResultSmoke.java
 * Purpose: Verifies secure JUnit/TestNG normalization and SHA-256 evidence generation using only JDK APIs.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

public final class ResultSmoke {
    public static void main(String[] args) throws Exception {
        Map<String, Object> runtime = Map.of("language", "java", "runner", "junit");
        String junit = "<testsuite><testcase classname=\"Demo\" name=\"passes\" time=\"0.1\"/><testcase classname=\"Demo\" name=\"fails\"><failure message=\"boom\">stack</failure></testcase></testsuite>";
        List<Map<String, Object>> junitResults = ResultNormalizer.parseJUnit(junit, "run-java", runtime);
        if (junitResults.size() != 2 || !"failed".equals(junitResults.get(1).get("status"))) {
            throw new IllegalStateException("JUnit normalization failure");
        }

        String testng = "<testng-results><suite><test><class name=\"Demo\"><test-method name=\"skipMe\" status=\"SKIP\" duration-ms=\"2\"/></class></test></suite></testng-results>";
        List<Map<String, Object>> testngResults = ResultNormalizer.parseTestNg(testng, "run-java", Map.of("language", "java", "runner", "testng"));
        if (testngResults.size() != 1 || !"skipped".equals(testngResults.get(0).get("status"))) {
            throw new IllegalStateException("TestNG normalization failure");
        }

        Path file = Files.createTempFile("qualyntra-java-evidence-", ".txt");
        try {
            Files.writeString(file, "evidence");
            Evidence evidence = Evidence.fromFile("run-java", "log", file, "text/plain");
            if (evidence.sha256() == null || evidence.sha256().length() != 64) {
                throw new IllegalStateException("evidence hashing failure");
            }
        } finally {
            Files.deleteIfExists(file);
        }
        System.out.println("Java result/evidence smoke passed");
    }
}
