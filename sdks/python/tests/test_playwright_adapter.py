"""
File: sdks/python/tests/test_playwright_adapter.py
Purpose: Verifies Playwright-Python action translation, screenshot evidence, URL resolution, and teardown using an injected fake runtime instead of a live browser.
Author: Raushan Raj
"""
import tempfile, unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from qualyntra.automation import PlaywrightPythonEngine
from qualyntra.contracts import AutomationCommand,AutomationPlan,LocatorDescriptor

class FakeLocator:
    def __init__(self): self.calls=[]
    def click(self): self.calls.append(("click",))
    def fill(self,v): self.calls.append(("fill",v))
    def select_option(self,v): self.calls.append(("select",v))
    def check(self): self.calls.append(("check",))
    def uncheck(self): self.calls.append(("uncheck",))
class FakePage:
    def __init__(self): self.urls=[]; self.loc=FakeLocator(); self.timeout=None
    def set_default_timeout(self,v): self.timeout=v
    def goto(self,u): self.urls.append(u)
    def locator(self,v): return self.loc
    def get_by_test_id(self,v): return self.loc
    def get_by_text(self,v,exact=False): return self.loc
    def get_by_label(self,v,exact=False): return self.loc
    def get_by_role(self,v,**kwargs): return self.loc
    def screenshot(self,path,full_page=True): Path(path).write_bytes(b"png")
class FakeTracing:
    def start(self,**kwargs): pass
    def stop(self,path): Path(path).write_bytes(b"trace")
class FakeContext:
    def __init__(self): self.page=FakePage(); self.tracing=FakeTracing(); self.closed=False
    def new_page(self): return self.page
    def close(self): self.closed=True
class FakeBrowser:
    def __init__(self): self.context=FakeContext(); self.closed=False
    def new_context(self): return self.context
    def close(self): self.closed=True
class FakeBrowserType:
    def __init__(self): self.browser=FakeBrowser()
    def launch(self,headless=True): return self.browser
class FakePlaywright:
    def __init__(self): self.chromium=FakeBrowserType(); self.firefox=FakeBrowserType(); self.webkit=FakeBrowserType()

class PlaywrightAdapterTests(unittest.TestCase):
    def test_actions_and_evidence_use_injected_runtime(self):
        fake=FakePlaywright(); engine=PlaywrightPythonEngine(lambda:fake)
        with tempfile.TemporaryDirectory() as directory:
            plan=AutomationPlan("r","playwright",[],base_url="http://localhost:9999/app",artifact_directory=directory,tracing=True)
            engine.open(plan)
            engine.execute(AutomationCommand("nav","navigate",url="child"),plan)
            engine.execute(AutomationCommand("fill","fill",LocatorDescriptor("testId","name"),"Rohit"),plan)
            evidence=engine.execute(AutomationCommand("shot","screenshot"),plan)
            evidence+=engine.close(plan)
            page=fake.chromium.browser.context.page
            self.assertEqual("http://localhost:9999/app/child",page.urls[0])
            self.assertEqual(("fill","Rohit"),page.loc.calls[0])
            self.assertEqual({"screenshot","trace"},{item.kind for item in evidence})
            self.assertTrue(all(len(item.sha256 or "")==64 for item in evidence))

if __name__=="__main__": unittest.main()
