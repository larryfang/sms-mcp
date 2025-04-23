require('dotenv').config();
const { OpenAI } = require("openai");
const axios = require("axios");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const mcpFunction = {
  name: "get_ticket_context",
  description: "Returns customer or org context from Zendesk using a ticket ID, user ID, or organization ID",
  parameters: {
    type: "object",
    properties: {
      ticket_id: { type: "integer", description: "Zendesk ticket ID" },
      user_id: { type: "integer", description: "Zendesk user ID" },
      organization_id: { type: "integer", description: "Zendesk org ID" }
    },
    required: []
  }
};

(async () => {
  const userMessage = "Can you give me context for ticket 6?";

  const initialResponse = await openai.chat.completions.create({
    model: "gpt-4-0613",
    messages: [
      { role: "user", content: userMessage }
    ],
    functions: [mcpFunction],
    function_call: "auto"
  });

  const message = initialResponse.choices[0].message;

  if (message.function_call) {
    const { name, arguments: rawArgs } = message.function_call;
    const args = JSON.parse(rawArgs);

    // Call your MCP server
    const mcpRes = await axios.post("http://localhost:3000/context", args);
    const mcpData = mcpRes.data;

    // Feed the result back to GPT to generate a final natural reply
    const finalResponse = await openai.chat.completions.create({
      model: "gpt-4-0613",
      messages: [
        { role: "user", content: userMessage },
        message,
        {
          role: "function",
          name,
          content: JSON.stringify(mcpData)
        }
      ]
    });

    console.error("\n🔁 GPT-4 Final Response:\n");
    console.error(finalResponse.choices[0].message.content);
  } else {
    // No function call needed
    console.error("\nGPT-4 Response:\n", message.content);
  }
})();
