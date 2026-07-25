import type { JsonValue } from "./json.js";

export interface ToolExecutionContext {
  readonly programId: string;
}

export interface Tool<TInput extends JsonValue = JsonValue, TOutput extends JsonValue = JsonValue> {
  readonly name: string;
  validateInput(input: JsonValue): input is TInput;
  execute(input: TInput, context: ToolExecutionContext): Promise<TOutput>;
}
