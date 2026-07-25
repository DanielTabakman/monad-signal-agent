import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { JsonObject, JsonValue } from "../../core/index.js";
import type { MsosSignal } from "./msos-signal-stub-tool.js";

export interface PaymentRequirement extends JsonObject {
  id: string;
  network: "monad-testnet";
  protocol: "monad-hackathon-test-reference";
  amountAtomic: string;
  currency: "MON";
  recipient: string;
  memo: string;
  expiresAt: string;
  verificationMethod: string;
}

export interface MonadPaymentReference extends JsonObject {
  paymentReference: string;
  network: "monad-testnet";
  protocol: "monad-hackathon-test-reference";
  amountAtomic: string;
  currency: "MON";
  transactionHash: string;
  verificationUrl: string;
  submittedAt: string;
}

export interface PaidMsosSignalRequest extends JsonObject {
  market: string;
  asset: string;
  referencePrice: number;
  paymentReference: MonadPaymentReference | null;
}

export interface PaidMsosSignalPaymentRequired extends JsonObject {
  status: "payment_required";
  paymentRequirement: PaymentRequirement;
}

export interface PaidMsosSignalOk extends JsonObject {
  status: "ok";
  signal: JsonValue;
  payment: {
    verified: true;
    paymentReference: string;
    transactionHash: string;
    verificationUrl: string;
  };
}

export type PaidMsosSignalResponse = PaidMsosSignalPaymentRequired | PaidMsosSignalOk;

export interface PaidMsosSignalEndpoint {
  readonly url: string;
  close(): Promise<void>;
}

export interface PaidMsosSignalEndpointOptions {
  readonly malformedSignal?: boolean;
}

const requirement: PaymentRequirement = {
  id: "msos-sol-signal-2026-07-25",
  network: "monad-testnet",
  protocol: "monad-hackathon-test-reference",
  amountAtomic: "10000000000000000",
  currency: "MON",
  recipient: "0x0000000000000000000000000000000000000abc",
  memo: "MSOS SOL signal access",
  expiresAt: "2026-07-25T23:59:59.000Z",
  verificationMethod: "deterministic-local-testnet-reference"
};

export function getMsosPaymentRequirement(): PaymentRequirement {
  return requirement;
}

export async function startPaidMsosSignalEndpoint(
  options: PaidMsosSignalEndpointOptions = {}
): Promise<PaidMsosSignalEndpoint> {
  const server = createServer((request, response) => {
    void handleRequest(request, response, options);
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

export function createMonadPaymentReference(input: {
  payer: string;
  requirement: PaymentRequirement;
}): MonadPaymentReference {
  const digest = createHash("sha256")
    .update(`${input.payer}:${input.requirement.id}:${input.requirement.amountAtomic}`)
    .digest("hex");
  const paymentReference = `monad-test-ref_${digest.slice(0, 32)}`;

  return {
    paymentReference,
    network: input.requirement.network,
    protocol: input.requirement.protocol,
    amountAtomic: input.requirement.amountAtomic,
    currency: input.requirement.currency,
    transactionHash: `0x${digest}`,
    verificationUrl: `https://testnet.monad.xyz/tx/0x${digest}`,
    submittedAt: "2026-07-25T00:03:00.000Z"
  };
}

export function verifyMonadPaymentReference(reference: MonadPaymentReference): boolean {
  return (
    reference.network === requirement.network &&
    reference.protocol === requirement.protocol &&
    reference.amountAtomic === requirement.amountAtomic &&
    reference.currency === requirement.currency &&
    reference.paymentReference.startsWith("monad-test-ref_") &&
    /^0x[0-9a-f]{64}$/.test(reference.transactionHash) &&
    reference.verificationUrl.endsWith(reference.transactionHash)
  );
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: PaidMsosSignalEndpointOptions
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

  if (!input.paymentReference || !verifyMonadPaymentReference(input.paymentReference)) {
    writeJson(response, 402, { status: "payment_required", paymentRequirement: requirement });
    return;
  }

  writeJson(response, 200, {
    status: "ok",
    signal: options.malformedSignal ? createMalformedSignal(input) : createSignal(input),
    payment: {
      verified: true,
      paymentReference: input.paymentReference.paymentReference,
      transactionHash: input.paymentReference.transactionHash,
      verificationUrl: input.paymentReference.verificationUrl
    }
  });
}

function createSignal(input: PaidMsosSignalRequest): MsosSignal {
  return {
    market: input.market,
    asset: input.asset,
    decision: "BUY",
    confidence: 0.68,
    estimatedEdge: 0.08,
    referencePrice: input.referencePrice,
    reasons: ["paid MSOS signal unlocked by Monad testnet payment reference"],
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

async function readJson(request: IncomingMessage): Promise<JsonValue> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as JsonValue;
}

function writeJson(response: ServerResponse, statusCode: number, body: JsonValue): void {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
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
    typeof value.paymentReference === "string" &&
    typeof value.network === "string" &&
    typeof value.protocol === "string" &&
    typeof value.amountAtomic === "string" &&
    typeof value.currency === "string" &&
    typeof value.transactionHash === "string" &&
    typeof value.verificationUrl === "string" &&
    typeof value.submittedAt === "string"
  );
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
