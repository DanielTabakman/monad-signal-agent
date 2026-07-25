# Monad Signal Agent — Acceptance Gate v1

## Pass condition

The project passes only when one complete configured run succeeds from start to finish and the same path succeeds three consecutive times.

## Required capabilities

### A. Programmable core

- [ ] A run configuration selects the market, asset, information source, analysis tool, strategy, payment rail, execution venue, and spending limit.
- [ ] The orchestrator depends on interfaces rather than concrete adapters.
- [ ] Core domain code does not import Monad, x402, wallet, vendor, or UI packages.
- [ ] Unknown adapter IDs fail clearly before any payment or execution attempt.

### B. Frozen demo adapters

- [ ] One information-source adapter returns normalized SOL/USD market data.
- [ ] One MSOS analysis adapter returns a validated structured signal.
- [ ] One deterministic MSOS threshold strategy returns `BUY`, `SELL`, or `NO_TRADE`.
- [ ] One paper execution adapter records the resulting action.
- [ ] One Monad/x402 payment adapter can satisfy the paid tool requirement.

### C. Payment flow

- [ ] An unpaid request to the protected MSOS endpoint receives a real payment-required response.
- [ ] The agent reads the payment requirement.
- [ ] The agent rejects a quote above its configured spending limit.
- [ ] An approved payment is submitted and verified through the Monad demo flow.
- [ ] The paid retry returns the analysis result.
- [ ] The run trace includes a payment reference or transaction reference.

### D. Decision and paper trade

- [ ] The strategy input includes normalized market evidence and the purchased MSOS analysis.
- [ ] The decision is deterministic for a fixed fixture.
- [ ] The paper venue records the symbol, side, quantity, reference price, timestamp, and reason.
- [ ] `NO_TRADE` is represented as an explicit valid outcome.
- [ ] No real exchange order is submitted.

### E. Demonstration

- [ ] The interface or CLI visibly shows: request, acquired data, quoted cost, payment status, purchased analysis, strategy decision, and paper execution result.
- [ ] The happy path succeeds three consecutive times.
- [ ] One over-budget run visibly stops before payment.
- [ ] One invalid analysis response visibly fails validation before execution.
- [ ] A backup recording of the successful demo exists.

## Required automated tests

- [ ] Run configuration validation
- [ ] Adapter registry lookup and unknown-adapter failure
- [ ] Spending-policy approval and rejection
- [ ] MSOS signal schema validation
- [ ] Strategy decision fixtures for `BUY`, `SELL`, and `NO_TRADE`
- [ ] Paper execution receipt
- [ ] Unpaid-to-paid API sequence using test doubles where necessary
- [ ] End-to-end demo fixture without real funds

## Scope protection

The following do not improve acceptance status and must not be started before every required gate above passes:

- a second asset
- a second strategy
- a second market-data provider
- dynamic provider discovery
- real-money trading
- portfolio state
- charts beyond the execution trace
- LLM-generated strategy reasoning
- production authentication

## Cut order

If time is constrained, cut in this order:

1. Natural-language commentary
2. Live data in favour of a clearly labelled cached fixture
3. Visual styling
4. Additional configuration controls
5. Any testnet trade or swap beyond the required payment

Never cut the programmable interface boundary, paid tool flow, strategy decision, paper execution, or visible run trace.
