# Monad Signal Agent

A programmable agent runtime that can load a trusted program, use registered tools, pay for services through Monad, and record a complete execution trace.

## Hackathon demo

The runtime loads one program that:

1. Retrieves SOL market data.
2. Purchases an MSOS signal through Monad.
3. Checks whether the signal clears a configured safety margin.
4. Records a paper trade or abstains.
5. Displays the execution trace.

The runtime itself is not tied to SOL, MSOS, a specific market, or a specific strategy. Those choices live in the loaded program and tool configuration.

## Browser demo

```powershell
npm run demo:web
```

Then open `http://127.0.0.1:4173`.

The browser demo includes:

- a Monad-styled program builder
- registered program-template selection
- market, asset, safety-margin, and signal-budget controls
- a generated trading-program editor for presentation and iteration
- a real live Monad x402 run button
- a clearly labelled verified-replay fallback
- an animated execution pipeline, sanitized trace, and explorer transaction link

The editor does not execute arbitrary pasted code. The dropdowns generate the bounded configuration that the registered runtime actually executes.

## Demo commands

```powershell
npm run demo:accept
```

Runs typecheck, lint, tests, build, the offline replay, and three consecutive live Monad Testnet proof runs. The live portion spends `0.003` test USDC total.

```powershell
npm run demo:present
```

Runs the concise judge-facing live Monad Testnet demo.

```powershell
npm run demo:present:three
```

Runs the complete live path three consecutive times and writes sanitized evidence to `.demo-evidence/`.

```powershell
npm run demo:replay
```

Runs the clearly labelled offline fallback using sanitized evidence from a previously completed real settlement.

```powershell
npm run demo:monad
```

Prints the full live JSON evidence and execution trace for technical inspection.

See [`DEMO_RUNBOOK.md`](DEMO_RUNBOOK.md) for the two-minute narrative, presenter cues, and fallback procedure.

## Control documents

- [`PROJECT_CHARTER.md`](PROJECT_CHARTER.md) — frozen mission, scope, architecture, and non-goals.
- [`ACCEPTANCE_GATE.md`](ACCEPTANCE_GATE.md) — objective demo pass/fail criteria.
- [`CURRENT_TASK.md`](CURRENT_TASK.md) — the only active implementation assignment.

## Scope rule

Design the interfaces generically, but implement only one complete hackathon program.
