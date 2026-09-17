/**
 * File: types/node-test-shim.d.ts
 * Purpose: Provides minimal declarations for the Node built-in test and assertion modules used by repository tests.
 * Author: Raushan Raj
 */
declare module 'node:test' { const test:any; export default test; }
declare module 'node:assert/strict' { const assert:any; export default assert; }
