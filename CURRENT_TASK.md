# Current Task

## Status

**READY — implementation has not started.**

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
→ call registered tools
→ apply margin rule
→ record paper action
→ emit execution trace
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

## Next task after acceptance

Add the Monad payment tool and place the MSOS signal behind a real payment requirement without changing the runtime core.
