import { backupDemoEvidence } from "./backup-demo-evidence.js";
import { formatPresenterLines } from "./presenter-output.js";

console.log("OFFLINE BACKUP REPLAY — SANITIZED REAL TESTNET EVIDENCE");
console.log("Use this only if the live facilitator, RPC, or internet is unavailable.\n");

for (const line of formatPresenterLines(backupDemoEvidence, "RECORDED SUCCESS")) {
  console.log(line);
  await delay(220);
}

console.log("\nThis replay references a previously completed real Monad Testnet settlement.");
console.log(`Payer: ${backupDemoEvidence.payerAddress}`);
console.log(`Pay-to: ${backupDemoEvidence.payToAddress}`);
console.log("It does not perform a new payment.");

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
