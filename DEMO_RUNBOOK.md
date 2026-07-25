# Monad Signal Agent — Demo Runbook

## Primary command

Run from the repository root:

```powershell
npm run demo:present
```

This performs a new live x402 payment on Monad Testnet and prints a concise judge-facing result.

## Reliability proof

Before presenting, run:

```powershell
npm run demo:present:three
```

This performs three consecutive live runs and writes sanitized evidence to a gitignored `.demo-evidence/` file. It never writes private keys, payment signatures, nonces, or `.env.local` values.

## Offline fallback

If the internet, facilitator, or RPC is unavailable during judging:

```powershell
npm run demo:replay
```

This replays sanitized evidence from the previously completed real Monad Testnet settlement. State clearly that it is a replay and does not create a new payment.

## Two-minute narrative

> Most agents can call tools, but financial agents also need to decide whether information is worth paying for and prove what happened afterward.
>
> This is a programmable financial-agent runtime. The runtime itself knows nothing about SOL or this strategy. It loads a trusted program and gives it access only to registered tools.
>
> The demo program retrieves SOL market data and requests an MSOS signal. The endpoint responds with an x402 payment requirement. The program checks the price against its configured budget before signing anything.
>
> When the quote is acceptable, the payment is signed and settled through Monad. The agent verifies the transaction through Monad RPC, validates the returned signal, compares the estimated edge against its safety margin, and records a paper action.
>
> The result is not just a trade decision. It is a complete, auditable trace from program loading through payment, validation, decision, and bounded execution.

## What to point at

1. `PROGRAM LOADED` — proves behaviour comes from a loaded program.
2. `PAID INTELLIGENCE` and `BUDGET CHECK` — proves the agent controls spending.
3. `MONAD x402 PAYMENT` and `RPC VERIFICATION` — proves payment was real and independently confirmed.
4. `SIGNAL` and `SAFETY MARGIN` — shows the decision rule.
5. `FINAL ACTION: PAPER ...` — shows bounded execution with no real-money trading.
6. `TRANSACTION` — provides public settlement evidence.

## Accurate claims

Say:

> We built a programmable financial agent that can load a strategy program, purchase specialized intelligence through Monad, validate the result, and take a bounded action with a complete execution trace.

Do not claim that the strategy is profitable or that the system is ready for production custody or real trading.
