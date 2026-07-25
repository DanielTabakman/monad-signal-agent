import type { JsonObject, JsonValue, Tool } from "../../core/index.js";

export interface MarketDataRequest extends JsonObject {
  market: string;
  asset: string;
}

export interface MarketSnapshot extends JsonObject {
  market: string;
  asset: string;
  price: number;
  currency: string;
  source: "cached";
  observedAt: string;
}

const cachedSnapshots: Record<string, MarketSnapshot> = {
  "crypto:SOL": {
    market: "crypto",
    asset: "SOL",
    price: 182.42,
    currency: "USD",
    source: "cached",
    observedAt: "2026-07-25T00:00:00.000Z"
  }
};

export function createCachedMarketDataTool(): Tool<MarketDataRequest, MarketSnapshot> {
  return {
    name: "market-data",
    validateInput(input: JsonValue): input is MarketDataRequest {
      return (
        isRecord(input) &&
        typeof input.market === "string" &&
        input.market.length > 0 &&
        typeof input.asset === "string" &&
        input.asset.length > 0
      );
    },
    async execute(input: MarketDataRequest): Promise<MarketSnapshot> {
      const snapshot = cachedSnapshots[`${input.market}:${input.asset}`];
      if (!snapshot) {
        throw new Error(`No cached market data for ${input.market}:${input.asset}`);
      }

      return snapshot;
    }
  };
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
