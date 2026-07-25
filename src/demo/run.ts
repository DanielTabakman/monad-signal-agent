import { AgentRuntime, ToolRegistry } from "../core/index.js";
import { msosMarginDemoProgram, priceReportSmokeTestProgram } from "../programs/index.js";
import {
  createCachedMarketDataTool,
  createMonadPaymentTool,
  createPaidMsosSignalTool,
  createPaperTradingTool,
  startPaidMsosSignalEndpoint
} from "../tools/index.js";

const msosEndpoint = await startPaidMsosSignalEndpoint();
const registry = new ToolRegistry();
registry.register(createCachedMarketDataTool());
registry.register(createPaidMsosSignalTool({ endpointUrl: msosEndpoint.url }));
registry.register(createMonadPaymentTool());
const paperTrading = createPaperTradingTool();
registry.register(paperTrading.tool);

const runtime = new AgentRuntime(registry);

try {
  const marginDemo = await runtime.run(msosMarginDemoProgram, {
    market: "crypto",
    asset: "SOL",
    safetyMargin: 0.05,
    maxSignalCostAtomic: "10000000000000000",
    payer: "0x000000000000000000000000000000000000dEaD"
  });

  const priceReport = await runtime.run(priceReportSmokeTestProgram, {
    market: "crypto",
    asset: "SOL"
  });

  console.log(
    JSON.stringify(
      {
        marginDemo,
        priceReport,
        paperTradeRecords: paperTrading.records
      },
      null,
      2
    )
  );
} finally {
  await msosEndpoint.close();
}
