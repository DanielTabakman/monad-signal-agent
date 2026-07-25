import type { ExecutionContext, JsonObject, JsonValue, Program } from "../core/index.js";
import type { MarketSnapshot } from "../tools/market-data/cached-market-data-tool.js";
import type { MonadPaymentReceipt, PaidMsosSignalResponse, PaymentRequirement } from "../tools/index.js";
import type { MsosSignal, SignalDecision } from "../tools/msos-signal/msos-signal-stub-tool.js";
import type { PaperTradeRecord } from "../tools/paper-trading/paper-trading-tool.js";

export interface MsosMarginDemoConfig extends JsonObject {
  market: string;
  asset: string;
  safetyMargin: number;
  maxSignalCostAtomic: string;
  payer: string;
}

export interface MsosMarginDemoResult extends JsonObject {
  market: string;
  asset: string;
  safetyMargin: number;
  estimatedEdge: number;
  action: SignalDecision;
  paperTradeId: string;
  paymentMode: "live" | "mock";
  payer: string;
  payTo: string;
  quotedAmountAtomic: string;
  verification: JsonObject;
  settlement: JsonObject;
  transactionHash: string;
}

export const msosMarginDemoProgram: Program<MsosMarginDemoConfig, MsosMarginDemoResult> = {
  id: "msos-margin-demo",
  async run(config: MsosMarginDemoConfig, context: ExecutionContext): Promise<MsosMarginDemoResult> {
    const marketSnapshot = await context.callTool<MarketSnapshot>("market-data", {
      market: config.market,
      asset: config.asset
    });

    const unpaidSignalResponse = await context.callTool<PaidMsosSignalResponse>("msos-signal", {
      market: config.market,
      asset: config.asset,
      referencePrice: marketSnapshot.price,
      paymentReference: null
    });

    if (unpaidSignalResponse.status !== "payment_required") {
      throw new Error("Expected MSOS signal request to require payment");
    }

    const paymentRequirement = unpaidSignalResponse.paymentRequirement;
    const quotedPayment = getQuotedPayment(paymentRequirement);
    context.recordEvent({
      type: "payment_required",
      toolName: "msos-signal",
      requirement: paymentRequirement
    });

    if (!isWithinBudget(paymentRequirement, config.maxSignalCostAtomic)) {
      context.recordEvent({
        type: "payment_rejected",
        toolName: "monad-payment",
        details: {
          quotedCostAtomic: quotedPayment.amount,
          maxSignalCostAtomic: config.maxSignalCostAtomic,
          reason: "quoted signal cost exceeds configured maximum budget"
        }
      });
      throw new Error("MSOS signal payment rejected: quoted cost exceeds configured maximum budget");
    }

    context.recordEvent({
      type: "payment_approved",
      toolName: "monad-payment",
      details: {
        quotedCostAtomic: quotedPayment.amount,
        maxSignalCostAtomic: config.maxSignalCostAtomic,
        network: quotedPayment.network,
        scheme: quotedPayment.scheme
      }
    });

    const paymentReceipt = await context.callTool<MonadPaymentReceipt>("monad-payment", {
      payer: config.payer,
      paymentRequirement
    });
    context.recordEvent({
      type: "payment_submitted",
      toolName: "monad-payment",
      reference: paymentReceipt
    });

    const paidSignalResponse = await context.callTool<PaidMsosSignalResponse>("msos-signal", {
      market: config.market,
      asset: config.asset,
      referencePrice: marketSnapshot.price,
      paymentReference: paymentReceipt
    });

    if (paidSignalResponse.status !== "ok") {
      throw new Error("MSOS signal payment was not accepted by the endpoint");
    }

    context.recordEvent({
      type: "payment_verified",
      toolName: "msos-signal",
      reference: paidSignalResponse.payment
    });

    const signalValidation = validateMsosSignal(paidSignalResponse.signal, config, marketSnapshot.price);
    context.recordEvent({
      type: "signal_validation",
      toolName: "msos-signal",
      valid: signalValidation.valid,
      details: signalValidation
    });

    if (!signalValidation.valid) {
      throw new Error(`Invalid MSOS signal: ${signalValidation.reason}`);
    }

    const signal = paidSignalResponse.signal as MsosSignal;
    const action = decidePaperTradeAction(signal, config.safetyMargin);
    context.recordDecision("safety-margin-comparison", {
      estimatedEdge: signal.estimatedEdge,
      safetyMargin: config.safetyMargin,
      clearsMargin: action !== "NO_TRADE",
      signalDecision: signal.decision,
      selectedAction: action
    });

    const paperTrade = await context.callTool<PaperTradeRecord>("paper-trading", {
      market: config.market,
      asset: config.asset,
      action,
      referencePrice: signal.referencePrice,
      reason:
        action === "NO_TRADE"
          ? "signal edge did not clear configured safety margin"
          : "signal edge cleared configured safety margin"
    });

    return {
      market: config.market,
      asset: config.asset,
      safetyMargin: config.safetyMargin,
      estimatedEdge: signal.estimatedEdge,
      action,
      paperTradeId: paperTrade.id,
      paymentMode: paidSignalResponse.payment.mode,
      payer: paidSignalResponse.payment.payer,
      payTo: paidSignalResponse.payment.accepted.payTo,
      quotedAmountAtomic: quotedPayment.amount,
      verification: paidSignalResponse.payment.verification,
      settlement: paidSignalResponse.payment.settlement,
      transactionHash: paidSignalResponse.payment.transactionHash
    };
  }
};

