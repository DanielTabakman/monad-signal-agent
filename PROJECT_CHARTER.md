# Monad Signal Agent — Hackathon Charter v1

## Status

**Frozen hackathon scope.**

This document is the source of truth for what will be built during the hackathon. New features are out of scope unless they replace an existing requirement and reduce implementation risk.

## Mission

Build a small programmable agent runtime that can load a trusted program, coordinate registered tools, pay for a service through Monad, take a bounded action, and produce a visible execution trace.

## Product concept

The durable product is the runtime, not the demo strategy.

```text
Agent runtime
+ registered tools
+ loaded program
= specific agent behaviour
```

The runtime must not be hard-coded to a market, asset, information source, trading strategy, or execution venue.

## Meaning of “programmable”

For this hackathon, programmable means:

- The runtime loads a trusted TypeScript program module implementing a defined interface.
- The program receives a constrained execution context and may call registered tools.
- The program determines the sequence of actions.
- The runtime records every tool call, result, decision, and final action.

Programmable does **not** mean executing arbitrary uploaded code, creating a new programming language, or safely sandboxing unknown programs.

## Runtime capabilities

The runtime provides:

1. A program interface.
2. A tool interface and registry.
3. A typed execution context.
4. Budget and action limits.
5. Structured execution events.
6. A final result.
7. Failure handling that stops safely.

## Hackathon demonstration program

The loaded demo program performs this fixed workflow:

```text
Retrieve SOL market data
→ purchase an MSOS signal through Monad
→ compare the signal edge with a configured safety margin
→ record a paper trade or abstain
→ return a structured result and execution trace
```

### Demo configuration

- Market: crypto
- Asset: SOL
- Information source: one predefined live source with a cached fallback
- Paid intelligence: one MSOS signal endpoint
- Payment rail: Monad
- Strategy rule: act only when the signal clears a configured margin
- Execution: paper trading only

The SOL, MSOS, and strategy details belong in the demo program and tools, not in the runtime core.

## Reusable architecture

```text
/core
  agent-runtime
  program-interface
  tool-interface
  tool-registry
  execution-context
  execution-events

/tools
  market-data
  msos-signal
  monad-payment
  paper-trading

/programs
  msos-margin-demo
  price-report-smoke-test

/web
  execution-trace-demo
```

## Architecture boundaries

1. `/core` must not import a specific market, asset, strategy, blockchain, or UI.
2. Programs may coordinate tools but may not bypass runtime limits.
3. Payment logic belongs in a tool or adapter, not in the runtime.
4. Trading execution is paper-only for the hackathon.
5. The analytics service must remain callable independently of the agent runtime.
6. The demo must remain runnable with cached market data if the live source fails.

## Required tool contracts

### Market data tool

Returns a typed market snapshot for a requested market and asset.

### MSOS signal tool

Returns a structured signal containing at minimum:

```json
{
  "market": "crypto",
  "asset": "SOL",
  "decision": "BUY",
  "confidence": 0.68,
  "estimatedEdge": 0.08,
  "referencePrice": 0,
  "reasons": [],
  "generatedAt": ""
}
```

### Monad payment tool

Handles the payment required to access the MSOS signal and returns a verifiable payment reference.

### Paper trading tool

Records `BUY`, `SELL`, or `NO_TRADE` without moving real funds.

## Program rule

The demo program trades only when:

```text
estimated edge >= configured safety margin
```

Otherwise it records `NO_TRADE`.

This is a demonstration rule, not a claim of profitable strategy performance.

## Scope included

- One generic runtime
- One trusted program interface
- One tool interface and registry
- One execution trace
- One market-data tool
- One paid MSOS signal tool
- One Monad payment path
- One paper-trading tool
- One complete MSOS margin demo program
- One trivial second program proving behaviour is replaceable
- One minimal demo screen or command-line trace
- Tests for the runtime and demo happy path

## Explicit non-goals

The hackathon build will not include:

- Arbitrary user-written code execution
- Code sandboxing
- A custom programming language
- A visual workflow builder
- Dynamic internet-wide tool discovery
- Autonomous strategy generation
- Multiple fully implemented strategies
- Multiple production market integrations
- Real-money trading
- DEX or centralized-exchange execution
- Portfolio management
- Position monitoring
- Production custody
- Production security hardening
- A general agent marketplace
- A full MSOS application
- Claims of profitability

## Reuse after the hackathon

The same runtime can later load programs for:

- Prediction-market question generation and validation
- Market-vs-model disagreement analysis
- NDAX or cross-exchange arbitrage detection
- Backtest purchasing and evaluation
- Options-expression ranking
- Forward-consistency analysis
- Hummingbot execution workflows

These are future programs, not hackathon requirements.

## Scope test

Before adding any feature, ask:

> Is this required to run the single MSOS demo program through the generic runtime interface?

If not, defer it.

## Success statement

> We built a programmable financial agent that can load a strategy program, purchase specialized intelligence through Monad, and take a bounded action with a complete execution trace.
