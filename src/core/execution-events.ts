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
      type: "payment_required";
      programId: string;
      toolName: string;
      requirement: JsonObject;
      timestamp: string;
    }
  | {
      type: "payment_approved";
      programId: string;
      toolName: string;
      details: JsonObject;
      timestamp: string;
    }
  | {
      type: "payment_rejected";
      programId: string;
      toolName: string;
      details: JsonObject;
      timestamp: string;
    }
  | {
      type: "payment_submitted";
      programId: string;
      toolName: string;
      reference: JsonObject;
      timestamp: string;
    }
  | {
      type: "payment_verified";
      programId: string;
      toolName: string;
      reference: JsonObject;
      timestamp: string;
    }
  | {
      type: "signal_validation";
      programId: string;
      toolName: string;
      valid: boolean;
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
