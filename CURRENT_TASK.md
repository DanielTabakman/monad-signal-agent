# Current Task

## Status

**COMPLETE - unpaid vertical slice passes tests.**

## Objective

Bootstrap the repository and implement the smallest unpaid vertical slice of the programmable runtime.

## Required implementation

1. Create a TypeScript project with linting, tests, and type checking.
2. Implement the generic `Program`, `Tool`, `ToolRegistry`, `ExecutionContext`, and `ExecutionEvent` interfaces.
3. Implement an `AgentRuntime` that loads one trusted program and records a structured execution trace.
4. Implement a cached market-data tool.
5. Implement a deterministic local MSOS signal stub matching the charter schema.
6. Implement a paper-trading tool.
7. Implement the `msos-margin-demo` program without Monad payment yet.
8. Implement a trivial `price-report-smoke-test` program proving the runtime is not hard-coded.
9. Add tests for both programs and the safety-margin decision.

## Stop condition

Stop when the unpaid vertical slice passes tests and demonstrates:

```text
load program
-> call registered tools
-> apply margin rule
-> record paper action
-> emit execution trace
```

## Explicit exclusions from this task

Do not implement:

- Monad integration
- x402 or MPP
- Wallet handling
- Real market-data integration
- Real trading
- LLM planning
- Dynamic tool discovery
- Arbitrary program execution
- Visual polish
- Deployment

## Evidence required before the next task

- Test command and passing output
- Type-check command and passing output
- Example execution trace from both programs
- File list showing the runtime core contains no demo-specific imports
- Summary of any deviations from the charter

## Files changed

- `.gitignore`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `eslint.config.js`
- `src/core/agent-runtime.ts`
- `src/core/execution-context.ts`
- `src/core/execution-events.ts`
- `src/core/index.ts`
- `src/core/json.ts`
- `src/core/program.ts`
- `src/core/tool-registry.ts`
- `src/core/tool.ts`
- `src/tools/market-data/cached-market-data-tool.ts`
- `src/tools/msos-signal/msos-signal-stub-tool.ts`
- `src/tools/paper-trading/paper-trading-tool.ts`
- `src/tools/index.ts`
- `src/programs/msos-margin-demo.ts`
- `src/programs/price-report-smoke-test.ts`
- `src/programs/index.ts`
- `src/demo/run.ts`
- `src/test/runtime.test.ts`

## Commands run

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run demo`
- `rg "\.\./(tools|programs)|SOL|MSOS|Monad|market-data|paper-trading|msos" src/core`
- `Get-ChildItem -Recurse src\core -File | Select-Object -ExpandProperty FullName`
- `npm run build`

## Test results

```text
> npm run typecheck
> tsc --noEmit

passed

> npm run lint
> eslint .

passed

> npm test
> vitest run

Test Files  1 passed (1)
Tests       5 passed (5)
```

`npm run build` also passed with `tsc`.

## Example output

`npm run demo` completed both programs. Relevant trace summary:

```json
{
  "marginDemo": {
    "programId": "msos-margin-demo",
    "ok": true,
    "result": {
      "market": "crypto",
      "asset": "SOL",
      "safetyMargin": 0.05,
      "estimatedEdge": 0.08,
      "action": "BUY",
      "paperTradeId": "paper-1"
    },
    "traceTypes": [
      "program_started",
      "tool_call_started:market-data",
      "tool_call_succeeded:market-data",
      "tool_call_started:msos-signal",
      "tool_call_succeeded:msos-signal",
      "decision:safety-margin-comparison",
      "tool_call_started:paper-trading",
      "tool_call_succeeded:paper-trading",
      "program_completed"
    ]
  },
  "priceReport": {
    "programId": "price-report-smoke-test",
    "ok": true,
    "result": {
      "market": "crypto",
      "asset": "SOL",
      "price": 182.42,
      "currency": "USD",
      "source": "cached"
    },
    "traceTypes": [
      "program_started",
      "tool_call_started:market-data",
      "tool_call_succeeded:market-data",
      "decision:price-report-created",
      "program_completed"
    ]
  }
}
```

## Core boundary evidence

Runtime core files:

```text
src/core/agent-runtime.ts
src/core/execution-context.ts
src/core/execution-events.ts
src/core/index.ts
src/core/json.ts
src/core/program.ts
src/core/tool-registry.ts
src/core/tool.ts
```

`rg "\.\./(tools|programs)|SOL|MSOS|Monad|market-data|paper-trading|msos" src/core` returned no matches, showing the runtime core has no demo-specific imports or terms.

## Known limitations

- Monad payment, x402, MPP, wallets, and real payment requirements are intentionally not implemented in this task.
- Market data is cached-only and contains the single SOL snapshot required by the unpaid demo slice.
- The MSOS signal is a deterministic local stub matching the charter schema, not a paid analytics service.
- Paper trading records are in-memory and cannot move real funds.
- `npm install` completed, but npm reported 5 high-severity dependency audit findings in the dev dependency tree.
- Deviation from the full charter: payment and live market data are deferred exactly as allowed by `CURRENT_TASK.md`; the unpaid vertical slice is complete.

## Next task after acceptance

Add the Monad payment tool and place the MSOS signal behind a real payment requirement without changing the runtime core.
