import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type {
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse
} from "@x402/core/types";
import { encodePaymentRequiredHeader, encodePaymentResponseHeader } from "@x402/core/http";
import { HTTPFacilitatorClient } from "@x402/core/server";
import type { JsonObject, JsonValue } from "../../core/index.js";
import type { MsosSignal } from "./msos-signal-stub-tool.js";

export const MONAD_X402_NETWORK = "eip155:10143";
export const MONAD_X402_VERSION = 2;
export const MONAD_USDC_TESTNET_ADDRESS = "0x534b2f3A21130d7a60830c2Df862319e593943A3";
export const MONAD_FACILITATOR_URL = "https://x402-facilitator.molandak.org";
export const MSOS_SIGNAL_AMOUNT_ATOMIC = "1000";
export const MSOS_SIGNAL_AMOUNT_USDC = "0.001";

export type MonadX402ResourceInfo = JsonObject & {
  url: string;
  description: string;
  mimeType: string;
};

export type MonadX402AcceptedPayment = JsonObject & {
  scheme: "exact";
  network: typeof MONAD_X402_NETWORK;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: JsonObject;
};

export type MonadX402PaymentRequirement = JsonObject & {
  x402Version: typeof MONAD_X402_VERSION;
  error?: string;
  resource: MonadX402ResourceInfo;
  accepts: MonadX402AcceptedPayment[];
};

export type MonadX402PaymentPayload = JsonObject & {
  x402Version: typeof MONAD_X402_VERSION;
  resource: MonadX402ResourceInfo;
  accepted: MonadX402AcceptedPayment;
  payload: JsonObject;
};

export type MonadX402VerifyResponse = JsonObject & {
  isValid: boolean;
  invalidReason?: string;
  invalidMessage?: string;
  payer?: string;
};

export type MonadX402SettleResponse = JsonObject & {
  success: boolean;
  errorReason?: string;
  errorMessage?: string;
  payer?: string;
  transaction: string;
  network: string;
  amount?: string;
};

export interface MonadPaymentReference extends JsonObject {
  mode: "live" | "mock";
  payer: string;
  paymentPayload: MonadX402PaymentPayload;
  accepted: MonadX402AcceptedPayment;
  createdAt: string;
}

export interface PaidMsosSignalRequest extends JsonObject {
  market: string;
  asset: string;
  referencePrice: number;
  paymentReference: MonadPaymentReference | null;
}

export interface PaidMsosSignalPaymentRequired extends JsonObject {
  status: "payment_required";
  paymentRequirement: MonadX402PaymentRequirement;
}

export interface PaidMsosSignalOk extends JsonObject {
  status: "ok";
  signal: JsonValue;
  payment: {
    verified: true;
    mode: "live" | "mock";
    payer: string;
    accepted: MonadX402AcceptedPayment;
    verification: MonadX402VerifyResponse;
    settlement: MonadX402SettleResponse;
    transactionHash: string;
  };
}

export type PaidMsosSignalResponse = PaidMsosSignalPaymentRequired | PaidMsosSignalOk;

export interface MonadX402Facilitator {
  verify(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<VerifyResponse>;
  settle(paymentPayload: PaymentPayload, paymentRequirements: PaymentRequirements): Promise<SettleResponse>;
}

export interface PaidMsosSignalEndpoint {
  readonly url: string;
  close(): Promise<void>;
}

export interface PaidMsosSignalEndpointOptions {
  readonly payTo?: string;
  readonly facilitator?: MonadX402Facilitator;
  readonly facilitatorUrl?: string;
  readonly malformedSignal?: boolean;
}

export function getMsosPaymentRequirement(resourceUrl = "http://127.0.0.1/msos/signal", payTo = mockPayToAddress()): MonadX402PaymentRequirement {
  return {
    x402Version: MONAD_X402_VERSION,
    resource: {
      url: resourceUrl,
      description: "MSOS SOL signal",
      mimeType: "application/json"
    },
    accepts: [getMsosAcceptedPayment(payTo)]
  };
}

export function getMsosAcceptedPayment(payTo = mockPayToAddress()): MonadX402AcceptedPayment {
  return {
    scheme: "exact",
    network: MONAD_X402_NETWORK,
    amount: MSOS_SIGNAL_AMOUNT_ATOMIC,
    asset: MONAD_USDC_TESTNET_ADDRESS,
    payTo,
    maxTimeoutSeconds: 300,
    extra: {
      name: "USDC",
      version: "2"
    }
  };
}

export async function startPaidMsosSignalEndpoint(
  options: PaidMsosSignalEndpointOptions = {}
): Promise<PaidMsosSignalEndpoint> {
  const payTo = options.payTo ?? mockPayToAddress();
  const facilitator =
    options.facilitator ?? new HTTPFacilitatorClient({ url: options.facilitatorUrl ?? MONAD_FACILITATOR_URL });

  const server = createServer((request, response) => {
    void handleRequest(request, response, { ...options, payTo, facilitator });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error?: Error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      })
  };
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: PaidMsosSignalEndpointOptions & { payTo: string; facilitator: MonadX402Facilitator }
): Promise<void> {
  if (request.method !== "POST" || request.url !== "/msos/signal") {
    writeJson(response, 404, { error: "not_found" });
    return;
  }

  const input = await readJson(request);
  if (!isPaidMsosSignalRequest(input)) {
    writeJson(response, 400, { error: "invalid_signal_request" });
    return;
  }

  const paymentRequirement = getMsosPaymentRequirement(`http://${request.headers.host}/msos/signal`, options.payTo);
  if (!input.paymentReference) {
    writePaymentRequired(response, paymentRequirement);
    return;
  }

  const paymentPayload = input.paymentReference.paymentPayload;
  const accepted = paymentPayload.accepted;

  if (!isExpectedAcceptedPayment(accepted, options.payTo)) {
    writePaymentRequired(response, paymentRequirement, "payment requirements do not match the MSOS signal quote");
    return;
  }

  let verification: MonadX402VerifyResponse;
  try {
    verification = (await options.facilitator.verify(
      paymentPayload as unknown as PaymentPayload,
      accepted as unknown as PaymentRequirements
    )) as MonadX402VerifyResponse;
  } catch (error) {
    writeJson(response, 402, {
      status: "payment_verification_rejected",
      verification: {
        isValid: false,
        invalidReason: "facilitator_verify_error",
        invalidMessage: error instanceof Error ? error.message : "facilitator verification failed"
      }
    });
    return;
  }
  if (!verification.isValid) {
    writeJson(response, 402, {
      status: "payment_verification_rejected",
      verification
    });
    return;
  }

  const signal = options.malformedSignal ? createMalformedSignal(input) : createSignal(input);
  let settlement: MonadX402SettleResponse;
  try {
    settlement = (await options.facilitator.settle(
      paymentPayload as unknown as PaymentPayload,
      accepted as unknown as PaymentRequirements
    )) as MonadX402SettleResponse;
  } catch (error) {
    writeJson(response, 402, {
      status: "payment_settlement_rejected",
      settlement: {
        success: false,
        errorReason: "facilitator_settle_error",
        errorMessage: error instanceof Error ? error.message : "facilitator settlement failed",
        transaction: "",
        network: accepted.network
      }
    });
    return;
  }
  if (!settlement.success) {
    writeJson(response, 402, {
      status: "payment_settlement_rejected",
      settlement
    });
    return;
  }

  writeJson(
    response,
    200,
    {
      status: "ok",
      signal,
      payment: {
        verified: true,
        mode: input.paymentReference.mode,
        payer: verification.payer ?? input.paymentReference.payer,
        accepted,
        verification,
        settlement,
        transactionHash: settlement.transaction
      }
    },
    {
      "Payment-Response": encodePaymentResponseHeader(settlement as unknown as SettleResponse),
      "X-Payment-Response": encodePaymentResponseHeader(settlement as unknown as SettleResponse)
    }
  );
}

