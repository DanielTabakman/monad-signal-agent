import { describe, expect, it } from "vitest";
import { AgentRuntime, ToolRegistry } from "../core/index.js";
import { decidePaperTradeAction, msosMarginDemoProgram, priceReportSmokeTestProgram } from "../programs/index.js";
import {
  createCachedMarketDataTool,
  createMonadPaymentTool,
  createPaidMsosSignalTool,
  createPaperTradingTool,
  getMsosPaymentRequirement,
  startPaidMsosSignalEndpoint
} from "../tools/index.js";
import type { MsosSignal, PaidMsosSignalEndpoint } from "../tools/index.js";

describe("paid MSOS vertical slice", () => {
  it("returns the expected payment requirement for an unpaid HTTP request", async () => {
    const endpoint = await startPaidMsosSignalEndpoint();

    try {
      const response = await fetch(`${endpoint.url}/msos/signal`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          market: "crypto",
          asset: "SOL",
          referencePrice: 182.42,
          paymentReference: null
        })
      });
      const body = await response.json();

      expect(response.status).toBe(402);
      expect(body).toEqual({
        status: "payment_required",
        paymentRequirement: getMsosPaymentRequirement()
      });
    } finally {
      await endpoint.close();
    }
  });

  it("runs the MSOS margin demo through payment, validation, and paper execution", async () => {
    const { runtime, paperTrading, endpoint } = await createRuntime();

    try {
      const result = await runtime.run(msosMarginDemoProgram, {
        market: "crypto",
        asset: "SOL",
        safetyMargin: 0.05,
        maxSignalCostAtomic: "10000000000000000",
        payer: "0x000000000000000000000000000000000000dEaD"
      });

      expect(result.ok).toBe(true);
      expect(result.result?.action).toBe("BUY");
      expect(result.result?.paymentReference).toMatch(/^monad-test-ref_/);
      expect(result.result?.transactionHash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(paperTrading.records).toHaveLength(1);
      expect(result.trace.map((event) => event.type)).toEqual([
        "program_started",
        "tool_call_started",
        "tool_call_succeeded",
        "tool_call_started",
        "tool_call_succeeded",
        "payment_required",
        "payment_approved",
        "tool_call_started",
        "tool_call_succeeded",
        "payment_submitted",
        "tool_call_started",
        "tool_call_succeeded",
        "payment_verified",
        "signal_validation",
        "decision",
        "tool_call_started",
        "tool_call_succeeded",
        "program_completed"
      ]);
    } finally {
      await endpoint.close();
    }
  });

  it("stops before payment when the quoted signal cost exceeds budget", async () => {
    const { runtime, paperTrading, endpoint } = await createRuntime();

    try {
      const result = await runtime.run(msosMarginDemoProgram, {
        market: "crypto",
        asset: "SOL",
        safetyMargin: 0.05,
        maxSignalCostAtomic: "1",
        payer: "0x000000000000000000000000000000000000dEaD"
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe("MSOS signal payment rejected: quoted cost exceeds configured maximum budget");
      expect(result.trace.some((event) => event.type === "payment_rejected")).toBe(true);
      expect(result.trace.some((event) => event.type === "payment_submitted")).toBe(false);
      expect(
        result.trace.some((event) => event.type === "tool_call_started" && event.toolName === "monad-payment")
      ).toBe(false);
      expect(paperTrading.records).toHaveLength(0);
    } finally {
      await endpoint.close();
    }
  });

  it("stops before paper execution when the paid signal is malformed", async () => {
    const { runtime, paperTrading, endpoint } = await createRuntime({ malformedSignal: true });

    try {
      const result = await runtime.run(msosMarginDemoProgram, {
        market: "crypto",
        asset: "SOL",
        safetyMargin: 0.05,
        maxSignalCostAtomic: "10000000000000000",
        payer: "0x000000000000000000000000000000000000dEaD"
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Invalid MSOS signal: signal estimatedEdge is missing or invalid");
      expect(result.trace.some((event) => event.type === "payment_verified")).toBe(true);
      expect(result.trace.some((event) => event.type === "signal_validation" && !event.valid)).toBe(true);
      expect(
        result.trace.some((event) => event.type === "tool_call_started" && event.toolName === "paper-trading")
      ).toBe(false);
      expect(paperTrading.records).toHaveLength(0);
    } finally {
      await endpoint.close();
    }
  });
});

describe("runtime programmability and unpaid guardrails", () => {
  it("runs a second program without changing the runtime", async () => {
    const { runtime, endpoint } = await createRuntime();

    try {
      const result = await runtime.run(priceReportSmokeTestProgram, {
        market: "crypto",
        asset: "SOL"
      });

      expect(result.ok).toBe(true);
      expect(result.result).toMatchObject({
        market: "crypto",
        asset: "SOL",
        price: 182.42,
        source: "cached"
      });
      expect(result.trace.some((event) => event.type === "decision")).toBe(true);
    } finally {
      await endpoint.close();
    }
  });

  it("stops safely when a program calls an unregistered tool", async () => {
    const registry = new ToolRegistry();
    const runtime = new AgentRuntime(registry);

    const result = await runtime.run(priceReportSmokeTestProgram, {
      market: "crypto",
      asset: "SOL"
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Tool not registered: market-data");
    expect(result.trace.at(-1)?.type).toBe("program_failed");
  });
});

describe("safety margin decision", () => {
  const signal: MsosSignal = {
    market: "crypto",
    asset: "SOL",
    decision: "BUY",
    confidence: 0.68,
    estimatedEdge: 0.08,
    referencePrice: 182.42,
    reasons: [],
    generatedAt: "2026-07-25T00:01:00.000Z"
  };

  it("uses the signal action when estimated edge clears the margin", () => {
    expect(decidePaperTradeAction(signal, 0.05)).toBe("BUY");
  });

  it("records no trade when estimated edge is below the margin", () => {
    expect(decidePaperTradeAction(signal, 0.1)).toBe("NO_TRADE");
  });
});

async function createRuntime(options: { malformedSignal?: boolean } = {}): Promise<{
  runtime: AgentRuntime;
  paperTrading: ReturnType<typeof createPaperTradingTool>;
  endpoint: PaidMsosSignalEndpoint;
}> {
  const endpoint = await startPaidMsosSignalEndpoint(options);
  const registry = new ToolRegistry();
  registry.register(createCachedMarketDataTool());
  registry.register(createPaidMsosSignalTool({ endpointUrl: endpoint.url }));
  registry.register(createMonadPaymentTool());
  const paperTrading = createPaperTradingTool();
  registry.register(paperTrading.tool);

  return {
    runtime: new AgentRuntime(registry),
    paperTrading,
    endpoint
  };
}
