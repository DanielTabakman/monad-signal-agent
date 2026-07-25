import type { ExecutionContext } from "./execution-context.js";
import type { ExecutionEvent } from "./execution-events.js";
import type { JsonObject, JsonValue } from "./json.js";
import type { Program } from "./program.js";
import type { ToolExecutionContext } from "./tool.js";
import type { ToolRegistry } from "./tool-registry.js";

export interface RuntimeResult<TResult extends JsonValue = JsonValue> {
  readonly programId: string;
  readonly ok: boolean;
  readonly result?: TResult;
  readonly error?: string;
  readonly trace: readonly ExecutionEvent[];
}

export class AgentRuntime {
  constructor(private readonly toolRegistry: ToolRegistry) {}

  async run<TConfig extends JsonValue, TResult extends JsonValue>(
    program: Program<TConfig, TResult>,
    config: TConfig
  ): Promise<RuntimeResult<TResult>> {
    const trace: ExecutionEvent[] = [];
    const pushEvent = (event: RuntimeEventInput): void => {
      trace.push({
        ...event,
        programId: program.id,
        timestamp: new Date().toISOString()
      } as ExecutionEvent);
    };

    pushEvent({ type: "program_started" });

    const context: ExecutionContext = {
      programId: program.id,
      availableTools: this.toolRegistry.listNames(),
      callTool: async <TOutput extends JsonValue = JsonValue>(
        toolName: string,
        input: JsonValue
      ): Promise<TOutput> => {
        const tool = this.toolRegistry.get(toolName);
        pushEvent({ type: "tool_call_started", toolName, input });

        if (!tool.validateInput(input)) {
          const error = `Invalid input for tool: ${toolName}`;
          pushEvent({ type: "tool_call_failed", toolName, error });
          throw new Error(error);
        }

        try {
          const output = await tool.execute(input, createToolContext(program.id));
          pushEvent({ type: "tool_call_succeeded", toolName, output });
          return output as TOutput;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          pushEvent({ type: "tool_call_failed", toolName, error: message });
          throw error;
        }
      },
      recordDecision: (label: string, details: JsonObject): void => {
        pushEvent({ type: "decision", label, details });
      }
    };

    try {
      const result = await program.run(config, context);
      pushEvent({ type: "program_completed", result });
      return {
        programId: program.id,
        ok: true,
        result,
        trace
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushEvent({ type: "program_failed", error: message });
      return {
        programId: program.id,
        ok: false,
        error: message,
        trace
      };
    }
  }
}

function createToolContext(programId: string): ToolExecutionContext {
  return { programId };
}

type RuntimeEventInput = ExecutionEvent extends infer TEvent
  ? TEvent extends ExecutionEvent
    ? Omit<TEvent, "programId" | "timestamp">
    : never
  : never;
