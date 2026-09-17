#!/usr/bin/env bash
# File: scripts/validate-java-sdk.sh
# Purpose: Compiles and validates the dependency-free Java SDK, JSON bridge, runtime discovery, result normalization, and evidence hashing without Maven/Gradle.
# Author: Raushan Raj
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.qualyntra/java-smoke"
rm -rf "$OUT" && mkdir -p "$OUT"
find "$ROOT/sdks/java/src/main/java" "$ROOT/sdks/java/src/test/java" -name '*.java' -print0 | xargs -0 javac -d "$OUT"
java -cp "$OUT" io.qualyntra.sdk.ContractSmoke
java -cp "$OUT" io.qualyntra.sdk.BridgeSmoke
java -cp "$OUT" io.qualyntra.sdk.ResultSmoke
java -cp "$OUT" io.qualyntra.sdk.AutomationSmoke
printf '%s\n' '{"operation":"health"}' | java -cp "$OUT" io.qualyntra.sdk.Bridge | grep -q '"ok":true'
printf '%s\n' '{"operation":"automation.health"}' | java -cp "$OUT" io.qualyntra.sdk.Bridge | grep -q '"ok":true'
echo "Java SDK validation passed"
