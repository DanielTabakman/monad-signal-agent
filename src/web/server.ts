import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join } from "node:path";
import { AgentRuntime, ToolRegistry } from "../core/index.js";
import { backupDemoEvidence } from "../demo/backup-demo-evidence.js";
import { runLiveMonadDemo } from "../demo/live-monad-demo.js";
import { loadEnvLocal } from "../demo/load-env-local.js";
import { priceReportSmokeTestProgram } from "../programs/index.js";
import { createCachedMarketDataTool } from "../tools/index.js";
import { generateProgramSource, parseWebRunRequest, type WebRunRequest } from "./web-program.js";

const HOST = process.env.HOST ?? "0.0.0.0";
const PORT = readPositiveInteger(process.env.PORT, 4173);
const WEB_ROOT = join(process.cwd(), "web");
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const LIVE_RUNS_ENABLED = readBoolean(process.env.PUBLIC_LIVE_RUNS_ENABLED, !IS_PRODUCTION);
const LIVE_RUNS_PER_IP = readPositiveInteger(process.env.LIVE_RUNS_PER_IP, 3);
const LIVE_RUN_WINDOW_MS = readPositiveInteger(process.env.LIVE_RUN_WINDOW_MS, 30 * 60 * 1000);
const GLOBAL_LIVE_RUN_LIMIT = readPositiveInteger(process.env.GLOBAL_LIVE_RUN_LIMIT, 50);
const GLOBAL_LIVE_RUN_WINDOW_MS = readPositiveInteger(
  process.env.GLOBAL_LIVE_RUN_WINDOW_MS,
  24 * 60 * 60 * 1000
);

interface RateBucket {
  count: number;
  resetAt: number;
}

const liveRunBuckets = new Map<string, RateBucket>();
let globalLiveRunBucket: RateBucket = {
  count: 0,
  resetAt: Date.now() + GLOBAL_LIVE_RUN_WINDOW_MS
};
let liveRunInFlight = false;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfterSeconds?: number
  ) {
    super(message);
  }
}

const server = createServer(async (request, response) => {
  try {
    await handleRequest(request, response);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected demo server error";
    const retryAfter = error instanceof HttpError ? error.retryAfterSeconds : undefined;
    sendJson(
      response,
      status,
      { ok: false, error: message },
      retryAfter === undefined ? undefined : { "Retry-After": String(retryAfter) }
    );
  }
});

