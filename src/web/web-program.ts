export type DemoProgramId = "msos-margin-demo" | "price-report-smoke-test";

export interface WebRunRequest {
  programId: DemoProgramId;
  market: "crypto";
  asset: "SOL";
  safetyMargin: number;
  maxSignalCostAtomic: string;
}

export function parseWebRunRequest(value: unknown): WebRunRequest {
  if (!isRecord(value)) {
    throw new Error("Run request must be a JSON object");
  }

  const programId = value.programId;
  const market = value.market;
  const asset = value.asset;
  const safetyMargin = value.safetyMargin;
  const maxSignalCostAtomic = value.maxSignalCostAtomic;

  if (programId !== "msos-margin-demo" && programId !== "price-report-smoke-test") {
    throw new Error("Unsupported program template");
  }

  if (market !== "crypto") {
    throw new Error("The hackathon demo currently supports the crypto market only");
  }

  if (asset !== "SOL") {
    throw new Error("The hackathon demo currently supports SOL only");
  }

  if (typeof safetyMargin !== "number" || !Number.isFinite(safetyMargin) || safetyMargin < 0 || safetyMargin > 1) {
    throw new Error("Safety margin must be a finite number between 0 and 1");
  }

  if (typeof maxSignalCostAtomic !== "string" || !/^\d+$/.test(maxSignalCostAtomic)) {
    throw new Error("Signal budget must be an integer USDC atomic-unit string");
  }

  if (BigInt(maxSignalCostAtomic) < 0n || BigInt(maxSignalCostAtomic) > 1000n) {
    throw new Error("Signal budget must be between 0 and 1000 atomic USDC units");
  }

  return {
    programId,
    market,
    asset,
    safetyMargin,
    maxSignalCostAtomic
  };
}

export function generateProgramSource(config: WebRunRequest): string {
  if (config.programId === "price-report-smoke-test") {
    return [
      'export default defineProgram({',
      '  id: "price-report-smoke-test",',
      `  market: "${config.market}",`,
      `  asset: "${config.asset}",`,
      '  async run({ tools }) {',
      '    return tools.marketData.get({ market, asset });',
      '  }',
      '});'
    ].join("\n");
  }

  return [
    'export default defineProgram({',
    '  id: "msos-margin-demo",',
    `  market: "${config.market}",`,
    `  asset: "${config.asset}",`,
    `  maxSignalCostAtomic: "${config.maxSignalCostAtomic}",`,
    `  safetyMargin: ${config.safetyMargin.toFixed(2)},`,
    '  async run({ tools, limits }) {',
    '    const market = await tools.marketData.get({ asset });',
    '    const signal = await tools.msosSignal.purchase({',
    '      referencePrice: market.price,',
    '      paymentRail: "Monad x402",',
    '      maxCost: limits.maxSignalCostAtomic',
    '    });',
    '',
    '    return signal.estimatedEdge >= safetyMargin',
    '      ? tools.paperTrading.record(signal.decision)',
    '      : tools.paperTrading.record("NO_TRADE");',
    '  }',
    '});'
  ].join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
