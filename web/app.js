const elements = {
  programId: document.querySelector("#program-id"),
  market: document.querySelector("#market"),
  asset: document.querySelector("#asset"),
  safetyMargin: document.querySelector("#safety-margin"),
  signalBudget: document.querySelector("#signal-budget"),
  programSource: document.querySelector("#program-source"),
  resetScript: document.querySelector("#reset-script"),
  runButton: document.querySelector("#run-button"),
  replayButton: document.querySelector("#replay-button"),
  clearTrace: document.querySelector("#clear-trace"),
  walletStatus: document.querySelector("#wallet-status"),
  runMode: document.querySelector("#run-mode"),
  heroState: document.querySelector("#hero-state"),
  heroKicker: document.querySelector("#hero-kicker"),
  heroTitle: document.querySelector("#hero-title"),
  heroSubtitle: document.querySelector("#hero-subtitle"),
  price: document.querySelector("#metric-price"),
  source: document.querySelector("#metric-source"),
  payment: document.querySelector("#metric-payment"),
  paymentState: document.querySelector("#metric-payment-state"),
  edge: document.querySelector("#metric-edge"),
  margin: document.querySelector("#metric-margin"),
  action: document.querySelector("#metric-action"),
  actionCard: document.querySelector(".action-card"),
  transactionCard: document.querySelector("#transaction-card"),
  transactionHash: document.querySelector("#transaction-hash"),
  transactionLink: document.querySelector("#transaction-link"),
  traceOutput: document.querySelector("#trace-output")
};

const pipelineSteps = [...document.querySelectorAll(".pipeline-step")];
const paymentControls = [...document.querySelectorAll(".payment-control")];
let busy = false;
let progressTimer = null;

for (const input of [elements.programId, elements.market, elements.asset, elements.safetyMargin, elements.signalBudget]) {
  input.addEventListener("change", () => {
    syncProgramControls();
    regenerateProgramSource();
  });
}

elements.resetScript.addEventListener("click", regenerateProgramSource);
elements.runButton.addEventListener("click", runAgent);
elements.replayButton.addEventListener("click", replayProof);
elements.clearTrace.addEventListener("click", clearTrace);

syncProgramControls();
regenerateProgramSource();
checkHealth();

async function checkHealth() {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Health check failed");
    }

    elements.walletStatus.textContent = data.walletConfigured ? "Wallet configured" : "Wallet setup required";
    elements.walletStatus.classList.toggle("ready", data.walletConfigured);
    elements.walletStatus.classList.toggle("warning", !data.walletConfigured);
  } catch {
    elements.walletStatus.textContent = "Server unavailable";
    elements.walletStatus.classList.add("warning");
  }
}

function syncProgramControls() {
  const isPaidProgram = elements.programId.value === "msos-margin-demo";
  for (const control of paymentControls) {
    control.style.opacity = isPaidProgram ? "1" : "0.38";
    const input = control.querySelector("select");
    if (input) input.disabled = !isPaidProgram;
  }

  elements.runButton.querySelector("span").textContent = isPaidProgram ? "Run live agent" : "Run local program";
}

function getConfig() {
  return {
    programId: elements.programId.value,
    market: elements.market.value,
    asset: elements.asset.value,
    safetyMargin: Number(elements.safetyMargin.value),
    maxSignalCostAtomic: elements.signalBudget.value
  };
}

