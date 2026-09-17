/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/Json.java
 * Purpose: Provides a small dependency-free JSON codec for the Java SDK stdio bridge so Maven/Gradle are not mandatory for runtime integration.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class Json {
    private Json() {}

    static Object parse(String text) {
        Parser parser = new Parser(text == null ? "" : text);
        Object value = parser.parseValue();
        parser.skipWhitespace();
        if (!parser.end()) throw new IllegalArgumentException("Unexpected trailing JSON content");
        return value;
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> parseObject(String text) {
        Object value = parse(text);
        if (!(value instanceof Map<?, ?> map)) throw new IllegalArgumentException("JSON root must be an object");
        return (Map<String, Object>) map;
    }

    static String stringify(Object value) {
        StringBuilder out = new StringBuilder();
        write(value, out);
        return out.toString();
    }

    private static void write(Object value, StringBuilder out) {
        if (value == null) {
            out.append("null");
        } else if (value instanceof String string) {
            writeString(string, out);
        } else if (value instanceof Number || value instanceof Boolean) {
            out.append(value);
        } else if (value instanceof Map<?, ?> map) {
            out.append('{');
            boolean first = true;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (!first) out.append(',');
                first = false;
                writeString(String.valueOf(entry.getKey()), out);
                out.append(':');
                write(entry.getValue(), out);
            }
            out.append('}');
        } else if (value instanceof Iterable<?> iterable) {
            out.append('[');
            boolean first = true;
            for (Object item : iterable) {
                if (!first) out.append(',');
                first = false;
                write(item, out);
            }
            out.append(']');
        } else {
            writeString(String.valueOf(value), out);
        }
    }

    private static void writeString(String value, StringBuilder out) {
        out.append('"');
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\b' -> out.append("\\b");
                case '\f' -> out.append("\\f");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) out.append(String.format("\\u%04x", (int) c));
                    else out.append(c);
                }
            }
        }
        out.append('"');
    }

    private static final class Parser {
        private final String text;
        private int index;

        private Parser(String text) {
            this.text = text;
        }

        private boolean end() {
            return index >= text.length();
        }

        private void skipWhitespace() {
            while (!end() && Character.isWhitespace(text.charAt(index))) index++;
        }

        private Object parseValue() {
            skipWhitespace();
            if (end()) throw new IllegalArgumentException("Expected JSON value");
            char c = text.charAt(index);
            return switch (c) {
                case '{' -> parseObject();
                case '[' -> parseArray();
                case '"' -> parseString();
                case 't' -> parseLiteral("true", Boolean.TRUE);
                case 'f' -> parseLiteral("false", Boolean.FALSE);
                case 'n' -> parseLiteral("null", null);
                default -> parseNumber();
            };
        }

        private Map<String, Object> parseObject() {
            expect('{');
            Map<String, Object> values = new LinkedHashMap<>();
            skipWhitespace();
            if (peek('}')) {
                index++;
                return values;
            }
            while (true) {
                skipWhitespace();
                String key = parseString();
                skipWhitespace();
                expect(':');
                values.put(key, parseValue());
                skipWhitespace();
                if (peek('}')) {
                    index++;
                    return values;
                }
                expect(',');
            }
        }

        private List<Object> parseArray() {
            expect('[');
            List<Object> values = new ArrayList<>();
            skipWhitespace();
            if (peek(']')) {
                index++;
                return values;
            }
            while (true) {
                values.add(parseValue());
                skipWhitespace();
                if (peek(']')) {
                    index++;
                    return values;
                }
                expect(',');
            }
        }

        private String parseString() {
            expect('"');
            StringBuilder out = new StringBuilder();
            while (!end()) {
                char c = text.charAt(index++);
                if (c == '"') return out.toString();
                if (c != '\\') {
                    out.append(c);
                    continue;
                }
                if (end()) throw new IllegalArgumentException("Invalid JSON escape");
                char escaped = text.charAt(index++);
                switch (escaped) {
                    case '"' -> out.append('"');
                    case '\\' -> out.append('\\');
                    case '/' -> out.append('/');
                    case 'b' -> out.append('\b');
                    case 'f' -> out.append('\f');
                    case 'n' -> out.append('\n');
                    case 'r' -> out.append('\r');
                    case 't' -> out.append('\t');
                    case 'u' -> {
                        if (index + 4 > text.length()) throw new IllegalArgumentException("Invalid unicode escape");
                        out.append((char) Integer.parseInt(text.substring(index, index + 4), 16));
                        index += 4;
                    }
                    default -> throw new IllegalArgumentException("Unsupported JSON escape: " + escaped);
                }
            }
            throw new IllegalArgumentException("Unterminated JSON string");
        }

        private Object parseNumber() {
            int start = index;
            if (peek('-')) index++;
            while (!end() && Character.isDigit(text.charAt(index))) index++;
            if (!end() && text.charAt(index) == '.') {
                index++;
                while (!end() && Character.isDigit(text.charAt(index))) index++;
            }
            if (!end() && (text.charAt(index) == 'e' || text.charAt(index) == 'E')) {
                index++;
                if (!end() && (text.charAt(index) == '+' || text.charAt(index) == '-')) index++;
                while (!end() && Character.isDigit(text.charAt(index))) index++;
            }
            String token = text.substring(start, index);
            if (token.isEmpty() || "-".equals(token)) throw new IllegalArgumentException("Invalid JSON number");
            return token.contains(".") || token.contains("e") || token.contains("E")
                ? Double.parseDouble(token)
                : Long.parseLong(token);
        }

        private Object parseLiteral(String literal, Object value) {
            if (!text.startsWith(literal, index)) throw new IllegalArgumentException("Invalid JSON literal");
            index += literal.length();
            return value;
        }

        private boolean peek(char expected) {
            return !end() && text.charAt(index) == expected;
        }

        private void expect(char expected) {
            skipWhitespace();
            if (end() || text.charAt(index) != expected) {
                throw new IllegalArgumentException("Expected '" + expected + "' at position " + index);
            }
            index++;
        }
    }
}
