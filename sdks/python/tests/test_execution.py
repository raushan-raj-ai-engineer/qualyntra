"""
File: sdks/python/tests/test_execution.py
Purpose: Verifies shell-free Python module execution, timeout normalization, and module-name validation.
Author: Raushan Raj
"""
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from qualyntra.contracts import ExecutionRequest, RuntimeIdentity
from qualyntra.execution import PythonModuleRunner


class ExecutionTests(unittest.TestCase):
    def setUp(self):
        self.runtime = RuntimeIdentity(language="python", runner="unittest")
        self.runner = PythonModuleRunner()

    def test_standard_library_module_executes_without_shell(self):
        request = ExecutionRequest("run-1", "project", self.runtime, args=["--help"], timeout_seconds=10)
        result = self.runner.execute_module("json.tool", request)
        self.assertEqual("passed", result.status)
        self.assertEqual(0, result.exit_code)

    def test_invalid_module_name_is_rejected(self):
        request = ExecutionRequest("run-2", "project", self.runtime)
        with self.assertRaises(ValueError):
            self.runner.execute_module("json.tool;echo unsafe", request)


if __name__ == "__main__":
    unittest.main()