function regenerateProgramSource() {
  const config = getConfig();

  if (config.programId === "price-report-smoke-test") {
    elements.programSource.value = [
      "export default defineProgram({",
      '  id: "price-report-smoke-test",',
      `  market: "${config.market}",`,
      `  asset: "${config.asset}",`,
      "  async run({ tools }) {",
      "    return tools.marketData.get({ market, asset });",
      "  }",
      "});"
    ].join("\n");
    return;
  }

  elements.programSource.value = [
    "export default defineProgram({",
    '  id: "msos-margin-demo",',
    `  market: "${config.market}",`,
    `  asset: "${config.asset}",`,
    `  maxSignalCostAtomic: "${config.maxSignalCostAtomic}",`,
    `  safetyMargin: ${config.safetyMargin.toFixed(2)},`,
    "  async run({ tools, limits }) {",
    "    const market = await tools.marketData.get({ asset });",
    "    const signal = await tools.msosSignal.purchase({",
    "      referencePrice: market.price,",
    '      paymentRail: "Monad x402",',
    "      maxCost: limits.maxSignalCostAtomic",
    "    });",
    "",
    "    return signal.estimatedEdge >= safetyMargin",
    "      ? tools.paperTrading.record(signal.decision)",
    '      : tools.paperTrading.record("NO_TRADE");',
    "  }",
    "});"
  ].join("\n");
}

async function runAgent() {
  if (busy) return;
  const config = getConfig();
  setBusy(true);
  beginRunningState(config.programId === "msos-margin-demo" ? "LIVE X402" : "LOCAL");
  startProgressAnimation(config.programId === "msos-margin-demo");

  try {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Agent run failed");
    }

    await renderSuccessfulRun(data);
  } catch (error) {
    renderError(error instanceof Error ? error.message : "Agent run failed");
  } finally {
    stopProgressAnimation();
    setBusy(false);
  }
}

async function replayProof() {
  if (busy) return;
  setBusy(true);
  beginRunningState("VERIFIED REPLAY");
  startProgressAnimation(true);

  try {
    const response = await fetch("/api/replay", { method: "POST" });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Replay failed");
    }

    elements.programSource.value = data.programSource;
    await renderSuccessfulRun(data);
  } catch (error) {
    renderError(error instanceof Error ? error.message : "Replay failed");
  } finally {
    stopProgressAnimation();
    setBusy(false);
  }
}

function beginRunningState(mode) {
  clearTrace();
  resetPipeline();
  resetMetrics();
  elements.heroState.className = "hero-state running";
  elements.heroKicker.textContent = mode === "VERIFIED REPLAY" ? "Loading verified evidence" : "Runtime executing";
  elements.heroTitle.textContent = mode === "LOCAL" ? "Running the selected program…" : "Purchasing intelligence through Monad…";
  elements.heroSubtitle.textContent =
    mode === "VERIFIED REPLAY"
      ? "This fallback is clearly labelled and does not send a new payment."
      : "The runtime is loading registered tools, enforcing limits, and recording every decision.";
  elements.runMode.textContent = mode;
  elements.runMode.className = mode === "VERIFIED REPLAY" ? "run-mode replay" : "run-mode live";
  setPipelineState(0, "active");
  appendTrace("program_started", "Loading registered program template", "normal");
}

function startProgressAnimation(hasPayment) {
  stopProgressAnimation();
  let index = 0;
  const order = hasPayment ? [0, 1, 2, 3, 4] : [0, 1, 3, 4];

  progressTimer = window.setInterval(() => {
    const current = order[Math.min(index, order.length - 1)];
    for (const step of pipelineSteps) {
      step.classList.remove("active");
    }
    for (let i = 0; i < order.length; i += 1) {
      if (i < index) setPipelineState(order[i], "complete");
    }
    setPipelineState(current, "active");
    index = Math.min(index + 1, order.length - 1);
  }, 850);
}

function stopProgressAnimation() {
  if (progressTimer !== null) {
    window.clearInterval(progressTimer);
    progressTimer = null;
  }
}

