#!/usr/bin/env bash
# File: scripts/package-release.sh
# Purpose: Validates the repository and creates a clean single-file v1.0.0 source release archive.
# Author: Raushan Raj
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
node scripts/release-validate.mjs
rm -rf dist .qualyntra
OUT="${1:-$ROOT/../qualyntra-platform-v1.0.0.zip}"
rm -f "$OUT"
python3 - "$ROOT" "$OUT" <<'PYZIP'
import sys,zipfile,os
from pathlib import Path
root=Path(sys.argv[1]);out=Path(sys.argv[2]);skip={'dist','.qualyntra','node_modules','.git','artifacts','reports'}
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
    for p in root.rglob('*'):
        rel=p.relative_to(root)
        if any(part in skip for part in rel.parts) or p.is_dir(): continue
        z.write(p,Path(root.name)/rel)
print(out)
PYZIP
