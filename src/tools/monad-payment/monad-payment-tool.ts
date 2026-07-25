import { x402Client } from "@x402/core/client";
import type { PaymentRequired } from "@x402/core/types";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import type { JsonObject, JsonValue, Tool } from "../../core/index.js";
import type {
  MonadPaymentReference,
  MonadX402PaymentPayload,
  MonadX402PaymentRequirement
} from "../msos-signal/paid-msos-signal-endpoint.js";
import { MONAD_X402_NETWORK } from "../msos-signal/paid-msos-signal-endpoint.js";

export interface MonadPaymentRequest extends JsonObject {
  payer: string;
  paymentRequirement: MonadX402PaymentRequirement;
}

export type MonadPaymentReceipt = MonadPaymentReference;

export interface MonadPaymentToolConfig {
  readonly mode?: "mock" | "live";
  readonly payerPrivateKey?: `0x${string}`;
}

export function createMonadPaymentTool(config: MonadPaymentToolConfig = {}): Tool<MonadPaymentRequest, MonadPaymentReceipt> {
  const mode = config.mode ?? "mock";

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
      if (mode === "live") {
        if (!config.payerPrivateKey) {
          throw new Error("MONAD_PAYER_PRIVATE_KEY is required for live Monad x402 payment signing");
        }

        const account = privateKeyToAccount(config.payerPrivateKey);
        const client = new x402Client();
        registerExactEvmScheme(client, {
          signer: account,
          networks: [MONAD_X402_NETWORK]
        });

        const paymentPayload = (await client.createPaymentPayload(
          input.paymentRequirement as unknown as PaymentRequired
        )) as MonadX402PaymentPayload;
        const jsonPaymentPayload = toJsonSafe(paymentPayload) as MonadX402PaymentPayload;
        jsonPaymentPayload.resource = jsonPaymentPayload.resource ?? input.paymentRequirement.resource;

        return {
          mode: "live",
          payer: account.address,
          paymentPayload: jsonPaymentPayload,
          accepted: toJsonSafe(paymentPayload.accepted),
          createdAt: new Date().toISOString()
        };
      }

      const accepted = input.paymentRequirement.accepts[0];
      if (!accepted) {
        throw new Error("x402 payment requirement did not include an accepted payment option");
      }
      return {
        mode: "mock",
        payer: input.payer,
        paymentPayload: {
          x402Version: 2,
          resource: input.paymentRequirement.resource,
          accepted,
          payload: {
            mockAuthorization: {
              payer: input.payer,
              note: "unit-test mock payment payload; not verified on Monad"
            }
          }
        } as unknown as MonadX402PaymentPayload,
        accepted,
        createdAt: new Date().toISOString()
      };
    }
  };
}

function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, current) => (typeof current === "bigint" ? current.toString() : current))
  ) as T;
}

function isPaymentRequirement(value: JsonValue): value is MonadX402PaymentRequirement {
  return (
    isRecord(value) &&
    value.x402Version === 2 &&
    isRecord(value.resource) &&
    Array.isArray(value.accepts) &&
    value.accepts.some((accepts) => isAcceptedPayment(accepts))
  );
}

function isAcceptedPayment(value: JsonValue): boolean {
  return (
    isRecord(value) &&
    value.scheme === "exact" &&
    value.network === MONAD_X402_NETWORK &&
    typeof value.amount === "string" &&
    typeof value.asset === "string" &&
    typeof value.payTo === "string" &&
    typeof value.maxTimeoutSeconds === "number" &&
    isRecord(value.extra)
  );
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
