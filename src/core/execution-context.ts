import type { ExecutionEvent } from "./execution-events.js";
import type { JsonObject, JsonValue } from "./json.js";

export interface ExecutionContext {
  readonly programId: string;
  readonly availableTools: readonly string[];
  callTool<TOutput extends JsonValue = JsonValue>(toolName: string, input: JsonValue): Promise<TOutput>;
  recordDecision(label: string, details: JsonObject): void;
  recordEvent(event: ProgramEventInput): void;
}

export type ProgramEventInput = ExecutionEvent extends infer TEvent
  ? TEvent extends ExecutionEvent
    ? TEvent["type"] extends "program_started" | "tool_call_started" | "tool_call_succeeded" | "tool_call_failed" | "decision" | "program_completed" | "program_failed"
      ? never
      : Omit<TEvent, "programId" | "timestamp">
    : never
  : never;
