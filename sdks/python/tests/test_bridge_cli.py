"""
File: sdks/python/tests/test_bridge_cli.py
Purpose: Verifies the Python JSON-over-stdio bridge behaves correctly across a real subprocess boundary.
Author: Raushan Raj
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest


class BridgeCliTests(unittest.TestCase):
    def test_health_round_trip_over_stdio(self):
        sdk_root = Path(__file__).resolve().parents[1]
        environment = os.environ.copy()
        environment["PYTHONPATH"] = str(sdk_root)
        completed = subprocess.run(
            [sys.executable, "-m", "qualyntra.bridge"],
            input=json.dumps({"operation": "health"}),
            capture_output=True,
            text=True,
            env=environment,
            shell=False,
            timeout=10,
            check=False,
        )
        self.assertEqual(0, completed.returncode, completed.stderr)
        response = json.loads(completed.stdout)
        self.assertEqual(True, response["ok"])
        self.assertEqual("healthy", response["data"]["status"])


if __name__ == "__main__":
    unittest.main()