async function renderSuccessfulRun(data) {
  stopProgressAnimation();
  const isReplay = data.mode === "replay";
  const isLocal = data.mode === "local";
  const evidence = data.evidence;

  for (let index = 0; index < pipelineSteps.length; index += 1) {
    if (isLocal && index === 2) {
      setPipelineState(index, "complete");
      pipelineSteps[index].querySelector("small").textContent = "Not required";
    } else {
      setPipelineState(index, "complete");
    }
    await pause(110);
  }

  elements.heroState.className = "hero-state success";
  elements.heroKicker.textContent = isReplay ? "Verified replay complete" : "Program completed";
  elements.heroTitle.textContent = resultHeadline(evidence, isLocal);
  elements.heroSubtitle.textContent = isReplay
    ? data.replayNotice
    : isLocal
      ? "The second registered program ran through the same generic runtime without changing the runtime core."
      : "The payment settled, the signal was validated, the safety rule ran, and the final paper action was recorded.";
  elements.runMode.textContent = isReplay ? "REPLAY COMPLETE" : isLocal ? "LOCAL COMPLETE" : "LIVE CONFIRMED";
  elements.runMode.className = isReplay ? "run-mode replay" : "run-mode live";

  renderMetrics(evidence, isLocal, isReplay);
  renderTransaction(evidence);
  await renderTrace(data.trace || []);
}

function resultHeadline(evidence, isLocal) {
  if (isLocal) return `${evidence.asset} price reported at $${Number(evidence.price).toFixed(2)}.`;
  if (evidence.action === "NO_TRADE") return "The agent paid for the signal and safely abstained.";
  return `The agent completed a paper ${evidence.action}.`;
}

function renderMetrics(evidence, isLocal, isReplay) {
  const record = Array.isArray(evidence.paperTradeRecords) ? evidence.paperTradeRecords.at(-1) : null;
  const price = isLocal ? evidence.price : record?.referencePrice;
  elements.price.textContent = typeof price === "number" ? `$${price.toFixed(2)}` : "Available";
  elements.source.textContent = isLocal ? `${evidence.source} market-data tool` : "Cached market-data tool";

  elements.payment.textContent = evidence.quotedUSDCAmount || "—";
  elements.paymentState.textContent = isLocal
    ? "No paid intelligence requested"
    : isReplay
      ? "Previously settled on Monad"
      : "Signed, settled, and RPC verified";

  elements.edge.textContent = typeof evidence.estimatedEdge === "number" ? `${Math.round(evidence.estimatedEdge * 100)}%` : "—";
  elements.margin.textContent =
    typeof evidence.safetyMargin === "number"
      ? `${Math.round(evidence.safetyMargin * 100)}% safety margin`
      : "No signal rule required";

  elements.action.textContent = isLocal ? "REPORT" : evidence.action || "—";
  elements.actionCard.classList.remove("buy", "no-trade");
  if (evidence.action === "NO_TRADE") elements.actionCard.classList.add("no-trade");
  if (evidence.action === "BUY" || evidence.action === "SELL") elements.actionCard.classList.add("buy");
}

function renderTransaction(evidence) {
  const hash = evidence.settlementTransactionHash;
  const explorerUrl = evidence.rpcVerification?.explorerUrl;
  if (!hash || !explorerUrl) {
    elements.transactionCard.classList.add("hidden");
    return;
  }

  elements.transactionHash.textContent = hash;
  elements.transactionLink.href = explorerUrl;
  elements.transactionCard.classList.remove("hidden");
}

async function renderTrace(trace) {
  elements.traceOutput.innerHTML = "";
  if (!Array.isArray(trace) || trace.length === 0) {
    appendTrace("program_completed", "Program returned without trace events", "success");
    return;
  }

  for (const event of trace) {
    const summary = summarizeEvent(event);
    appendTrace(event.type || "event", summary.message, summary.tone, event.timestamp);
    await pause(60);
  }
  elements.traceOutput.scrollTop = elements.traceOutput.scrollHeight;
}

