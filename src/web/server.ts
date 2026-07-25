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

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT ?? 4173);
const WEB_ROOT = join(process.cwd(), "web");

const server = createServer(async (request, response) => {
  try {
    await handleRequest(request, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected demo server error";
    sendJson(response, 500, { ok: false, error: message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\nMonad Signal Agent UI running at http://${HOST}:${PORT}`);
  console.log("Keep this terminal open while presenting. Press Ctrl+C to stop.\n");
});

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);

  if (request.method === "GET" && url.pathname === "/api/health") {
    await loadEnvLocal();
    const walletConfigured = [
      "MONAD_PAYER_PRIVATE_KEY",
      "MONAD_PAY_TO_ADDRESS",
      "MONAD_FACILITATOR_URL",
      "MONAD_RPC_URL"
    ].every((name) => Boolean(process.env[name]));

    sendJson(response, 200, {
      ok: true,
      network: "Monad Testnet",
      walletConfigured,
      livePaymentAmount: "0.001 USDC"
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/run") {
    const config = parseWebRunRequest(await readJsonBody(request));
    const result =
      config.programId === "msos-margin-demo"
        ? await runPaidSignalProgram(config)
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

  sendJson(response, 404, { ok: false, error: "Route not found" });
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
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > 64 * 1024) {
      throw new Error("Request body exceeded 64 KB");
    }
    chunks.push(buffer);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) {
    throw new Error("Request body is required");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Request body must contain valid JSON");
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
    sendJson(response, 404, { ok: false, error: "Page not found" });
    return;
  }

  const content = await readFile(join(WEB_ROOT, fileName));
  response.writeHead(200, {
    "Content-Type": contentType(fileName),
    "Cache-Control": "no-store",
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

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}
