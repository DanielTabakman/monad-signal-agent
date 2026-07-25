import type { JsonObject, JsonValue, Tool } from "../../core/index.js";

export type SignalDecision = "BUY" | "SELL" | "NO_TRADE";

export interface MsosSignalRequest extends JsonObject {
  market: string;
  asset: string;
  referencePrice: number;
}

export interface MsosSignal extends JsonObject {
  market: string;
  asset: string;
  decision: SignalDecision;
  confidence: number;
  estimatedEdge: number;
  referencePrice: number;
  reasons: string[];
  generatedAt: string;
}

export function createMsosSignalStubTool(): Tool<MsosSignalRequest, MsosSignal> {
  return {
    name: "msos-signal",
    validateInput(input: JsonValue): input is MsosSignalRequest {
      return (
        isRecord(input) &&
        typeof input.market === "string" &&
        input.market.length > 0 &&
        typeof input.asset === "string" &&
        input.asset.length > 0 &&
        typeof input.referencePrice === "number" &&
        Number.isFinite(input.referencePrice)
      );
    },
    async execute(input: MsosSignalRequest): Promise<MsosSignal> {
      return {
        market: input.market,
        asset: input.asset,
        decision: "BUY",
        confidence: 0.68,
        estimatedEdge: 0.08,
        referencePrice: input.referencePrice,
        reasons: ["deterministic local stub for unpaid vertical slice"],
        generatedAt: "2026-07-25T00:01:00.000Z"
      };
    }
  };
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
