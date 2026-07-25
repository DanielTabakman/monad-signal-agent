import { AgentRuntime, ToolRegistry } from "../core/index.js";
import { msosMarginDemoProgram, priceReportSmokeTestProgram } from "../programs/index.js";
import { createCachedMarketDataTool, createMsosSignalStubTool, createPaperTradingTool } from "../tools/index.js";

const registry = new ToolRegistry();
registry.register(createCachedMarketDataTool());
registry.register(createMsosSignalStubTool());
const paperTrading = createPaperTradingTool();
registry.register(paperTrading.tool);

const runtime = new AgentRuntime(registry);

const marginDemo = await runtime.run(msosMarginDemoProgram, {
  market: "crypto",
  asset: "SOL",
  safetyMargin: 0.05
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