function createSignal(input: PaidMsosSignalRequest): MsosSignal {
  return {
    market: input.market,
    asset: input.asset,
    decision: "BUY",
    confidence: 0.68,
    estimatedEdge: 0.08,
    referencePrice: input.referencePrice,
    reasons: ["paid MSOS signal unlocked by x402 v2 payment"],
    generatedAt: "2026-07-25T00:04:00.000Z"
  };
}

function createMalformedSignal(input: PaidMsosSignalRequest): JsonObject {
  return {
    market: input.market,
    asset: input.asset,
    decision: "BUY",
    confidence: 0.68,
    referencePrice: input.referencePrice,
    reasons: ["malformed test fixture omits estimatedEdge"],
    generatedAt: "2026-07-25T00:04:00.000Z"
  };
}

function writePaymentRequired(response: ServerResponse, paymentRequirement: MonadX402PaymentRequirement, error?: string): void {
  const body: MonadX402PaymentRequirement = error ? { ...paymentRequirement, error } : paymentRequirement;
  writeJson(
    response,
    402,
    { status: "payment_required", paymentRequirement: body },
    {
      "Payment-Required": encodePaymentRequiredHeader(body as unknown as PaymentRequired),
      "X-Payment-Required": encodePaymentRequiredHeader(body as unknown as PaymentRequired)
    }
  );
}

async function readJson(request: IncomingMessage): Promise<JsonValue> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as JsonValue;
}

function writeJson(
  response: ServerResponse,
  statusCode: number,
  body: JsonValue,
  headers: Record<string, string> = {}
): void {
  response.writeHead(statusCode, { "content-type": "application/json", ...headers });
  response.end(JSON.stringify(body));
}

function isExpectedAcceptedPayment(value: MonadX402AcceptedPayment, payTo: string): boolean {
  return (
    value.scheme === "exact" &&
    value.network === MONAD_X402_NETWORK &&
    value.amount === MSOS_SIGNAL_AMOUNT_ATOMIC &&
    value.asset.toLowerCase() === MONAD_USDC_TESTNET_ADDRESS.toLowerCase() &&
    value.payTo.toLowerCase() === payTo.toLowerCase() &&
    value.extra.name === "USDC" &&
    value.extra.version === "2"
  );
}

function isPaidMsosSignalRequest(value: JsonValue): value is PaidMsosSignalRequest {
  return (
    isRecord(value) &&
    typeof value.market === "string" &&
    value.market.length > 0 &&
    typeof value.asset === "string" &&
    value.asset.length > 0 &&
    typeof value.referencePrice === "number" &&
    Number.isFinite(value.referencePrice) &&
    (value.paymentReference === null || isMonadPaymentReference(value.paymentReference))
  );
}

function isMonadPaymentReference(value: JsonValue): value is MonadPaymentReference {
  return (
    isRecord(value) &&
    (value.mode === "live" || value.mode === "mock") &&
    typeof value.payer === "string" &&
    isPaymentPayload(value.paymentPayload) &&
    isAcceptedPayment(value.accepted) &&
    typeof value.createdAt === "string"
  );
}

function isPaymentPayload(value: JsonValue): value is MonadX402PaymentPayload {
  return isRecord(value) && value.x402Version === MONAD_X402_VERSION && isAcceptedPayment(value.accepted);
}

function isAcceptedPayment(value: JsonValue): value is MonadX402AcceptedPayment {
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

function mockPayToAddress(): string {
  return "0x0000000000000000000000000000000000000abc";
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
