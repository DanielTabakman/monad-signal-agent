import { runLiveMonadDemo } from "./live-monad-demo.js";

const evidence = await runLiveMonadDemo();
console.log(JSON.stringify(evidence, null, 2));
