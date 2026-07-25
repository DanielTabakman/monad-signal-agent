import { describe, expect, it } from "vitest";
import { generateProgramSource, parseWebRunRequest } from "../web/web-program.js";

describe("web demo program controls", () => {
  it("accepts the bounded paid-signal configuration", () => {
    const config = parseWebRunRequest({
      programId: "msos-margin-demo",
      market: "crypto",
      asset: "SOL",
      safetyMargin: 0.1,
      maxSignalCostAtomic: "1000"
    });

    expect(config.safetyMargin).toBe(0.1);
    expect(config.maxSignalCostAtomic).toBe("1000");
  });

  it("rejects unsupported assets and budgets above the local cap", () => {
    expect(() =>
      parseWebRunRequest({
        programId: "msos-margin-demo",
        market: "crypto",
        asset: "BTC",
        safetyMargin: 0.05,
        maxSignalCostAtomic: "1000"
      })
    ).toThrow("supports SOL only");

    expect(() =>
      parseWebRunRequest({
        programId: "msos-margin-demo",
        market: "crypto",
        asset: "SOL",
        safetyMargin: 0.05,
        maxSignalCostAtomic: "1001"
      })
    ).toThrow("between 0 and 1000");
  });

  it("generates a presenter-visible program matching the executable controls", () => {
    const config = parseWebRunRequest({
      programId: "msos-margin-demo",
      market: "crypto",
      asset: "SOL",
      safetyMargin: 0.1,
      maxSignalCostAtomic: "500"
    });
    const source = generateProgramSource(config);

    expect(source).toContain('id: "msos-margin-demo"');
    expect(source).toContain('maxSignalCostAtomic: "500"');
    expect(source).toContain("safetyMargin: 0.10");
    expect(source).toContain('tools.paperTrading.record("NO_TRADE")');
  });
});
