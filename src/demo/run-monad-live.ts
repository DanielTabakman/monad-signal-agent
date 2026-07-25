import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { AgentRuntime, ToolRegistry } from "../core/index.js";
import { msosMarginDemoProgram } from "../programs/index.js";
import {
  MONAD_FACILITATOR_URL,
  MONAD_USDC_TESTNET_ADDRESS,
  MONAD_X402_NETWORK,
  createCachedMarketDataTool,
  createMonadPaymentTool,
  createPaidMsosSignalTool,
  createPaperTradingTool,
  startPaidMsosSignalEndpoint
} from "../tools/index.js";
import { loadEnvLocal } from "./load-env-local.js";

await loadEnvLocal();

const env = readLiveEnv();
const payer = privateKeyToAccount(env.payerPrivateKey);

const msosEndpoint = await startPaidMsosSignalEndpoint({
  payTo: env.payToAddress,
  facilitatorUrl: env.facilitatorUrl
});

const registry = new ToolRegistry();
registry.register(createCachedMarketDataTool());
registry.register(createPaidMsosSignalTool({ endpointUrl: msosEndpoint.url }));
registry.register(createMonadPaymentTool({ mode: "live", payerPrivateKey: env.payerPrivateKey }));
const paperTrading = createPaperTradingTool();
registry.register(paperTrading.tool);

const runtime = new AgentRuntime(registry);

try {
  const result = await runtime.run(msosMarginDemoProgram, {
    market: "crypto",
    asset: "SOL",
    safetyMargin: 0.05,
    maxSignalCostAtomic: env.maxSignalCostAtomic,
    payer: payer.address
  });

  if (!result.ok || !result.result) {
    throw new Error(result.error ?? "Live Monad x402 demo failed without an error message");
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(result.result.transactionHash)) {
    throw new Error(`Settlement did not return a Monad transaction hash: ${result.result.transactionHash}`);
  }

  const rpcVerification = await verifyTransactionOnMonadRpc(env.rpcUrl, result.result.transactionHash as `0x${string}`);

  console.log(
    JSON.stringify(
      {
        payerAddress: payer.address,
        payToAddress: env.payToAddress,
        quotedUSDCAmount: formatUsdcAtomic(result.result.quotedAmountAtomic),
        facilitatorVerificationResponse: result.result.verification,
        facilitatorSettlementResponse: result.result.settlement,
        settlementTransactionHash: result.result.transactionHash,
        rpcVerification,
        agentExecutionTrace: result.trace,
        paperTradeRecords: paperTrading.records
      },
      null,
      2
    )
  );
} finally {
  await msosEndpoint.close();
}

function readLiveEnv(): {
  payerPrivateKey: `0x${string}`;
  payToAddress: `0x${string}`;
  facilitatorUrl: string;
  rpcUrl: string;
  maxSignalCostAtomic: string;
} {
  const required = [
    "MONAD_PAYER_PRIVATE_KEY",
    "MONAD_PAY_TO_ADDRESS",
    "MONAD_FACILITATOR_URL",
    "MONAD_NETWORK",
    "MONAD_TESTNET_USDC_ADDRESS",
    "MONAD_RPC_URL",
    "MONAD_MAX_SIGNAL_COST_ATOMIC"
  ] as const;

  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required live Monad x402 environment variables: ${missing.join(", ")}. Run npm run setup:monad-wallet first.`
    );
  }

  const payerPrivateKey = process.env.MONAD_PAYER_PRIVATE_KEY!;
  const payToAddress = process.env.MONAD_PAY_TO_ADDRESS!;
  const facilitatorUrl = process.env.MONAD_FACILITATOR_URL!;
  const network = process.env.MONAD_NETWORK!;
  const usdcAddress = process.env.MONAD_TESTNET_USDC_ADDRESS!;
  const rpcUrl = process.env.MONAD_RPC_URL!;
  const maxSignalCostAtomic = process.env.MONAD_MAX_SIGNAL_COST_ATOMIC!;

  if (!/^0x[0-9a-fA-F]{64}$/.test(payerPrivateKey)) {
    throw new Error("MONAD_PAYER_PRIVATE_KEY must be a 0x-prefixed 32-byte private key");
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(payToAddress)) {
    throw new Error("MONAD_PAY_TO_ADDRESS must be a 0x-prefixed EVM address");
  }

  if (facilitatorUrl !== MONAD_FACILITATOR_URL) {
    throw new Error(`MONAD_FACILITATOR_URL must be the official Monad facilitator: ${MONAD_FACILITATOR_URL}`);
  }

  if (network !== MONAD_X402_NETWORK) {
    throw new Error(`MONAD_NETWORK must be ${MONAD_X402_NETWORK}`);
  }

  if (usdcAddress.toLowerCase() !== MONAD_USDC_TESTNET_ADDRESS.toLowerCase()) {
    throw new Error(`MONAD_TESTNET_USDC_ADDRESS must be ${MONAD_USDC_TESTNET_ADDRESS}`);
  }

  if (!/^\d+$/.test(maxSignalCostAtomic)) {
    throw new Error("MONAD_MAX_SIGNAL_COST_ATOMIC must be an integer USDC atomic-unit budget");
  }

  return {
    payerPrivateKey: payerPrivateKey as `0x${string}`,
    payToAddress: payToAddress as `0x${string}`,
    facilitatorUrl,
    rpcUrl,
    maxSignalCostAtomic
  };
}

async function verifyTransactionOnMonadRpc(rpcUrl: string, hash: `0x${string}`): Promise<Record<string, unknown>> {
  const client = createPublicClient({
    chain: {
      id: 10143,
      name: "Monad Testnet",
      nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } }
    },
    transport: http(rpcUrl)
  });

  const receipt = await client.getTransactionReceipt({ hash });
  return {
    found: true,
    hash: receipt.transactionHash,
    blockNumber: receipt.blockNumber.toString(),
    status: receipt.status,
    explorerUrl: `https://testnet.monadexplorer.com/tx/${receipt.transactionHash}`
  };
}

function formatUsdcAtomic(amount: string): string {
  const padded = amount.padStart(7, "0");
  return `${padded.slice(0, -6)}.${padded.slice(-6)} USDC`;
}
