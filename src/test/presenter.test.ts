import { describe, expect, it } from "vitest";
import { backupDemoEvidence } from "../demo/backup-demo-evidence.js";
import { formatPresenterLines } from "../demo/presenter-output.js";

describe("presenter output", () => {
  it("shows the complete paid-signal-to-paper-action narrative", () => {
    const output = formatPresenterLines(backupDemoEvidence, "RECORDED SUCCESS").join("\n");

    expect(output).toContain("PROGRAM LOADED: MSOS Margin Agent");
    expect(output).toContain("PAID INTELLIGENCE: 0.001 USDC");
    expect(output).toContain("MONAD x402 PAYMENT: SIGNED AND SETTLED ✓");
    expect(output).toContain("RPC VERIFICATION: CONFIRMED ✓");
    expect(output).toContain("SIGNAL: BUY — estimated edge 8%");
    expect(output).toContain("SAFETY MARGIN: 5% — PASSED ✓");
    expect(output).toContain("FINAL ACTION: PAPER BUY");
  });

  it("contains only sanitized public evidence", () => {
    const serialized = JSON.stringify(backupDemoEvidence);

    expect(serialized).not.toContain("privateKey");
    expect(serialized).not.toContain("signature");
    expect(serialized).not.toContain("nonce");
    expect(serialized).not.toContain("MONAD_PAYER_PRIVATE_KEY");
  });
});
