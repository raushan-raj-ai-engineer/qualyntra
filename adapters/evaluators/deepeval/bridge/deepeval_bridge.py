"""
File: adapters/evaluators/deepeval/bridge/deepeval_bridge.py
Purpose: Implements the optional DeepEval process boundary and returns normalized metric results to Qualyntra.
Author: Raushan Raj
"""
import json, os, sys

def main():
    payload=json.loads(os.environ.get("QUALYNTRA_DEEPEVAL_PAYLOAD","{}"))
    try:
        import deepeval  # type: ignore  # noqa: F401
    except Exception:
        print(json.dumps({"error":"DeepEval is not installed. Install the optional Python integration before using this adapter."}))
        return 3
    # Product boundary intentionally keeps DeepEval-specific metric construction outside core.
    # Teams can extend this bridge with approved DeepEval metrics while preserving the normalized contract.
    results=[]
    for metric in payload.get("metrics",[]):
        results.append({"metricId":metric,"score":0.0,"passed":False,"reason":"Metric bridge registered; configure an approved DeepEval metric mapping for production use."})
    print(json.dumps(results))
    return 0

if __name__=="__main__":
    raise SystemExit(main())