export function decidePaperTradeAction(signal: MsosSignal, safetyMargin: number): SignalDecision {
  if (signal.estimatedEdge >= safetyMargin) {
    return signal.decision;
  }

  return "NO_TRADE";
}

export function validateMsosSignal(
  value: JsonValue,
  config: Pick<MsosMarginDemoConfig, "market" | "asset">,
  referencePrice: number
): { valid: true; market: string; asset: string } | { valid: false; reason: string } {
  if (!isRecord(value)) {
    return { valid: false, reason: "signal is not an object" };
  }

  if (value.market !== config.market || value.asset !== config.asset) {
    return { valid: false, reason: "signal market or asset does not match request" };
  }

  if (!isSignalDecision(value.decision)) {
    return { valid: false, reason: "signal decision is invalid" };
  }

  if (typeof value.confidence !== "number" || value.confidence < 0 || value.confidence > 1) {
    return { valid: false, reason: "signal confidence is outside [0, 1]" };
  }

  if (typeof value.estimatedEdge !== "number" || !Number.isFinite(value.estimatedEdge)) {
    return { valid: false, reason: "signal estimatedEdge is missing or invalid" };
  }

  if (value.referencePrice !== referencePrice) {
    return { valid: false, reason: "signal referencePrice does not match market snapshot" };
  }

  if (!Array.isArray(value.reasons) || !value.reasons.every((reason) => typeof reason === "string")) {
    return { valid: false, reason: "signal reasons must be strings" };
  }

  if (typeof value.generatedAt !== "string" || value.generatedAt.length === 0) {
    return { valid: false, reason: "signal generatedAt is missing" };
  }

  return { valid: true, market: value.market, asset: value.asset };
}

function isWithinBudget(requirement: PaymentRequirement, maxSignalCostAtomic: string): boolean {
  return BigInt(getQuotedPayment(requirement).amount) <= BigInt(maxSignalCostAtomic);
}

function getQuotedPayment(requirement: PaymentRequirement): PaymentRequirement["accepts"][number] {
  const quotedPayment = requirement.accepts[0];
  if (!quotedPayment) {
    throw new Error("MSOS signal payment requirement did not include an accepted payment option");
  }

  return quotedPayment;
}

function isSignalDecision(value: JsonValue): value is SignalDecision {
  return value === "BUY" || value === "SELL" || value === "NO_TRADE";
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
