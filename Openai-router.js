require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { OpenAI } = require('openai');

const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());
const PORT = process.env.CHAT_PORT || 4000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';

const tools = [
  {
    type: "function",
    function: {
      name: "get_sms_context",
      description: "Fetch SMS context for a phone number",
      parameters: {
        type: "object",
        properties: {
          phone_number: {
            type: "string",
            description: "Phone number to fetch context for (E.164)"
          }
        },
        required: ["phone_number"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_sms",
      description: "Send an SMS to a user",
      parameters: {
        type: "object",
        properties: {
          destination_number: {
            type: "string",
            description: "Recipient's phone number in E.164 format"
          },
          content: {
            type: "string",
            description: "Text message content"
          }
        },
        required: ["destination_number", "content"]
      }
    }
  }
];

app.post("/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Missing message" });

  try {
    const initial = await openai.chat.completions.create({
      model: "gpt-4-0613",
      messages: [
        {
          role: "system",
          content: "You're a helpful assistant for SMS agents. Use tools when helpful."
        },
        { role: "user", content: message }
      ],
      tools,
      tool_choice: "auto"
    });

    const response = initial.choices[0];
    const toolCall = response.message.tool_calls?.[0];

    if (!toolCall) {
      return res.json({ reply: response.message.content, action: "none" });
    }

    const { name, arguments: argsJSON } = toolCall.function;
    const args = JSON.parse(argsJSON);

    let data = {};
    let reply = "";
    let metadata = {};

    if (name === "get_sms_context") {
      const ctxRes = await axios.post(`${MCP_SERVER_URL}/context`, {
        phone_number: args.phone_number
      });
      data = ctxRes.data;
      reply = `Here's the SMS context:

${data.summary}`;
      metadata = { phone_number: args.phone_number };
    }

    if (name === "send_sms") {
      const sendRes = await axios.post(`${MCP_SERVER_URL}/send`, {
        messages: [{ ...args, format: "SMS", delivery_report: true }]
      });
      data = sendRes.data;
      reply = `Message sent to ${args.destination_number}`;
      metadata = {
        to: args.destination_number,
        content: args.content,
        status: sendRes.data?.response?.messages?.[0]?.status,
        message_id: sendRes.data?.response?.messages?.[0]?.message_id
      };
    }

    return res.json({
      reply: reply || "(No response from GPT)",
      action: name,
      data,
      ...metadata
    });

  } catch (err) {
    console.error("Error in /chat:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to process message" });
  }
});

app.listen(PORT, () => {
  console.error(`🤖 OpenAI Chat API running at http://localhost:${PORT}/chat`);
});
