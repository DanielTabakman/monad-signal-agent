# Current Task — Programmable Unpaid Vertical Slice

## Objective

Bootstrap the repository and implement the programmable agent core with exactly one working demo configuration, excluding blockchain payment integration for this task.

## Required implementation

1. Create a TypeScript project with strict type checking, linting, and tests.
2. Define core domain types for:
   - `MarketRequest`
   - `Evidence`
   - `AnalysisRequest`
   - `AnalysisResult`
   - `ToolQuote`
   - `PaymentRequirement`
   - `PaymentReceipt`
   - `DecisionContext`
   - `TradeDecision`
   - `OrderIntent`
   - `ExecutionReceipt`
   - `RunConfig`
   - `RunTrace`
3. Define the five adapter interfaces from `PROJECT_CHARTER.md`.
4. Implement an adapter registry selected by IDs from `RunConfig`.
5. Implement exactly these demo adapters:
   - cached SOL/USD market-data source
   - unpaid local MSOS analysis stub
   - deterministic MSOS threshold strategy
   - no-op payment adapter for the unpaid slice
   - paper execution venue
6. Implement an orchestrator that:
   - validates configuration
   - resolves adapters
   - fetches evidence
   - invokes analysis
   - evaluates the strategy
   - records a paper result
   - returns a complete run trace
7. Add one CLI or API entry point that runs the frozen demo configuration.
8. Add automated tests for configuration validation, adapter resolution, schema validation, all three strategy outcomes, paper execution, and the complete unpaid vertical slice.
9. Add a short README with exact local run and test commands.

## Mandatory constraints

- `/core` must not import code from `/adapters`, `/api`, `/agent`, or `/web`.
- Do not add Monad, x402, wallet, blockchain, LLM, exchange, or real trading dependencies.
- Do not implement multiple providers, assets, markets, or strategies.
- Do not add visual polish.
- Do not alter the charter to fit the implementation.
- Use fixtures and deterministic behaviour rather than pretending the initial signal is commercially predictive.

## Completion evidence

Before marking this task complete, record:

- exact commands run
- test and lint results
- example run output
- files changed
- known limitations

## Stop condition

Stop after the unpaid programmable vertical slice passes its tests. Payment integration is a separate next task and must not begin implicitly.