function summarizeEvent(event) {
  switch (event.type) {
    case "program_started":
      return { message: `Loaded ${event.programId || "registered program"}`, tone: "normal" };
    case "tool_call_started":
      return { message: `Calling tool: ${event.toolName || "registered tool"}`, tone: "normal" };
    case "tool_call_succeeded":
      return { message: `${event.toolName || "Tool"} succeeded`, tone: "success" };
    case "payment_required":
      return { message: "Paid MSOS intelligence returned an x402 requirement", tone: "warning" };
    case "payment_approved":
      return { message: "Budget limit approved the quoted signal cost", tone: "success" };
    case "payment_submitted":
      return { message: "Signed x402 authorization submitted", tone: "normal" };
    case "payment_verified":
      return { message: "Monad facilitator verified and settled payment", tone: "success" };
    case "signal_validation":
      return { message: event.valid === false ? "Signal validation failed" : "Signal schema validated", tone: event.valid === false ? "error" : "success" };
    case "decision":
      return { message: event.label === "safety-margin-comparison" ? "Compared estimated edge with safety margin" : "Program decision recorded", tone: "normal" };
    case "program_completed":
      return { message: "Program completed with a bounded result", tone: "success" };
    case "program_failed":
      return { message: "Program stopped safely", tone: "error" };
    default:
      return { message: formatEventName(event.type || "Runtime event"), tone: "normal" };
  }
}

function renderError(message) {
  stopProgressAnimation();
  elements.heroState.className = "hero-state error";
  elements.heroKicker.textContent = "Runtime stopped safely";
  elements.heroTitle.textContent = message.includes("quoted cost exceeds")
    ? "The signal cost exceeded the configured budget."
    : "The agent did not complete the run.";
  elements.heroSubtitle.textContent = message;
  elements.runMode.textContent = "SAFE FAILURE";
  elements.runMode.className = "run-mode error";
  appendTrace("program_failed", message, "error");
  for (const step of pipelineSteps) step.classList.remove("active");
}

function resetMetrics() {
  elements.price.textContent = "—";
  elements.source.textContent = "Waiting for data";
  elements.payment.textContent = "—";
  elements.paymentState.textContent = "No payment submitted";
  elements.edge.textContent = "—";
  elements.margin.textContent = "Waiting for signal";
  elements.action.textContent = "—";
  elements.actionCard.classList.remove("buy", "no-trade");
  elements.transactionCard.classList.add("hidden");
}

function resetPipeline() {
  for (const step of pipelineSteps) {
    step.classList.remove("active", "complete");
  }
  pipelineSteps[2].querySelector("small").textContent = "Monad x402";
}

function setPipelineState(index, state) {
  const step = pipelineSteps[index];
  if (!step) return;
  if (state === "complete") step.classList.remove("active");
  step.classList.add(state);
}

function clearTrace() {
  elements.traceOutput.innerHTML = '<div class="trace-empty">No events yet. Run the agent to produce an auditable trace.</div>';
}

function appendTrace(type, message, tone = "normal", timestamp) {
  const empty = elements.traceOutput.querySelector(".trace-empty");
  if (empty) empty.remove();

  const row = document.createElement("div");
  row.className = `trace-row ${tone}`;
  const time = timestamp ? new Date(timestamp) : new Date();
  const safeTime = Number.isNaN(time.getTime()) ? "--:--:--" : time.toLocaleTimeString([], { hour12: false });
  row.innerHTML = `
    <span class="trace-time">${escapeHtml(safeTime)}</span>
    <span class="trace-symbol">${tone === "success" ? "✓" : tone === "error" ? "×" : tone === "warning" ? "!" : "›"}</span>
    <span><strong>${escapeHtml(formatEventName(type))}</strong> <span class="trace-detail">${escapeHtml(message)}</span></span>
  `;
  elements.traceOutput.appendChild(row);
  elements.traceOutput.scrollTop = elements.traceOutput.scrollHeight;
}

function setBusy(value) {
  busy = value;
  elements.runButton.disabled = value;
  elements.replayButton.disabled = value;
  elements.programId.disabled = value;
  elements.safetyMargin.disabled = value || elements.programId.value !== "msos-margin-demo";
  elements.signalBudget.disabled = value || elements.programId.value !== "msos-margin-demo";
}

function formatEventName(value) {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pause(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
