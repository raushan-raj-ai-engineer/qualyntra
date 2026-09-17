"""
File: sdks/python/tests/test_bridge.py
Purpose: Verifies the JSON bridge returns runtime health and rejects unsupported operations deterministically.
Author: Raushan Raj
"""
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from qualyntra.bridge import handle


class BridgeTests(unittest.TestCase):
    def test_health_operation_returns_runtime_snapshot(self):
        result = handle({"operation": "health"})
        self.assertEqual("healthy", result["status"])
        self.assertEqual(True, result["runtime"]["capabilities"]["process_execution"])

    def test_unknown_operation_is_rejected(self):
        with self.assertRaises(ValueError):
            handle({"operation": "unsupported"})


if __name__ == "__main__":
    unittest.main()
