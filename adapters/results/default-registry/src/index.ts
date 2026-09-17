/**
 * File: adapters/results/default-registry/src/index.ts
 * Purpose: Wires Qualyntra's built-in external result adapters into a prioritized auto-detection registry.
 * Author: Raushan Raj
 */
import { ResultIngestionRegistry } from '../../../../packages/ingestion/src/registry';
import { JUnitXmlResultAdapter } from '../../junit-xml/src';
import { TrxResultAdapter } from '../../trx/src';
import { AllureJsonResultAdapter } from '../../allure-json/src';
import { CucumberJsonResultAdapter } from '../../cucumber-json/src';
import { RobotXmlResultAdapter } from '../../robot-xml/src';

export function createDefaultResultIngestionRegistry():ResultIngestionRegistry {
  const registry=new ResultIngestionRegistry();
  registry.register({format:'trx',adapter:new TrxResultAdapter(),priority:100,detect:({path,content})=>/\.trx$/i.test(path??'')||/<TestRun\b[\s\S]*?<UnitTestResult\b/i.test(content)});
  registry.register({format:'robot-xml',adapter:new RobotXmlResultAdapter(),priority:90,detect:({path,content})=>/(?:^|\/)output\.xml$/i.test(path??'')||/^\s*<robot\b/i.test(content)});
  registry.register({format:'allure-json',adapter:new AllureJsonResultAdapter(),priority:80,detect:({path,content})=>/-result\.json$/i.test(path??'')||/"(?:uuid|historyId)"\s*:/.test(content)&&/"status"\s*:/.test(content)});
  registry.register({format:'cucumber-json',adapter:new CucumberJsonResultAdapter(),priority:70,detect:({path,content})=>/cucumber.*\.json$/i.test(path??'')||/^\s*\[[\s\S]*"elements"\s*:/i.test(content)});
  registry.register({format:'junit-xml',adapter:new JUnitXmlResultAdapter(),priority:10,detect:({content})=>/<testsuites?\b|<testcase\b/i.test(content)});
  return registry;
}
