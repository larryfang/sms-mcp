const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
            description: "Phone number to fetch SMS history (E.164 format)"
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
            description: "Phone number to send the message to (E.164 format)"
          },
          content: {
            type: "string",
            description: "The message body to send"
          }
        },
        required: ["destination_number", "content"]
      }
    }
  }
];

// Save chat logs to /conversations/<number>.json
function saveConversation(phone, role, message) {
  if (!phone) return;

  const dir = path.join(__dirname, 'conversations');
  const filePath = path.join(dir, `${phone}.json`);

  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
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

app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message || '';
    const phoneMatch = userMessage.match(/\+61\d{8,}/);
    const extractedPhone = phoneMatch ? phoneMatch[0] : null;

    const initial = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        { role: "system", content: "You are an AI assistant for SMS operations. Use tools if needed." },
        { role: "user", content: userMessage }
      ],
      tools,
      tool_choice: "auto"
    });

    const toolCall = initial.choices[0].message.tool_calls?.[0];
    const toolName = toolCall?.function?.name;
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    if (toolName === "get_sms_context") {
      const contextResponse = await axios.post(
        `${process.env.MCP_SERVER_URL || 'http://localhost:3000'}/context`,
        { phone_number: args.phone_number, use_live_data: true },
        {
          headers: {
            Authorization: req.headers.authorization
          }
        }
      );

      const followup = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          { role: "system", content: "You are an assistant with access to SMS history." },
          { role: "user", content: userMessage },
          initial.choices[0].message,
          {
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify(contextResponse.data)
          }
        ]
      });

      const reply = followup.choices[0].message.content.trim();
      saveConversation(args.phone_number, 'user', userMessage);
      saveConversation(args.phone_number, 'assistant', reply);

      return res.json({
        reply,
        action: "get_sms_context",
        phone_number: args.phone_number,
        data: contextResponse.data
      });
    }

    if (toolName === "send_sms") {
      const smsResponse = await axios.post(
        `${process.env.MCP_SERVER_URL || 'http://localhost:3000'}/send`,
        {
          messages: [
            {
              destination_number: args.destination_number,
              content: args.content,
              format: "SMS",
              delivery_report: true
            }
          ]
        }
      );

      const summary = `Message to ${args.destination_number} was sent successfully.`;
      saveConversation(args.destination_number, 'user', userMessage);
      saveConversation(args.destination_number, 'assistant', summary);

      return res.json({
        reply: summary,
        action: "send_sms",
        to: args.destination_number,
        content: args.content,
        status: "ok",
        message_id: smsResponse.data?.message_id || null,
        gpt_summary: summary
      });
    }

    // No tool used
    const reply = initial.choices[0].message.content.trim();
    if (extractedPhone) {
      saveConversation(extractedPhone, 'user', userMessage);
      saveConversation(extractedPhone, 'assistant', reply);
    }

    return res.json({
      reply,
      action: "none"
    });

  } catch (err) {
    console.error("❌ Error in /chat:", err.response?.data || err.message);
    res.status(500).json({ error: "Chat error", details: err.message });
  }
});

const port = process.env.CHAT_PORT || 4000;
app.listen(port, () => {
  console.log(`🤖 OpenAI Chat API running at http://localhost:${port}/chat`);
});
