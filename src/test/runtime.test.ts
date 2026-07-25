import { describe, expect, it } from "vitest";
import { AgentRuntime, ToolRegistry } from "../core/index.js";
import { decidePaperTradeAction, msosMarginDemoProgram, priceReportSmokeTestProgram } from "../programs/index.js";
import { createCachedMarketDataTool, createMsosSignalStubTool, createPaperTradingTool } from "../tools/index.js";
import type { MsosSignal } from "../tools/index.js";

describe("unpaid vertical slice", () => {
  it("runs the MSOS margin demo through registered tools and records a paper action", async () => {
    const { runtime, paperTrading } = createRuntime();

    const result = await runtime.run(msosMarginDemoProgram, {
      market: "crypto",
      asset: "SOL",
      safetyMargin: 0.05
    });

    expect(result.ok).toBe(true);
    expect(result.result?.action).toBe("BUY");
    expect(paperTrading.records).toHaveLength(1);
    expect(result.trace.map((event) => event.type)).toEqual([
      "program_started",
      "tool_call_started",
      "tool_call_succeeded",
      "tool_call_started",
      "tool_call_succeeded",
      "decision",
      "tool_call_started",
      "tool_call_succeeded",
      "program_completed"
    ]);
  });

  it("runs a second program without changing the runtime", async () => {
    const { runtime } = createRuntime();

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

function createRuntime(): ReturnType<typeof createRuntimeParts> {
  return createRuntimeParts();
}

function createRuntimeParts() {
  const registry = new ToolRegistry();
  registry.register(createCachedMarketDataTool());
  registry.register(createMsosSignalStubTool());
  const paperTrading = createPaperTradingTool();
  registry.register(paperTrading.tool);

  return {
    runtime: new AgentRuntime(registry),
    paperTrading
  };
}
