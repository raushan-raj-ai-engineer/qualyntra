#!/usr/bin/env bash
# File: scripts/validate-java-sdk.sh
# Purpose: Compiles and runs the dependency-free Java SDK smoke test without Maven/Gradle.
# Author: Raushan Raj
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.qualyntra/java-smoke"
rm -rf "$OUT" && mkdir -p "$OUT"
find "$ROOT/sdks/java/src/main/java" "$ROOT/sdks/java/src/test/java" -name '*.java' -print0 | xargs -0 javac -d "$OUT"
java -cp "$OUT" io.qualyntra.sdk.ContractSmoke
