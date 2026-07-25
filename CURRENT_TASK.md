# Current Task

## Status

**IMPLEMENTED - presenter packaging is coded. Local verification and the three consecutive live proof runs remain before final acceptance.**

## Objective

Package the completed Monad x402 paid-signal flow into a concise, reliable hackathon demonstration without adding new product scope.

## Completed foundation

The underlying technical flow is already proven:

- a trusted program is loaded through the generic runtime
- SOL market data is retrieved
- the MSOS endpoint returns an x402 v2 payment requirement
- the agent checks the quote against its configured budget
- the payment is signed and facilitator-settled on Monad Testnet
- the settlement transaction is independently found through Monad RPC
- the paid signal is validated
- the estimated edge is compared with the configured safety margin
- the final action is recorded through the paper-trading tool

Previously verified live transaction:

- Network: `eip155:10143`
- Payment: `1000` atomic Monad Testnet USDC (`0.001 USDC`)
- Transaction: `0xad1b12fcce2351eb5a0e175f57989fc0d72c1db550b9d512cf517a58245d143d`
- Signal estimated edge: `0.08`
- Safety margin: `0.05`
- Final bounded action: paper `BUY`

## Presenter package

Implemented commands:

```text
npm run demo:present
```

Runs one new live payment and prints the concise judge-facing story.

```text
npm run demo:present:three
```

Runs the complete live path three consecutive times and writes sanitized evidence to the gitignored `.demo-evidence/` directory.

```text
npm run demo:replay
```

Runs a clearly labelled offline replay based on sanitized evidence from the successful real settlement. It does not create a new payment.

```text
npm run demo:monad
```

Retains the full JSON trace for technical inspection.

Additional deliverables:

- `DEMO_RUNBOOK.md` with the two-minute narrative and presenter cues
- focused presenter-output tests
- reusable live-demo runner shared by the technical and presenter commands
- explicit sanitization boundaries for saved proof files

## Remaining acceptance steps

1. Run `npm run typecheck`.
2. Run `npm run lint`.
3. Run `npm test`.
4. Run `npm run build`.
5. Run `npm run demo:replay`.
6. Run `npm run demo:present:three` using the funded disposable testnet payer.
7. Confirm the generated evidence contains three distinct successful transaction hashes.
8. Preserve a backup recording of `npm run demo:replay` or a successful live presenter run.

## Scope boundary

Do not add:

- a frontend or dashboard
- additional strategies or markets
- real trading
- autonomous strategy generation
- production custody or security work
- visual workflow building

Stop when the presenter command, three-run proof, and backup recording are complete.
