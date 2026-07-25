import type { ExecutionContext, JsonObject, Program } from "../core/index.js";
import type { MarketSnapshot } from "../tools/market-data/cached-market-data-tool.js";

export interface PriceReportConfig extends JsonObject {
  market: string;
  asset: string;
}

export interface PriceReportResult extends JsonObject {
  market: string;
  asset: string;
  price: number;
  currency: string;
  source: string;
}

export const priceReportSmokeTestProgram: Program<PriceReportConfig, PriceReportResult> = {
  id: "price-report-smoke-test",
  async run(config: PriceReportConfig, context: ExecutionContext): Promise<PriceReportResult> {
    const snapshot = await context.callTool<MarketSnapshot>("market-data", {
      market: config.market,
      asset: config.asset
    });

    context.recordDecision("price-report-created", {
      market: snapshot.market,
      asset: snapshot.asset,
      source: snapshot.source
    });

    return {
      market: snapshot.market,
      asset: snapshot.asset,
      price: snapshot.price,
      currency: snapshot.currency,
      source: snapshot.source
    };
  }
};
