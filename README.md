# Monad Signal Agent

A programmable financial-agent runtime that can load a trusted program, use registered tools, purchase intelligence through Monad x402, take a bounded paper action, and expose the complete execution trace.

## Public hackathon website

The repository includes a full browser application, not just a CLI trace. It is designed to be deployed as one Node.js service on Railway.

The public interface lets a judge:

- choose a registered agent program
- configure the market, asset, safety margin, and maximum signal budget
- inspect the generated trading-program source
- run a free price-report program through the generic runtime
- run the real paid MSOS program through Monad x402
- see the payment, signal validation, safety decision, paper action, execution trace, transaction hash, and explorer link
- use a clearly labelled verified replay if a live testnet dependency is unavailable

The script editor is deliberately bounded. The browser never executes arbitrary pasted code; the selected controls generate validated inputs for registered TypeScript program templates.

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the public Railway deployment and submission instructions.

## Core demonstration

The MSOS Margin Agent performs this workflow:

```text
Retrieve SOL market data
→ request paid MSOS intelligence
→ approve the price within a configured budget
→ sign and settle an x402 payment through Monad
→ validate the returned signal
→ compare its estimated edge with a safety margin
→ record a paper trade or abstain
→ display the complete execution trace
```

The runtime itself is not tied to SOL, MSOS, a particular market, or a specific strategy. Those choices live in the loaded program and registered tools. The included Price Report program proves the runtime can load different behaviour without modifying the core.

## Run locally

```powershell
npm ci
npm run demo:web:accept
npm run demo:web
```

Then open `http://127.0.0.1:4173`.

## Run the compiled production server

```powershell
npm ci
npm run build
npm start
```

The server reads `PORT` automatically and binds to `0.0.0.0`, making it compatible with Railway and similar Node hosts.

## Public-safety boundaries

- Monad Testnet only
- test USDC only
- paper trading only
- registered program templates only
- no arbitrary server-side code execution
- server-side maximum payment budget
- per-IP and global live-payment rate limits
- one live settlement at a time
- secrets remain server-side
- live payments can be disabled instantly while replay remains available

## CLI demo commands

```powershell
npm run demo:present
```

Runs one concise live Monad Testnet demonstration.

```powershell
npm run demo:replay
```

Runs the clearly labelled offline fallback using sanitized evidence from a previously completed real settlement.

```powershell
npm run demo:monad
```

Prints the full live JSON evidence and execution trace for technical inspection.

```powershell
npm run demo:accept
```

Runs typecheck, lint, tests, build, replay, and three consecutive live Monad Testnet proof runs. The live portion spends `0.003` test USDC total.

See [`DEMO_RUNBOOK.md`](DEMO_RUNBOOK.md) for the two-minute presenter narrative.

## Repository evidence

- [`PROJECT_CHARTER.md`](PROJECT_CHARTER.md) — frozen mission, scope, architecture, and non-goals
- [`ACCEPTANCE_GATE.md`](ACCEPTANCE_GATE.md) — objective demo pass/fail criteria
- [`CURRENT_TASK.md`](CURRENT_TASK.md) — current implementation and evidence record
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — public hosting, secrets, safeguards, and submission checklist

## Hackathon submission

Submit both:

- GitHub repository: `https://github.com/DanielTabakman/monad-signal-agent`
- Public website: the generated Railway domain

## Scope rule

Design the interfaces generically, but implement only one complete paid hackathon program and one trivial replacement program.
