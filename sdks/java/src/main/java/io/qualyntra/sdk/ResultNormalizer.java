/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/ResultNormalizer.java
 * Purpose: Securely normalizes JUnit XML and native TestNG XML into Qualyntra's universal test-result wire shape using only JDK XML APIs.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

import java.io.StringReader;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

public final class ResultNormalizer {
    private ResultNormalizer() {}

    public static List<Map<String, Object>> parseJUnit(String xml, String runId, Map<String, Object> runtime) {
        Document document = parse(xml);
        List<Map<String, Object>> results = new ArrayList<>();
        NodeList cases = document.getElementsByTagName("testcase");
        for (int i = 0; i < cases.getLength(); i++) {
            Element testCase = (Element) cases.item(i);
            Element failure = firstChild(testCase, "failure");
            Element error = firstChild(testCase, "error");
            Element skipped = firstChild(testCase, "skipped");
            Element problem = failure != null ? failure : error;
            String status = problem != null ? "failed" : skipped != null ? "skipped" : "passed";
            Map<String, Object> result = baseResult(
                runId,
                attribute(testCase, "classname"),
                attributeOr(testCase, "name", "unnamed"),
                status,
                secondsToMillis(attribute(testCase, "time")),
                runtime
            );
            if (problem != null) result.put("failure", failure(problem, error != null ? "error" : "assertion"));
            results.add(result);
        }
        return results;
    }

    public static List<Map<String, Object>> parseTestNg(String xml, String runId, Map<String, Object> runtime) {
        Document document = parse(xml);
        List<Map<String, Object>> results = new ArrayList<>();
        NodeList methods = document.getElementsByTagName("test-method");
        for (int i = 0; i < methods.getLength(); i++) {
            Element method = (Element) methods.item(i);
            String rawStatus = attributeOr(method, "status", "FAIL").toUpperCase();
            String status = switch (rawStatus) {
                case "PASS" -> "passed";
                case "SKIP", "SKIPPED" -> "skipped";
                default -> "failed";
            };
            String suite = ancestorClassName(method);
            long durationMs = parseLong(attribute(method, "duration-ms"));
            Map<String, Object> result = baseResult(
                runId,
                suite,
                attributeOr(method, "name", "unnamed"),
                status,
                durationMs,
                runtime
            );
            if ("failed".equals(status)) {
                Element exception = firstChild(method, "exception");
                Element message = exception == null ? null : firstChild(exception, "message");
                String text = message == null ? "TestNG test failed" : text(message);
                result.put("failure", Map.of("message", text, "category", "assertion"));
            }
            results.add(result);
        }
        return results;
    }

    private static Document parse(String xml) {
        if (xml == null || xml.isBlank()) throw new IllegalArgumentException("XML content is required");
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            return factory.newDocumentBuilder().parse(new InputSource(new StringReader(xml)));
        } catch (Exception exception) {
            throw new IllegalArgumentException("Invalid or unsafe XML result payload", exception);
        }
    }

    private static Map<String, Object> baseResult(
        String runId,
        String suite,
        String name,
        String status,
        long durationMs,
        Map<String, Object> runtime
    ) {
        if (runId == null || runId.isBlank()) throw new IllegalArgumentException("runId is required");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", "test_" + UUID.randomUUID().toString().replace("-", ""));
        result.put("runId", runId);
        if (suite != null && !suite.isBlank()) result.put("suite", suite);
        result.put("name", name);
        result.put("status", status);
        result.put("durationMs", durationMs);
        result.put("runtime", runtime == null ? Map.of("language", "java", "runner", "unknown") : runtime);
        return result;
    }

    private static Map<String, Object> failure(Element problem, String category) {
        String message = attribute(problem, "message");
        if (message == null || message.isBlank()) message = text(problem);
        if (message == null || message.isBlank()) message = "failure";
        return Map.of("message", message.trim(), "category", category);
    }

    private static Element firstChild(Element parent, String name) {
        NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node node = children.item(i);
            if (node instanceof Element element && name.equals(element.getTagName())) return element;
        }
        return null;
    }

    private static String ancestorClassName(Element element) {
        Node current = element.getParentNode();
        while (current != null) {
            if (current instanceof Element parent && "class".equals(parent.getTagName())) {
                return attribute(parent, "name");
            }
            current = current.getParentNode();
        }
        return null;
    }

    private static String attribute(Element element, String name) {
        String value = element.getAttribute(name);
        return value == null || value.isBlank() ? null : value;
    }

    private static String attributeOr(Element element, String name, String fallback) {
        String value = attribute(element, name);
        return value == null ? fallback : value;
    }

    private static String text(Element element) {
        return element == null ? null : element.getTextContent();
    }

    private static long secondsToMillis(String value) {
        if (value == null || value.isBlank()) return 0L;
        try {
            return Math.round(Double.parseDouble(value) * 1000.0);
        } catch (NumberFormatException ignored) {
            return 0L;
        }
    }

    private static long parseLong(String value) {
        if (value == null || value.isBlank()) return 0L;
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ignored) {
            return 0L;
        }
    }
}
