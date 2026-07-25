import type { JsonObject, JsonValue } from "./json.js";

export interface ExecutionContext {
  readonly programId: string;
  readonly availableTools: readonly string[];
  callTool<TOutput extends JsonValue = JsonValue>(toolName: string, input: JsonValue): Promise<TOutput>;
  recordDecision(label: string, details: JsonObject): void;
}
