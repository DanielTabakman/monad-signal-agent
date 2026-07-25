# Monad Signal Agent — Project Charter v1

## Mission

Build a programmable market agent that can gather information, purchase specialized analysis through Monad, apply a selected strategy, and produce a simulated trade decision.

The long-term agent is designed to be:

- information-source agnostic
- market agnostic
- asset agnostic
- strategy agnostic
- payment-rail adaptable
- execution-venue adaptable

The hackathon demo will prove that architecture with one deliberately narrow configuration.

## Product thesis

Financial agents should be able to acquire the information and models they need as machine-purchasable services, then use those capabilities inside a governed decision workflow.

For the demo, the agent purchases an MSOS analysis through Monad, applies a simple strategy, and records a paper trade.

## Frozen demo configuration

- Information source: one predefined market-data adapter
- Market: crypto spot
- Asset: SOL/USD
- Paid analysis tool: one MSOS signal endpoint
- Payment: Monad-compatible x402 payment flow
- Strategy: one deterministic MSOS-based strategy
- Execution: simulated paper trade only
- Interface: one visible end-to-end run trace

The architecture may be generic. The implemented demo path must remain singular.

## Programmability model

A run is described by configuration rather than hard-coded orchestration:

```json
{
  "market": { "type": "spot", "symbol": "SOL/USD" },
  "sources": ["demo-market-data"],
  "analysisTools": ["msos-signal"],
  "strategy": "msos-threshold-v1",
  "executionVenue": "paper",
  "paymentRail": "monad-x402",
  "budget": { "maxSpend": "0.10", "currency": "USDC" }
}
```

Only the listed demo adapters must work during the hackathon. Additional adapters are future extensions, not current deliverables.

## Core interfaces

### InformationSource

Retrieves normalized evidence for a market request.

```ts
interface InformationSource {
  id: string;
  fetch(request: MarketRequest): Promise<Evidence[]>;
}
```

### AnalysisTool

Quotes and returns specialized analysis. A tool may be free or payment-gated.

```ts
interface AnalysisTool {
  id: string;
  quote(input: AnalysisRequest): Promise<ToolQuote>;
  invoke(input: AnalysisRequest, payment?: PaymentReceipt): Promise<AnalysisResult>;
}
```

### Strategy

Transforms normalized evidence and analysis into a governed decision.

```ts
interface Strategy {
  id: string;
  evaluate(context: DecisionContext): Promise<TradeDecision>;
}
```

### PaymentRail

Pays for a quoted machine service within configured limits.

```ts
interface PaymentRail {
  id: string;
  pay(requirement: PaymentRequirement): Promise<PaymentReceipt>;
}
```

### ExecutionVenue

Executes or simulates a normalized order.

```ts
interface ExecutionVenue {
  id: string;
  execute(order: OrderIntent): Promise<ExecutionReceipt>;
}
```

## Agent responsibilities

The agent may:

1. Load a bounded run configuration.
2. Request evidence from configured sources.
3. Request a quote from configured analysis tools.
4. Pay only when the quote is within policy and budget.
5. Validate returned analysis.
6. apply the configured strategy.
7. Submit the resulting order intent to the configured execution venue.
8. Produce an auditable run trace.

The agent may not invent new providers, assets, strategies, or execution venues during the hackathon demo.

## Initial MSOS strategy

The first strategy consumes a structured MSOS signal:

```json
{
  "asset": "SOL",
  "decision": "BUY",
  "confidence": 0.68,
  "referencePrice": 0,
  "reasons": [],
  "generatedAt": ""
}
```

A configurable threshold converts the signal into `BUY`, `SELL`, or `NO_TRADE`. The strategy must remain deterministic and testable.

## Commercial margin assumption

For the MVP, “margin” means an optional configurable markup charged for the MSOS analysis above its underlying data and compute cost. It does not mean leveraged trading. Leveraged execution is out of scope.

## Architecture rule

Domain code must not depend on Monad, x402, wallets, UI frameworks, or a specific market-data vendor.

```text
/core        Domain types, policies, orchestration, validation
/adapters    Sources, tools, payments, strategies, execution
/api         Paid and unpaid HTTP interfaces
/agent       Config loader and run coordinator
/web         Demo interface
/tests       Contract and end-to-end tests
```

Dependencies point inward toward `/core`.

## Required demo flow

```text
User starts configured run
→ agent fetches SOL market data
→ agent calls the paid MSOS tool
→ tool returns payment requirement
→ agent pays through Monad
→ MSOS analysis is returned
→ configured strategy produces a decision
→ paper venue records the trade or no-trade
→ interface displays the complete trace
```

## Non-goals

The hackathon build will not include:

- real-money trading
- leverage or margin trading
- autonomous internet-wide tool discovery
- multiple working sources, markets, assets, strategies, or venues
- portfolio construction
- position monitoring
- profitability claims
- a general agent marketplace
- production custody or production security
- a complete MSOS application

## Success statement

“We built a programmable financial agent that can purchase specialized market intelligence through Monad and use it inside a governed trading workflow.”
