"""
File: sdks/python/tests/test_automation.py
Purpose: Verifies vendor-neutral Python automation orchestration, fail-fast behavior, evidence aggregation, health reporting, and remote-driver safety without live browsers.
Author: Raushan Raj
"""
import tempfile, unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from qualyntra.automation import automation_health, automation_plan_from_dict, automation_result_to_dict, execute_automation_plan
from qualyntra.contracts import AutomationCommand, AutomationPlan, EvidenceRecord, FailureDetail

class FakeEngine:
    def __init__(self, fail_on=None): self.fail_on=fail_on; self.opened=False; self.closed=False
    def open(self,plan): self.opened=True
    def execute(self,command,plan):
        if command.id==self.fail_on: raise RuntimeError("boom")
        return []
    def close(self,plan): self.closed=True; return []

class AutomationTests(unittest.TestCase):
    def test_plan_parser_maps_camel_case_bridge_payload(self):
        plan=automation_plan_from_dict({"runId":"r1","engine":"selenium","browser":"firefox","allowRemote":True,"commands":[{"id":"n","type":"navigate","url":"/"}]})
        self.assertEqual("r1",plan.run_id); self.assertEqual("firefox",plan.browser); self.assertTrue(plan.allow_remote)
    def test_execute_plan_uses_same_result_shape_for_engine(self):
        holder={}
        def factory(plan): holder["engine"]=FakeEngine(); return holder["engine"]
        result=execute_automation_plan(AutomationPlan("r1","playwright",[AutomationCommand("n","navigate",url="/")]),factory)
        self.assertEqual("passed",result.status); self.assertTrue(holder["engine"].opened); self.assertTrue(holder["engine"].closed)
    def test_fail_fast_records_normalized_failure_and_still_closes(self):
        holder={}
        def factory(plan): holder["engine"]=FakeEngine("bad"); return holder["engine"]
        plan=AutomationPlan("r1","selenium",[AutomationCommand("bad","click"),AutomationCommand("never","click")])
        result=execute_automation_plan(plan,factory)
        self.assertEqual("failed",result.status); self.assertEqual(1,len(result.steps)); self.assertEqual("RuntimeError",result.failure.category); self.assertTrue(holder["engine"].closed)
    def test_bridge_result_uses_cross_language_camel_case_keys(self):
        result=execute_automation_plan(AutomationPlan("r1","playwright",[]),lambda plan:FakeEngine())
        payload=automation_result_to_dict(result)
        self.assertEqual("r1",payload["runId"]); self.assertIn("startedAt",payload); self.assertNotIn("run_id",payload)
    def test_health_rejects_unknown_engine(self):
        with self.assertRaises(ValueError): automation_health("unknown")
    def test_health_is_truthful_about_optional_package(self):
        result=automation_health("playwright")
        self.assertIn("available",result); self.assertEqual(True,result["capabilities"]["tracing"])

if __name__=="__main__": unittest.main()
