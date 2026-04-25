import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { alertTool, forecastTool } from "./tools";

const server = new McpServer({
  name: "weather",
  version: "1.0.0",
});

async function main() {
  const transport = new StdioServerTransport();
  server.registerTool(alertTool.name, alertTool.config, alertTool.callBack);
  server.registerTool(forecastTool.name, forecastTool.config, forecastTool.callBack)
  await server.connect(transport);
  console.error("Weather MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});