server.listen(PORT, HOST, () => {
  const localAddress = HOST === "0.0.0.0" ? "127.0.0.1" : HOST;
  console.log(`\nMonad Signal Agent UI running at http://${localAddress}:${PORT}`);
  console.log(
    IS_PRODUCTION
      ? "Public deployment mode enabled."
      : "Keep this terminal open while presenting. Press Ctrl+C to stop."
  );
  console.log(`Live paid runs: ${LIVE_RUNS_ENABLED ? "enabled" : "disabled"}\n`);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "GET" && url.pathname === "/api/health") {
    await loadEnvLocal();
    const walletConfigured = isWalletConfigured();

    sendJson(response, 200, {
      ok: true,
      network: "Monad Testnet",
      walletConfigured,
      liveRunsEnabled: LIVE_RUNS_ENABLED && walletConfigured,
      livePaymentAmount: "0.001 USDC",
      deployment: IS_PRODUCTION ? "public" : "local",
      limits: {
        perIp: LIVE_RUNS_PER_IP,
        perIpWindowMinutes: Math.round(LIVE_RUN_WINDOW_MS / 60_000),
        global: GLOBAL_LIVE_RUN_LIMIT,
        globalWindowHours: Math.round(GLOBAL_LIVE_RUN_WINDOW_MS / 3_600_000)
      }
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/run") {
    const config = parseWebRunRequest(await readJsonBody(request));
    const result =
      config.programId === "msos-margin-demo"
        ? await runRateLimitedPaidSignalProgram(request, config)
        : await runPriceReportProgram(config);

    sendJson(response, 200, { ok: true, ...result });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/replay") {
    const replayConfig: WebRunRequest = {
      programId: "msos-margin-demo",
      market: "crypto",
      asset: "SOL",
      safetyMargin: 0.05,
      maxSignalCostAtomic: "1000"
    };

    sendJson(response, 200, {
      ok: true,
      mode: "replay",
      replayNotice: "Verified replay only — no new payment was sent.",
      programSource: generateProgramSource(replayConfig),
      evidence: backupDemoEvidence,
      trace: buildReplayTrace()
    });
    return;
  }

  if (request.method === "GET") {
    await serveStatic(url.pathname, response);
    return;
  }

  throw new HttpError(404, "Route not found");
}

async function runRateLimitedPaidSignalProgram(request: IncomingMessage, config: WebRunRequest) {
  if (!LIVE_RUNS_ENABLED) {
    throw new HttpError(
      403,
      "Live Monad payments are disabled on this deployment. Use verified replay instead."
    );
  }

  await loadEnvLocal();
  if (!isWalletConfigured()) {
    throw new HttpError(503, "The server testnet wallet is not configured. Use verified replay instead.");
  }

  if (liveRunInFlight) {
    throw new HttpError(429, "Another live payment is currently settling. Try again shortly.", 5);
  }

  consumeLiveRunAllowance(clientIdentifier(request));
  liveRunInFlight = true;
  try {
    return await runPaidSignalProgram(config);
  } finally {
    liveRunInFlight = false;
  }
}

async function runPaidSignalProgram(config: WebRunRequest) {
  const evidence = await runLiveMonadDemo({
    market: config.market,
    asset: config.asset,
    safetyMargin: config.safetyMargin,
    maxSignalCostAtomic: config.maxSignalCostAtomic
  });

  return {
    mode: "live",
    programSource: generateProgramSource(config),
    evidence,
    trace: evidence.agentExecutionTrace
  };
}

async function runPriceReportProgram(config: WebRunRequest) {
  const registry = new ToolRegistry();
  registry.register(createCachedMarketDataTool());
  const runtime = new AgentRuntime(registry);
  const result = await runtime.run(priceReportSmokeTestProgram, {
    market: config.market,
    asset: config.asset
  });

  if (!result.ok || !result.result) {
    throw new Error(result.error ?? "Price report program failed without an error message");
  }

  return {
    mode: "local",
    programSource: generateProgramSource(config),
    evidence: {
      market: result.result.market,
      asset: result.result.asset,
      price: result.result.price,
      currency: result.result.currency,
      source: result.result.source,
      action: "REPORT_ONLY",
      quotedUSDCAmount: "Not required",
      settlementTransactionHash: null,
      rpcVerification: null,
      paperTradeRecords: []
    },
    trace: result.trace
  };
}

function consumeLiveRunAllowance(clientId: string): void {
  const now = Date.now();
  globalLiveRunBucket = refreshBucket(globalLiveRunBucket, now, GLOBAL_LIVE_RUN_WINDOW_MS);

  if (globalLiveRunBucket.count >= GLOBAL_LIVE_RUN_LIMIT) {
    throw rateLimitError("The public demo has reached its daily live-payment limit.", globalLiveRunBucket, now);
  }

  const existing = liveRunBuckets.get(clientId) ?? {
    count: 0,
    resetAt: now + LIVE_RUN_WINDOW_MS
  };
  const bucket = refreshBucket(existing, now, LIVE_RUN_WINDOW_MS);

  if (bucket.count >= LIVE_RUNS_PER_IP) {
    throw rateLimitError("This browser has reached the live-payment limit. Use verified replay for now.", bucket, now);
  }

  bucket.count += 1;
  globalLiveRunBucket.count += 1;
  liveRunBuckets.set(clientId, bucket);
  pruneExpiredBuckets(now);
}

function refreshBucket(bucket: RateBucket, now: number, windowMs: number): RateBucket {
  return now >= bucket.resetAt ? { count: 0, resetAt: now + windowMs } : bucket;
}

function rateLimitError(message: string, bucket: RateBucket, now: number): HttpError {
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return new HttpError(429, message, retryAfterSeconds);
}

function pruneExpiredBuckets(now: number): void {
  if (liveRunBuckets.size < 500) {
    return;
  }

  for (const [key, bucket] of liveRunBuckets) {
    if (now >= bucket.resetAt) {
      liveRunBuckets.delete(key);
    }
  }
}

function clientIdentifier(request: IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const firstForwardedAddress = forwardedValue?.split(",")[0]?.trim();
  return firstForwardedAddress || request.socket.remoteAddress || "unknown";
}

function isWalletConfigured(): boolean {
  return [
    "MONAD_PAYER_PRIVATE_KEY",
    "MONAD_PAY_TO_ADDRESS",
    "MONAD_FACILITATOR_URL",
    "MONAD_NETWORK",
    "MONAD_TESTNET_USDC_ADDRESS",
    "MONAD_RPC_URL",
    "MONAD_MAX_SIGNAL_COST_ATOMIC"
  ].every((name) => Boolean(process.env[name]));
}

function buildReplayTrace(): Array<Record<string, unknown>> {
  return [
    { type: "program_started", programId: "msos-margin-demo" },
    { type: "tool_call_succeeded", toolName: "market-data", source: "cached" },
    { type: "payment_required", toolName: "msos-signal", amount: "0.001 USDC" },
    { type: "payment_verified", toolName: "monad-payment", mode: "verified replay" },
    { type: "signal_validation", toolName: "msos-signal", valid: true },
    { type: "decision", label: "safety-margin-comparison", selectedAction: "BUY" },
    { type: "tool_call_succeeded", toolName: "paper-trading", action: "BUY" },
    { type: "program_completed", programId: "msos-margin-demo" }
  ];
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const contentType = request.headers["content-type"] ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json");
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > 64 * 1024) {
      throw new HttpError(413, "Request body exceeded 64 KB");
    }
    chunks.push(buffer);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) {
    throw new HttpError(400, "Request body is required");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, "Request body must contain valid JSON");
  }
}

async function serveStatic(pathname: string, response: ServerResponse): Promise<void> {
  const staticFiles: Record<string, string> = {
    "/": "index.html",
    "/index.html": "index.html",
    "/styles.css": "styles.css",
    "/app.js": "app.js"
  };
  const fileName = staticFiles[pathname];

  if (!fileName) {
    throw new HttpError(404, "Page not found");
  }

  const content = await readFile(join(WEB_ROOT, fileName));
  response.writeHead(200, {
    ...securityHeaders(),
    "Content-Type": contentType(fileName),
    "Cache-Control": "public, max-age=300",
    "Content-Length": content.length
  });
  response.end(content);
}

function contentType(fileName: string): string {
  switch (extname(fileName)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function sendJson(
  response: ServerResponse,
  status: number,
  value: unknown,
  extraHeaders?: Record<string, string>
): void {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    ...securityHeaders(),
    ...extraHeaders,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}

function securityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  };
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  return value.toLowerCase() === "true";
}
