"""
File: sdks/python/tests/test_results_evidence.py
Purpose: Verifies Python-side universal result normalization and evidence integrity hashing.
Author: Raushan Raj
"""
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from qualyntra.contracts import RuntimeIdentity
from qualyntra.evidence import file_evidence
from qualyntra.results import parse_junit_xml


class ResultEvidenceTests(unittest.TestCase):
    def test_junit_normalization_maps_pass_failure_and_skip(self):
        xml = """<testsuite>
          <testcase classname="suite" name="pass" time="0.1" />
          <testcase classname="suite" name="fail" time="0.2"><failure message="boom">trace</failure></testcase>
          <testcase classname="suite" name="skip" time="0"><skipped /></testcase>
        </testsuite>"""
        runtime = RuntimeIdentity(language="python", runner="pytest")
        results = parse_junit_xml(xml, "run", runtime)
        self.assertEqual(["passed", "failed", "skipped"], [item.status for item in results])
        self.assertEqual("boom", results[1].failure.message)

    def test_file_evidence_contains_sha256(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "artifact.txt"
            path.write_text("evidence", encoding="utf-8")
            record = file_evidence("run", "log", path)
            self.assertEqual(64, len(record.sha256 or ""))
            self.assertEqual(str(path), record.path)


if __name__ == "__main__":
    unittest.main()
