import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";                                                                                    
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";                                                                               
import { Pool } from "pg";                                                                                                                  
import { z } from "zod";                                                                                                                                    
import "dotenv/config";

const db = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

const server = new McpServer({
  name: "sugarcane-farmer-server",
  version: "1.0.0",
});


server.registerTool(    // it takes only specified required data from database 
  "get_farmer_data",
  {
    description:
      "Get all farmers, farmers with pending payments, or a summary of farmer supply and payments.",
    inputSchema: {
      queryType: z.enum(["all", "pending", "summary"]),
    },
  },
  async ({ queryType }) => {
    let result;

    if (queryType === "all") {
      result = await db.query(
        "SELECT * FROM farmers ORDER BY id"
      );
    } else if (queryType === "pending") {
      result = await db.query(
        "SELECT * FROM farmers WHERE pending_amount > 0 ORDER BY pending_amount DESC"
      );
    } else {
      result = await db.query(`
        SELECT
          COUNT(*) AS total_farmers,
          SUM(sugarcane_supplied) AS total_tonnes,
          SUM(total_amount) AS total_amount,
          SUM(amount_paid) AS total_paid,
          SUM(pending_amount) AS total_pending
        FROM farmers
      `);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.rows),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP Server Error:", error);
  process.exit(1);
});
