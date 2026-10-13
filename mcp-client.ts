
import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import "dotenv/config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new Client({
  name: "sugarcane-ai-client",
  version: "1.0.0",
});

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["./node_modules/tsx/dist/cli.mjs", "mcp-server.ts"],
  cwd: process.cwd(),
  stderr: "inherit",
});

async function main() {
  try {
    // Connect to the MCP server
    await client.connect(transport);
    console.log("Connected to MCP server.");

    // Discover registered MCP tools
    const { tools } = await client.listTools();

    console.log("Available tools:", tools.map((tool) => tool.name));

    // Hardcoded question
    const question = "kontya shetkari ne jast average utpanna dila ahe ani tyacha payment status kay ahe?";

    // Ask OpenAI to select an appropriate tool (low temperature for fast, deterministic tool selection)
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You are a sugarcane farmer management assistant. Select the appropriate tool quickly. Never invent database results.",
        },
        { role: "user", content: question },
      ],
      tools: tools.map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description || "",
          parameters: tool.inputSchema as Record<string, unknown>,
        },
      })),
    });

    const message = response.choices[0].message;
    const toolCalls = message.tool_calls ?? [];

    // If OpenAI selects a tool, execute through MCP in parallel
    if (toolCalls.length > 0) {
      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
          if (toolCall.type !== "function") return null;

          const args = JSON.parse(toolCall.function.arguments);

          const result = await client.callTool({
            name: toolCall.function.name,
            arguments: args,
          });

          return {
            role: "tool" as const,
            tool_call_id: toolCall.id,
            content: JSON.stringify(result.content),
          };
        })
      );

      const validToolResults = toolResults.filter(
        (res): res is NonNullable<typeof res> => res !== null
      );

      // Send MCP tool results back to OpenAI with max_tokens and concise instruction for faster answer
      const finalResponse = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0.2,
        max_tokens: 250,
        messages: [
          {
            role: "system",
            content:
              "Answer concisely in 2-3 direct sentences using only the supplied database results. Clearly mention amounts in Indian rupees.",
          },
          { role: "user", content: question },
          message,
          ...validToolResults,
        ],
      });

      console.log(
        "\nAI Answer:\n",
        finalResponse.choices[0].message.content
      );
    } else {
      console.log("\nAI Answer:\n", message.content);
    }
  } finally {
    // Close the MCP connection
    await client.close();
  }
}

main().catch((error) => {
  console.error("Application error:", error);
  process.exitCode = 1;
});
