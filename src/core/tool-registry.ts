import type { JsonValue } from "./json.js";
import type { Tool } from "./tool.js";

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not registered: ${name}`);
    }

    return tool;
  }

  listNames(): string[] {
    return [...this.tools.keys()].sort();
  }

  validateInput(toolName: string, input: JsonValue): boolean {
    return this.get(toolName).validateInput(input);
  }
}
