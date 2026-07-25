import { runLiveMonadDemo } from "./live-monad-demo.js";
import { printPresenterEvidence } from "./presenter-output.js";

console.log("Starting the real paid-signal flow on Monad Testnet…");
console.log("The agent will stop safely if payment, validation, or RPC verification fails.\n");

const evidence = await runLiveMonadDemo();
printPresenterEvidence(evidence);
