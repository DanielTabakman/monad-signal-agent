import type { PresenterEvidence } from "./presenter-output.js";

export const backupDemoEvidence: PresenterEvidence = {
  market: "crypto",
  asset: "SOL",
  safetyMargin: 0.05,
  estimatedEdge: 0.08,
  action: "BUY",
  payerAddress: "0xEa69e9862FA78b91CBe821203e92CA56570d097b",
  payToAddress: "0xC9f7948E9073E75D9292Be10EA70bcf98a498142",
  quotedUSDCAmount: "0.001 USDC",
  settlementTransactionHash: "0xad1b12fcce2351eb5a0e175f57989fc0d72c1db550b9d512cf517a58245d143d",
  rpcVerification: {
    found: true,
    status: "success",
    explorerUrl:
      "https://testnet.monadexplorer.com/tx/0xad1b12fcce2351eb5a0e175f57989fc0d72c1db550b9d512cf517a58245d143d"
  },
  paperTradeRecords: [
    {
      referencePrice: 182.42
    }
  ]
};
