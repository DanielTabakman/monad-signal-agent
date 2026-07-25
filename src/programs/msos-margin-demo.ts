import type { ExecutionContext, JsonObject, Program } from "../core/index.js";
import type { MarketSnapshot } from "../tools/market-data/cached-market-data-tool.js";
import type { MsosSignal, SignalDecision } from "../tools/msos-signal/msos-signal-stub-tool.js";
import type { PaperTradeRecord } from "../tools/paper-trading/paper-trading-tool.js";

export interface MsosMarginDemoConfig extends JsonObject {
  market: string;
  asset: string;
  safetyMargin: number;
}

export interface MsosMarginDemoResult extends JsonObject {
  market: string;
  asset: string;
  safetyMargin: number;
  estimatedEdge: number;
  action: SignalDecision;
  paperTradeId: string;
}

export const msosMarginDemoProgram: Program<MsosMarginDemoConfig, MsosMarginDemoResult> = {
  id: "msos-margin-demo",
  async run(config: MsosMarginDemoConfig, context: ExecutionContext): Promise<MsosMarginDemoResult> {
    const marketSnapshot = await context.callTool<MarketSnapshot>("market-data", {
      market: config.market,
      asset: config.asset
    });

    const signal = await context.callTool<MsosSignal>("msos-signal", {
      market: config.market,
      asset: config.asset,
      referencePrice: marketSnapshot.price
    });

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
      paperTradeId: paperTrade.id
    };
  }
};

export function decidePaperTradeAction(signal: MsosSignal, safetyMargin: number): SignalDecision {
  if (signal.estimatedEdge >= safetyMargin) {
    return signal.decision;
  }

  return "NO_TRADE";
}
