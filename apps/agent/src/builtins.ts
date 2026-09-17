/**
 * File: apps/agent/src/builtins.ts
 * Purpose: Composes operator-selected built-in runner adapters at the execution-agent application boundary while keeping the agent core runner-neutral.
 * Author: Raushan Raj
 */
import type { AdapterRegistry } from '../../../packages/core/src/adapter-registry';
import { CustomProcessAdapter } from '../../../adapters/runners/custom-process/src';
import { CypressAdapter } from '../../../adapters/runners/cypress/src';
import { JunitConsoleAdapter } from '../../../adapters/runners/junit-console/src';
import { PlaywrightTestAdapter } from '../../../adapters/runners/playwright-test/src';
import { PytestAdapter } from '../../../adapters/runners/pytest/src';
import { TestngAdapter } from '../../../adapters/runners/testng/src';
import { WebdriverioAdapter } from '../../../adapters/runners/webdriverio/src';
const factories:Record<string,()=>any>={
  'custom-process':()=>new CustomProcessAdapter(process.env.QUALYNTRA_AGENT_CUSTOM_COMMAND??''),
  'cypress':()=>new CypressAdapter(),
  'junit-console':()=>new JunitConsoleAdapter(),
  'playwright-test':()=>new PlaywrightTestAdapter(),
  'pytest':()=>new PytestAdapter(),
  'testng':()=>new TestngAdapter(),
  'webdriverio':()=>new WebdriverioAdapter(),
};
export function registerBuiltInAgentRunners(registry:AdapterRegistry,ids:string[]):void{for(const id of ids){const factory=factories[id];if(!factory)throw new Error(`Unknown built-in agent runner: ${id}`);registry.register(factory());}}
export function supportedBuiltInAgentRunners():string[]{return Object.keys(factories).sort();}
