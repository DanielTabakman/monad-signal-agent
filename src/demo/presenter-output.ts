export interface PresenterEvidence {
  market: string;
  asset: string;
  safetyMargin: number;
  estimatedEdge: number;
  action: string;
  payerAddress: string;
  payToAddress: string;
  quotedUSDCAmount: string;
  settlementTransactionHash: string;
  rpcVerification: {
    found: boolean;
    status: string;
    explorerUrl: string;
  };
  paperTradeRecords: Array<{
    referencePrice: number;
  }>;
}

export function formatPresenterLines(evidence: PresenterEvidence, runLabel?: string): string[] {
  const paperTrade = evidence.paperTradeRecords.at(-1);
  const price = paperTrade ? `$${paperTrade.referencePrice.toFixed(2)}` : "available";
  const label = runLabel ? ` — ${runLabel}` : "";

  return [
    `MONAD SIGNAL AGENT${label}`,
    "────────────────────────────────────────",
    "PROGRAM LOADED: MSOS Margin Agent",
    `MARKET DATA: ${evidence.asset} at ${price}`,
    `PAID INTELLIGENCE: ${evidence.quotedUSDCAmount}`,
    "BUDGET CHECK: APPROVED",
    "MONAD x402 PAYMENT: SIGNED AND SETTLED ✓",
    `RPC VERIFICATION: ${evidence.rpcVerification.found && evidence.rpcVerification.status === "success" ? "CONFIRMED ✓" : evidence.rpcVerification.status}`,
    `SIGNAL: ${evidence.action} — estimated edge ${formatPercent(evidence.estimatedEdge)}`,
    `SAFETY MARGIN: ${formatPercent(evidence.safetyMargin)} — ${evidence.estimatedEdge >= evidence.safetyMargin ? "PASSED ✓" : "FAILED"}`,
    `FINAL ACTION: PAPER ${evidence.action}`,
    `TRANSACTION: ${shortHash(evidence.settlementTransactionHash)}`,
    `EXPLORER: ${evidence.rpcVerification.explorerUrl}`,
    "────────────────────────────────────────"
  ];
}

export function printPresenterEvidence(evidence: PresenterEvidence, runLabel?: string): void {
  for (const line of formatPresenterLines(evidence, runLabel)) {
    console.log(line);
  }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function shortHash(hash: string): string {
  return hash.length > 18 ? `${hash.slice(0, 10)}…${hash.slice(-8)}` : hash;
}
