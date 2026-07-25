import type { JsonObject, JsonValue } from "./json.js";

export type ExecutionEvent =
  | {
      type: "program_started";
      programId: string;
      timestamp: string;
    }
  | {
      type: "tool_call_started";
      programId: string;
      toolName: string;
      input: JsonValue;
      timestamp: string;
    }
  | {
      type: "tool_call_succeeded";
      programId: string;
      toolName: string;
      output: JsonValue;
      timestamp: string;
    }
  | {
      type: "tool_call_failed";
      programId: string;
      toolName: string;
      error: string;
      timestamp: string;
    }
  | {
      type: "decision";
      programId: string;
      label: string;
      details: JsonObject;
      timestamp: string;
    }
  | {
      type: "program_completed";
      programId: string;
      result: JsonValue;
      timestamp: string;
    }
  | {
      type: "program_failed";
      programId: string;
      error: string;
      timestamp: string;
    };
