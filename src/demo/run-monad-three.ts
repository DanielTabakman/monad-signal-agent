import { mkdir, writeFile } from "node:fs/promises";
import { runLiveMonadDemo } from "./live-monad-demo.js";
import { printPresenterEvidence } from "./presenter-output.js";

const runCount = 3;
const sanitizedRuns: Array<Record<string, unknown>> = [];

for (let index = 1; index <= runCount; index += 1) {
  console.log(`\nExecuting live proof run ${index}/${runCount}…`);
  const evidence = await runLiveMonadDemo();
  printPresenterEvidence(evidence, `LIVE RUN ${index}/${runCount}`);

  sanitizedRuns.push({
    run: index,
    completedAt: new Date().toISOString(),
    payerAddress: evidence.payerAddress,
    payToAddress: evidence.payToAddress,
    quotedUSDCAmount: evidence.quotedUSDCAmount,
    facilitatorVerificationResponse: evidence.facilitatorVerificationResponse,
    facilitatorSettlementResponse: evidence.facilitatorSettlementResponse,
    settlementTransactionHash: evidence.settlementTransactionHash,
    rpcVerification: evidence.rpcVerification,
    asset: evidence.asset,
    estimatedEdge: evidence.estimatedEdge,
    safetyMargin: evidence.safetyMargin,
    finalAction: evidence.action
  });
}

const evidenceDirectory = ".demo-evidence";
const evidencePath = `${evidenceDirectory}/three-live-runs-${fileTimestamp()}.json`;
await mkdir(evidenceDirectory, { recursive: true });
await writeFile(
  evidencePath,
  `${JSON.stringify({ passed: true, runCount, runs: sanitizedRuns }, null, 2)}\n`,
  "utf8"
);

console.log(`\nTHREE-RUN RELIABILITY GATE: PASSED ✓`);
console.log(`Sanitized evidence written to ${evidencePath}`);
console.log("No private keys, signatures, nonces, or .env.local values were written.");

function fileTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
