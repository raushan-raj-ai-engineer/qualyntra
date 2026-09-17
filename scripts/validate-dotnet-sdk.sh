#!/usr/bin/env bash
# File: scripts/validate-dotnet-sdk.sh
# Purpose: Builds the Qualyntra .NET SDK in Release mode as part of the polyglot release-quality gate.
# Author: Raushan Raj

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$ROOT/sdks/dotnet/src/Qualyntra.Sdk/Qualyntra.Sdk.csproj"

if ! command -v dotnet >/dev/null 2>&1; then
  echo "dotnet SDK is required for .NET SDK validation."
  exit 1
fi

dotnet build "$PROJECT" \
  --configuration Release \
  --nologo

echo ".NET SDK validation passed"
