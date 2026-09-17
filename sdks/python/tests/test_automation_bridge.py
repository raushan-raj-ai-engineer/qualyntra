"""
File: sdks/python/tests/test_automation_bridge.py
Purpose: Verifies automation-health bridge behavior and safe error normalization without requiring installed browser automation packages.
Author: Raushan Raj
"""
import unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from qualyntra.bridge import handle
class AutomationBridgeTests(unittest.TestCase):
    def test_health_reports_both_optional_engines(self):
        data=handle({"operation":"automation.health"})
        self.assertEqual({"playwright","selenium"},set(data["engines"]))
    def test_bad_automation_plan_is_rejected(self):
        with self.assertRaises((KeyError,ValueError)):
            handle({"operation":"automation.execute","plan":{"engine":"playwright","commands":[]}})
if __name__=="__main__": unittest.main()
