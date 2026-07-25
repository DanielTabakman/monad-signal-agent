# Public Deployment

The browser demo is a single Node.js service: the server hosts the static interface and exposes the bounded runtime API from the same origin. No private key is sent to the browser.

## Railway deployment

1. Create a Railway project from the GitHub repository `DanielTabakman/monad-signal-agent`.
2. Deploy the `main` branch.
3. Railway reads `railway.json`, runs `npm run build`, starts the service with `npm start`, and checks `/api/health`.
4. Add the environment variables listed below in the Railway service **Variables** tab.
5. Under **Settings → Networking → Public Networking**, generate a Railway domain.

## Required secret variables

Copy these values from the local `.env.local` file into Railway. Do not commit them.

```text
MONAD_PAYER_PRIVATE_KEY=<disposable funded Monad Testnet payer key>
MONAD_PAY_TO_ADDRESS=<Monad Testnet receiving address>
MONAD_FACILITATOR_URL=https://x402-facilitator.molandak.org
MONAD_NETWORK=eip155:10143
MONAD_TESTNET_USDC_ADDRESS=0x534b2f3A21130d7a60830c2Df862319e593943A3
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_MAX_SIGNAL_COST_ATOMIC=1000
```

Do not deploy `MONAD_PAY_TO_PRIVATE_KEY`. The public service needs only the receiving address.

## Public app variables

```text
NODE_ENV=production
HOST=0.0.0.0
PUBLIC_LIVE_RUNS_ENABLED=true
LIVE_RUNS_PER_IP=3
LIVE_RUN_WINDOW_MS=1800000
GLOBAL_LIVE_RUN_LIMIT=50
GLOBAL_LIVE_RUN_WINDOW_MS=86400000
```

Railway supplies `PORT`; the app reads it automatically.

## Public-wallet protections

- Only registered program templates can execute.
- Arbitrary pasted code is never evaluated.
- Real trading is impossible; execution remains paper-only.
- The server payment budget cannot exceed the environment cap.
- Live payment runs are rate-limited per IP and globally.
- Only one live settlement runs at a time.
- Each successful paid run spends `0.001` Monad Testnet USDC, which has no real-world value.
- Set `PUBLIC_LIVE_RUNS_ENABLED=false` to make the public site replay-only immediately.

The in-memory counters are hackathon safeguards, not production-grade abuse prevention. A production service should replace them with a shared rate-limit store and authenticated user budgets.

## Verification

Before deploying:

```powershell
npm ci
npm run demo:web:accept
```

After deployment:

1. Open `/api/health` and confirm `ok: true`, `deployment: "public"`, and `liveRunsEnabled: true`.
2. Run the Price Report program; it should complete without payment.
3. Run Verified Replay; it should show the prior transaction without sending a payment.
4. Run MSOS Margin Agent at 5% with a 0.001-USDC budget; it should settle and record a paper `BUY`.
5. Run at a 10% margin; it should settle and record `NO_TRADE`.
6. Run with a 0.0005-USDC budget; it should stop before payment.

## Hackathon submission

Submit both:

- Repository: `https://github.com/DanielTabakman/monad-signal-agent`
- Public app: the generated Railway `*.up.railway.app` URL

The repository contains the charter, acceptance gate, test suite, deployment configuration, public UI, real Monad x402 integration, verified transaction evidence, and replay fallback.
