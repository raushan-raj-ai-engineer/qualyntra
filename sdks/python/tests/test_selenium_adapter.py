"""
File: sdks/python/tests/test_selenium_adapter.py
Purpose: Verifies Selenium-Python action translation, screenshots, local-driver cleanup, and explicit remote execution opt-in without a live WebDriver.
Author: Raushan Raj
"""
import tempfile, unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from qualyntra.automation import SeleniumPythonEngine
from qualyntra.contracts import AutomationCommand,AutomationPlan,LocatorDescriptor

class FakeElement:
    def __init__(self): self.calls=[]; self.selected=False
    def click(self): self.calls.append(("click",)); self.selected=not self.selected
    def clear(self): self.calls.append(("clear",))
    def send_keys(self,v): self.calls.append(("send_keys",v))
    def is_selected(self): return self.selected
class FakeDriver:
    def __init__(self): self.urls=[]; self.element=FakeElement(); self.quit_called=False; self.timeout=None; self.locators=[]
    def set_page_load_timeout(self,v): self.timeout=v
    def get(self,u): self.urls.append(u)
    def find_element(self,*args): self.locators.append(args); return self.element
    def save_screenshot(self,path): Path(path).write_bytes(b"png"); return True
    def quit(self): self.quit_called=True

class SeleniumAdapterTests(unittest.TestCase):
    def test_fill_check_screenshot_and_teardown_use_same_plan(self):
        driver=FakeDriver(); engine=SeleniumPythonEngine(lambda plan:driver)
        with tempfile.TemporaryDirectory() as directory:
            plan=AutomationPlan("r","selenium",[],browser="firefox",base_url="http://localhost:9999/root",artifact_directory=directory)
            engine.open(plan)
            engine.execute(AutomationCommand("nav","navigate",url="child"),plan)
            engine.execute(AutomationCommand("fill","fill",LocatorDescriptor("css","#name"),"Raj"),plan)
            engine.execute(AutomationCommand("check","check",LocatorDescriptor("testId","enabled"),True),plan)
            evidence=engine.execute(AutomationCommand("shot","screenshot"),plan)
            engine.close(plan)
            self.assertEqual("http://localhost:9999/root/child",driver.urls[0])
            self.assertIn(("send_keys","Raj"),driver.element.calls)
            self.assertTrue(driver.quit_called); self.assertEqual(1,len(evidence)); self.assertEqual(64,len(evidence[0].sha256 or ""))
    def test_remote_execution_requires_explicit_opt_in_before_vendor_import(self):
        plan=AutomationPlan("r","selenium",[],remote_url="http://localhost:4444",allow_remote=False,browser="chrome")
        engine=SeleniumPythonEngine()
        with self.assertRaisesRegex(ValueError,"allowRemote=true"):
            engine._real_driver(plan)

if __name__=="__main__": unittest.main()
