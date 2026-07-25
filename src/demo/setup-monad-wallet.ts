import { chmod, writeFile } from "node:fs/promises";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  MONAD_FACILITATOR_URL,
  MONAD_USDC_TESTNET_ADDRESS,
  MONAD_X402_NETWORK
} from "../tools/index.js";
import { loadEnvLocal } from "./load-env-local.js";

const ENV_PATH = ".env.local";
const MONAD_RPC_URL = "https://testnet-rpc.monad.xyz";
const DEFAULT_BUDGET_ATOMIC = "1000";

const existing = await loadEnvLocal(ENV_PATH);

if (existing) {
  const payerPrivateKey = requirePrivateKey("MONAD_PAYER_PRIVATE_KEY");
  const payToPrivateKey = requirePrivateKey("MONAD_PAY_TO_PRIVATE_KEY");
  printSetup("existing", payerPrivateKey, payToPrivateKey);
} else {
  const payerPrivateKey = generatePrivateKey();
  const payToPrivateKey = generatePrivateKey();
  const payToAddress = privateKeyToAccount(payToPrivateKey).address;

  const content = [
    "# Disposable Monad testnet accounts generated locally.",
    "# This file is gitignored. Never commit it or use these accounts for real funds.",
    `MONAD_PAYER_PRIVATE_KEY=${payerPrivateKey}`,
    `MONAD_PAY_TO_PRIVATE_KEY=${payToPrivateKey}`,
    `MONAD_PAY_TO_ADDRESS=${payToAddress}`,
    `MONAD_FACILITATOR_URL=${MONAD_FACILITATOR_URL}`,
    `MONAD_NETWORK=${MONAD_X402_NETWORK}`,
    `MONAD_TESTNET_USDC_ADDRESS=${MONAD_USDC_TESTNET_ADDRESS}`,
    `MONAD_RPC_URL=${MONAD_RPC_URL}`,
    `MONAD_MAX_SIGNAL_COST_ATOMIC=${DEFAULT_BUDGET_ATOMIC}`,
    ""
  ].join("\n");

  await writeFile(ENV_PATH, content, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600
  });

  try {
    await chmod(ENV_PATH, 0o600);
  } catch {
    // Windows may not apply POSIX file modes. The file remains local and gitignored.
  }

  printSetup("created", payerPrivateKey, payToPrivateKey);
}

function printSetup(
  status: "created" | "existing",
  payerPrivateKey: `0x${string}`,
  payToPrivateKey: `0x${string}`
): void {
  const payerAddress = privateKeyToAccount(payerPrivateKey).address;
  const payToAddress = privateKeyToAccount(payToPrivateKey).address;

  console.log(
    JSON.stringify(
      {
        status,
        envFile: ENV_PATH,
        payerAddress,
        payToAddress,
        faucet: {
          url: "https://faucet.circle.com/",
          instruction: `Select Monad Testnet USDC and send it to ${payerAddress}`
        },
        nextCommandAfterFunding: "npm run demo:monad",
        note: "Private keys were written only to .env.local and were not printed. These accounts are disposable testnet accounts only."
      },
      null,
      2
    )
  );
}

function requirePrivateKey(name: "MONAD_PAYER_PRIVATE_KEY" | "MONAD_PAY_TO_PRIVATE_KEY"): `0x${string}` {
  const value = process.env[name];
  if (!value || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${ENV_PATH} exists but ${name} is missing or invalid`);
  }
  return value as `0x${string}`;
}
