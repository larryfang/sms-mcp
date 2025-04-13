require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { OpenAI } = require('openai');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.CHAT_PORT || 4000;
const MCP_BASE_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🧠 Function definitions for GPT
const functionDefinitions = [
  {
    name: "get_sms_context",
    description: "Fetch message history and opt-out status for a phone number",
    parameters: {
      type: "object",
      properties: {
        phone_number: {
          type: "string",
          description: "Phone number in E.164 format (e.g. +61412345678)"
        }
      },
      required: ["phone_number"]
    }
  },
  {
    name: "send_sms",
    description: "Send an SMS message to a phone number",
    parameters: {
      type: "object",
      properties: {
        destination_number: {
          type: "string",
          description: "Recipient's phone number in E.164 format"
        },
        content: {
          type: "string",
          description: "Text message content to send"
        }
      },
      required: ["destination_number", "content"]
    }
  }
];

// 💾 Save conversation per number
function saveConversation(phone, role, message) {
  if (!phone) return;

  const dir = path.join(__dirname, 'conversations');
  const filePath = path.join(dir, `${phone}.json`);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    let history = [];
    if (fs.existsSync(filePath)) {
      history = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    history.push({
      timestamp: new Date().toISOString(),
      role,
      message
    });

    fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error('Failed to save conversation:', err.message);
  }
}

// 🤖 POST /chat — natural message to GPT with function support
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    // Step 1: Ask GPT if it wants to use a function
    const initial = await openai.chat.completions.create({
      model: "gpt-4-0613",
      messages: [{ role: "user", content: userMessage }],
      functions: functionDefinitions,
      function_call: "auto"
    });

    const message = initial.choices[0].message;

    if (!message.function_call) {
      return res.json({ reply: message.content });
    }

    const { name, arguments: argsRaw } = message.function_call;
    const args = JSON.parse(argsRaw);

    let functionResponse;

    // Step 2: Call MCP server
    if (name === "get_sms_context") {
      const mcpRes = await axios.post(`${MCP_BASE_URL}/context`, args);
      functionResponse = mcpRes.data;
    } else if (name === "send_sms") {
      const sendRes = await axios.post(`${MCP_BASE_URL}/send`, {
        messages: [
          {
            destination_number: args.destination_number,
            content: args.content,
            format: "SMS",
            delivery_report: true
          }
        ]
      });
      functionResponse = {
        status: "Message sent",
        message_id: sendRes.data.message_id,
        destination_number: args.destination_number,
        content: args.content
      };
    }

    // Step 3: Final GPT reply with function result
    const final = await openai.chat.completions.create({
      model: "gpt-4-0613",
      messages: [
        { role: "user", content: userMessage },
        message,
        {
          role: "function",
          name,
          content: JSON.stringify(functionResponse)
        }
      ]
    });

    const reply = final.choices[0].message.content;

    // Step 4: Save chat to history
    const phone = args?.phone_number || args?.destination_number;
    saveConversation(phone, 'user', userMessage);
    saveConversation(phone, 'assistant', reply);

    return res.json({ reply });

  } catch (err) {
    console.error("❌ Error in /chat:", err.response?.data || err.message);
    return res.status(500).json({ error: "Chat pipeline failed" });
  }
});

app.listen(PORT, () => {
  console.log(`🤖 OpenAI Chat API running at http://localhost:${PORT}/chat`);
});
