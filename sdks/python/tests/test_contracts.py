"""
File: sdks/python/tests/test_contracts.py
Purpose: Tests Python SDK immutability and default collection isolation using the standard library.
Author: Raushan Raj
"""
import unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from qualyntra.contracts import RuntimeIdentity, ExecutionRequest, EvaluationCase

class ContractTests(unittest.TestCase):
    def test_execution_defaults_are_not_shared(self):
        runtime=RuntimeIdentity(language="python",runner="pytest",engine="playwright")
        a=ExecutionRequest("r1","p",runtime)
        b=ExecutionRequest("r2","p",runtime)
        self.assertIsNot(a.args,b.args)

    def test_evaluation_case_defaults(self):
        case=EvaluationCase("c1","hello","world")
        self.assertEqual([],case.context)

if __name__=="__main__": unittest.main()

