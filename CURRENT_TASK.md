# Current Task

## Status

**IMPLEMENTED - live Monad x402 path is coded, but the real paid testnet run is blocked by missing live environment variables in this shell.**

## Objective

Work on PR #3 and replace the simulated Monad payment implementation with a real Monad x402 v2 testnet integration while keeping the existing agent runtime, budget logic, signal validation, margin decision, execution events, paper-trading tool, and tests.

## Official Monad x402 Configuration

Implementation authority: https://docs.monad.xyz/guides/x402

- Network: `eip155:10143`
- x402 protocol version: `2`
- Scheme: `exact`
- Payment asset: Monad Testnet USDC, `0x534b2f3A21130d7a60830c2Df862319e593943A3`
- Facilitator: `https://x402-facilitator.molandak.org`
- Demo quote: `1000` atomic USDC units, equal to `0.001 USDC`

## Implemented

1. Replaced the deterministic Monad test-reference implementation with x402 v2 payment requirements.
2. Added real EVM exact-payment signing with `@x402/core`, `@x402/evm`, and `viem`.
3. Added facilitator-backed verification and settlement on the MSOS endpoint.
4. Kept the agent flow intact:
   - request MSOS signal without payment,
   - receive HTTP 402 payment requirement,
   - compare quote against `maxSignalCostAtomic`,
   - sign approved payment authorization,
   - retry paid request,
   - store facilitator verification and settlement results,
   - validate the signal,
   - apply the safety-margin rule,
   - record the paper action.
5. Added an explicit `mock` payment mode for unit tests and local demo only.
6. Added `npm run demo:monad` as the opt-in live integration command.
7. Added `.env.example` with placeholder-only live configuration names.

## Removed Misleading Simulation

Removed from source code:

- the old hackathon test-reference protocol label
- the old deterministic local verification label
- locally fabricated transaction-hash-shaped receipts
- fabricated Monad explorer URLs
- verification based only on string shape

Mock mode remains only as `mode: "mock"` and states that it is not verified on Monad. It emits `mock-settlement-not-onchain`, not a Monad explorer URL and not a 64-byte transaction hash.

## Unit-Test Mock Evidence

Command:

```text
npm test
```

Result:

```text
Test Files  1 passed (1)
Tests       10 passed (10)
```

Covered mock facilitator cases:

- payment required
- budget rejection
- verification rejection
- settlement rejection
- malformed signal
- successful paid retry

The local mock demo also passed:

```text
npm run demo
```

Important mock evidence fields:

- `paymentMode: "mock"`
- `quotedAmountAtomic: "1000"`
- `settlement.transaction: "mock-settlement-not-onchain"`
- mock verification note: `not verified on Monad`
- mock settlement note: `no Monad transaction was sent`

## Live Monad Testnet Evidence

Command attempted:

```text
npm run demo:monad
```

Current result:

```text
Error: Missing required live Monad x402 environment variables: MONAD_PAYER_PRIVATE_KEY, MONAD_PAY_TO_ADDRESS, MONAD_FACILITATOR_URL, MONAD_NETWORK, MONAD_TESTNET_USDC_ADDRESS, MONAD_RPC_URL, MONAD_MAX_SIGNAL_COST_ATOMIC
```

No live Monad payment was run in this shell because the required signer, pay-to address, facilitator, network, USDC, RPC, and budget environment variables were absent.

Live evidence still required after configuration:

- payer address
- pay-to address
- quoted USDC amount
- facilitator verification response
- facilitator settlement response
- genuine settlement transaction hash
- independent Monad RPC or recognized explorer verification
- complete agent execution trace

The live command independently verifies the returned settlement transaction hash through `MONAD_RPC_URL` using `eth_getTransactionReceipt` via viem. It rejects non-hash settlement values before RPC verification.

## Commands Run

```text
npm run typecheck
npm test
npm run lint
npm run build
npm run demo
npm run demo:monad
```

Results:

- `npm run typecheck`: passed
- `npm test`: passed, 10 tests
- `npm run lint`: passed
- `npm run build`: passed
- `npm run demo`: passed with explicit mock evidence
- `npm run demo:monad`: failed clearly at the missing-env gate

## Files Changed

- `.env.example`
- `CURRENT_TASK.md`
- `package-lock.json`
- `package.json`
- `src/demo/run.ts`
- `src/demo/run-monad-live.ts`
- `src/programs/msos-margin-demo.ts`
- `src/test/runtime.test.ts`
- `src/tools/index.ts`
- `src/tools/monad-payment/monad-payment-tool.ts`
- `src/tools/msos-signal/paid-msos-signal-endpoint.ts`
- `src/tools/msos-signal/paid-msos-signal-tool.ts`

## Stop Condition

Stop after the real paid-signal flow succeeds. Do not start UI work, live market-data work, additional strategies, real trading, or presentation polish.
