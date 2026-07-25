import type { JsonObject, JsonValue, Tool } from "../../core/index.js";
import {
  createMonadPaymentReference,
  type MonadPaymentReference,
  type PaymentRequirement
} from "../msos-signal/paid-msos-signal-endpoint.js";

export interface MonadPaymentRequest extends JsonObject {
  payer: string;
  paymentRequirement: PaymentRequirement;
}

export type MonadPaymentReceipt = MonadPaymentReference;

export function createMonadPaymentTool(): Tool<MonadPaymentRequest, MonadPaymentReceipt> {
  return {
    name: "monad-payment",
    validateInput(input: JsonValue): input is MonadPaymentRequest {
      return (
        isRecord(input) &&
        typeof input.payer === "string" &&
        input.payer.length > 0 &&
        isPaymentRequirement(input.paymentRequirement)
      );
    },
    async execute(input: MonadPaymentRequest): Promise<MonadPaymentReceipt> {
      return createMonadPaymentReference({
        payer: input.payer,
        requirement: input.paymentRequirement
      });
    }
  };
}

function isPaymentRequirement(value: JsonValue): value is PaymentRequirement {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.network === "monad-testnet" &&
    value.protocol === "monad-hackathon-test-reference" &&
    typeof value.amountAtomic === "string" &&
    value.currency === "MON" &&
    typeof value.recipient === "string" &&
    typeof value.memo === "string" &&
    typeof value.expiresAt === "string" &&
    typeof value.verificationMethod === "string"
  );
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
