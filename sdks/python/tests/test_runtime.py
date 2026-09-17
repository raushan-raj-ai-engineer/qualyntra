"""
File: sdks/python/tests/test_runtime.py
Purpose: Verifies Python runtime discovery and capability reporting remain dependency-free and truthful about optional packages.
Author: Raushan Raj
"""
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from qualyntra.runtime import discover_runtime


class RuntimeTests(unittest.TestCase):
    def test_runtime_snapshot_reports_current_interpreter(self):
        snapshot = discover_runtime()
        self.assertTrue(snapshot.executable)
        self.assertTrue(snapshot.version)
        self.assertEqual(True, snapshot.capabilities["process_execution"])
        self.assertIn("pytest", snapshot.packages)
        self.assertIn("playwright", snapshot.packages)
        self.assertIn("selenium", snapshot.packages)


if __name__ == "__main__":
    unittest.main()
