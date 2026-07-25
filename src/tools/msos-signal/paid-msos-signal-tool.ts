import type { JsonObject, JsonValue, Tool } from "../../core/index.js";
import type {
  MonadPaymentReference,
  PaidMsosSignalRequest,
  PaidMsosSignalResponse
} from "./paid-msos-signal-endpoint.js";

export interface PaidMsosSignalToolConfig {
  readonly endpointUrl: string;
}

export function createPaidMsosSignalTool(config: PaidMsosSignalToolConfig): Tool<PaidMsosSignalRequest, PaidMsosSignalResponse> {
  return {
    name: "msos-signal",
    validateInput(input: JsonValue): input is PaidMsosSignalRequest {
      return (
        isRecord(input) &&
        typeof input.market === "string" &&
        input.market.length > 0 &&
        typeof input.asset === "string" &&
        input.asset.length > 0 &&
        typeof input.referencePrice === "number" &&
        Number.isFinite(input.referencePrice) &&
        (input.paymentReference === null || isMonadPaymentReference(input.paymentReference))
      );
    },
    async execute(input: PaidMsosSignalRequest): Promise<PaidMsosSignalResponse> {
      const response = await fetch(`${config.endpointUrl}/msos/signal`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input)
      });
      const body = (await response.json()) as JsonObject;

      if (response.status === 402) {
        return body as PaidMsosSignalResponse;
      }

      if (!response.ok) {
        throw new Error(`MSOS signal endpoint failed with HTTP ${response.status}`);
      }

      return body as PaidMsosSignalResponse;
    }
  };
}

function isMonadPaymentReference(value: JsonValue): value is MonadPaymentReference {
  return (
    isRecord(value) &&
    (value.mode === "live" || value.mode === "mock") &&
    typeof value.payer === "string" &&
    isRecord(value.paymentPayload) &&
    isRecord(value.accepted) &&
    typeof value.createdAt === "string"
  );
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
