import type { JsonValue } from "./json.js";
import type { ExecutionContext } from "./execution-context.js";

export interface Program<TConfig extends JsonValue = JsonValue, TResult extends JsonValue = JsonValue> {
  readonly id: string;
  run(config: TConfig, context: ExecutionContext): Promise<TResult>;
}
