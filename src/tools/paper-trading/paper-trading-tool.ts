import type { JsonObject, JsonValue, Tool } from "../../core/index.js";
import type { SignalDecision } from "../msos-signal/msos-signal-stub-tool.js";

export type PaperTradeAction = SignalDecision;

export interface PaperTradeRequest extends JsonObject {
  market: string;
  asset: string;
  action: PaperTradeAction;
  referencePrice: number;
  reason: string;
}

export interface PaperTradeRecord extends PaperTradeRequest {
  id: string;
  recordedAt: string;
  mode: "paper";
}

export interface PaperTradingToolHandle {
  tool: Tool<PaperTradeRequest, PaperTradeRecord>;
  records: readonly PaperTradeRecord[];
}

export function createPaperTradingTool(): PaperTradingToolHandle {
  const records: PaperTradeRecord[] = [];

  return {
    get records(): readonly PaperTradeRecord[] {
      return records;
    },
    tool: {
      name: "paper-trading",
      validateInput(input: JsonValue): input is PaperTradeRequest {
        return (
          isRecord(input) &&
          typeof input.market === "string" &&
          input.market.length > 0 &&
          typeof input.asset === "string" &&
          input.asset.length > 0 &&
          isPaperTradeAction(input.action) &&
          typeof input.referencePrice === "number" &&
          Number.isFinite(input.referencePrice) &&
          typeof input.reason === "string" &&
          input.reason.length > 0
        );
      },
      async execute(input: PaperTradeRequest): Promise<PaperTradeRecord> {
        const record: PaperTradeRecord = {
          ...input,
          id: `paper-${records.length + 1}`,
          recordedAt: "2026-07-25T00:02:00.000Z",
          mode: "paper"
        };
        records.push(record);
        return record;
      }
    }
  };
}

function isPaperTradeAction(value: JsonValue): value is PaperTradeAction {
  return value === "BUY" || value === "SELL" || value === "NO_TRADE";
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
