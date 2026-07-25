# Monad Signal Agent — Acceptance Gate v1

The hackathon project passes only when every required criterion below is demonstrated.

## A. Runtime is genuinely programmable

- [ ] The runtime loads a program through a defined interface.
- [ ] Market, asset, strategy, and tool sequence are not hard-coded in the runtime core.
- [ ] A second trivial program can run without modifying the runtime.
- [ ] Programs can access only registered tools and the provided execution context.

## B. Demo program completes the full loop

- [ ] The MSOS margin demo requests SOL market data.
- [ ] Live data works, or the cached fallback is clearly identified and works.
- [ ] The program requests the paid MSOS signal.
- [ ] An unpaid request is rejected or returns the expected payment requirement.
- [ ] Payment is completed or verified through Monad.
- [ ] The paid signal is returned in the required schema.
- [ ] The program compares `estimatedEdge` with the configured safety margin.
- [ ] The program records a paper `BUY`, `SELL`, or `NO_TRADE` action.

## C. Execution is observable

- [ ] The trace shows the loaded program.
- [ ] The trace shows every tool call and its status.
- [ ] The trace shows payment status and a transaction or verification reference.
- [ ] The trace shows the signal and safety-margin comparison.
- [ ] The trace shows the final paper-trade action.
- [ ] Failures stop safely and produce a useful error event.

## D. Architecture boundaries hold

- [ ] `/core` imports no SOL-, MSOS-, Monad-, strategy-, or UI-specific code.
- [ ] The MSOS analytics logic can run without the payment adapter.
- [ ] Real trading is impossible in the hackathon configuration.
- [ ] Program and tool inputs are runtime validated.

## E. Reliability

- [ ] Unit tests cover the runtime, tool registry, margin rule, and paper-trade recorder.
- [ ] The complete happy path succeeds three consecutive times.
- [ ] The cached-data path succeeds once.
- [ ] A backup demo recording exists.

## Required demo narrative

```text
Load program
→ retrieve market data
→ encounter paid intelligence
→ pay through Monad
→ receive signal
→ apply safety margin
→ paper trade or abstain
→ show execution trace
```

## Cut order

If time is constrained, remove features in this order:

1. LLM-generated commentary
2. Visual polish
3. Charts
4. Live market data, using the cached fallback
5. Additional UI controls
6. The second program’s presentation layer

Never cut:

- Generic program interface
- Tool registry
- Monad payment
- Paid MSOS signal
- Margin decision
- Paper-trade result
- Execution trace

## Automatic failure conditions

The demo does not pass if:

- The runtime is actually a hard-coded SOL workflow.
- Payment is merely mocked while presented as a real Monad payment.
- A real trade can be placed.
- The strategy is described as profitable without evidence.
- The complete path requires manual intervention between each step.
