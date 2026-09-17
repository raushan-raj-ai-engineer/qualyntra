/**
 * File: sdks/java/src/main/java/io/qualyntra/sdk/Evidence.java
 * Purpose: Creates SHA-256-backed Java evidence records compatible with Qualyntra's universal artifact model.
 * Author: Raushan Raj
 */
package io.qualyntra.sdk;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

public record Evidence(
    String id,
    String runId,
    String kind,
    String name,
    String contentType,
    String createdAt,
    String path,
    String sha256,
    boolean redacted
) {
    public static Evidence fromFile(String runId, String kind, Path path, String contentType) throws IOException {
        if (runId == null || runId.isBlank()) throw new IllegalArgumentException("runId is required");
        if (!Files.isRegularFile(path)) throw new IllegalArgumentException("Evidence path must be a regular file");
        return new Evidence(
            "evidence_" + UUID.randomUUID().toString().replace("-", ""),
            runId,
            kind,
            path.getFileName().toString(),
            contentType,
            Instant.now().toString(),
            path.toAbsolutePath().normalize().toString(),
            sha256(path),
            false
        );
    }

    public Map<String, Object> toMap() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", id);
        out.put("runId", runId);
        out.put("kind", kind);
        out.put("name", name);
        out.put("contentType", contentType);
        out.put("createdAt", createdAt);
        out.put("path", path);
        out.put("sha256", sha256);
        out.put("redacted", redacted);
        return out;
    }

    private static String sha256(Path path) throws IOException {
        final MessageDigest digest;
        try {
            digest = MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
        try (InputStream input = Files.newInputStream(path)) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) >= 0) {
                if (count > 0) digest.update(buffer, 0, count);
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }
}
