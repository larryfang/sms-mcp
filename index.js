const express = require('express');
const { OpenAI } = require('openai');


const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/conversations', express.static(path.join(__dirname, 'conversations')));

const PORT = process.env.PORT || 3000;

// 🔐 Auth header
const authHeader = 'Basic ' + Buffer.from(
  `${process.env.MESSAGE_API_KEY}:${process.env.MESSAGE_API_SECRET}`
).toString('base64');

// 📡 Axios client for MessageMedia
const messageAPI = axios.create({
  baseURL: process.env.MESSAGE_BASE_URL, // e.g. https://api.messagemedia.com
  headers: {
    Authorization: authHeader,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(process.env.MESSAGE_SUB_ACCOUNT_ID && {
      Account: process.env.MESSAGE_SUB_ACCOUNT_ID
    })
  }
});

// 📨 /send endpoint — send a real SMS
app.post('/send', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: 'Request body must include a non-empty messages array.'
    });
  }

  try {
    const response = await axios.post(
      `${process.env.MESSAGE_BASE_URL}/v1/messages`,
      { messages },
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(process.env.MESSAGE_SUB_ACCOUNT_ID && {
            Account: process.env.MESSAGE_SUB_ACCOUNT_ID
          })
        }
      }
    );

    return res.status(200).json({
      message: 'SMS sent successfully!',
      message_id: response.data.messages[0]?.message_id,
      response: response.data
    });

  } catch (err) {
    console.error('❌ Error sending SMS:', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Failed to send SMS',
      details: err.response?.data || err.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/version', (req, res) => {
  res.json({
    name: "message-media-mcp-server",
    version: "1.0.0",
    description: "AI-native MCP server for SMS context and delivery",
    timestamp: new Date().toISOString()
  });
});


// 🗃️ Webhook storage
const webhookLogPath = path.join(__dirname, 'webhook-log.json');


app.post('/context', async (req, res) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({ error: 'phone_number is required' });
  }

  try {
    const logFile = path.join(__dirname, 'webhook-log.json');
    if (!fs.existsSync(logFile)) {
      return res.status(200).json({ summary: 'No logs yet.', context: [] });
    }

    const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    const filtered = logs.filter(entry =>
      entry.source_number === phone_number
    );

    const replies = filtered.filter(e => e.type === 'reply');
    const deliveries = filtered.filter(e => e.type === 'delivery');

    const lastReply = replies.at(-1);
    const lastDelivery = deliveries.at(-1);

    const context = [];

    if (replies.length > 0) {
      context.push({
        type: "list",
        label: "Recent Replies",
        value: replies.slice(-3).map(r => ({
          content: r.reply_content || r.content || '[no content]',
          date_received: r.date_received || r.received_at
        }))
      });
    }

    if (deliveries.length > 0) {
      context.push({
        type: "list",
        label: "Recent Delivery Reports",
        value: deliveries.slice(-3).map(d => ({
          status: d.status,
          date_received: d.date_received,
          message_id: d.message_id
        }))
      });
    }
    const lastReplyText = lastReply?.reply_content || lastReply?.content || "None";
    const lastDeliveryStatus = lastDelivery?.status || "N/A";
    
    const summary = `${phone_number} has ${replies.length} reply(ies) and ${deliveries.length} delivery report(s). Last reply: "${lastReplyText}" Last delivery status: ${lastDeliveryStatus}.`;

    const prompt_context = `Phone ${phone_number}: Last status "${lastDeliveryStatus}", Last reply: "${lastReplyText}"`;

    const prompt_guidance = {
      usage: "Use this context to understand the customer's SMS interaction history.",
      examples: [
        `This customer replied "${lastReply?.content}" after receiving 2 messages.`,
        `${phone_number} has not replied yet, last delivery status was ${lastDelivery?.status || 'unknown'}.`
      ]
    };

    res.json({
      summary,
      prompt_context,
      context,
      prompt_guidance
    });

  } catch (err) {
    console.error("Error in /context:", err.message || err);
    res.status(500).json({ error: "Failed to generate context" });
  }
});
function saveConversation(phone, role, message, intent) {
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
      message,
      intent: intent || null
    });

    fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error('Failed to save conversation:', err.message);
  }
}
function logWebhookEvent(type, data) {
  const file = path.join(__dirname, 'webhook-log.json');

  try {
    let log = [];
    if (fs.existsSync(file)) {
      log = JSON.parse(fs.readFileSync(file, 'utf8'));
    }

    log.push({
      type,
      timestamp: new Date().toISOString(),
      ...data
    });

    fs.writeFileSync(file, JSON.stringify(log, null, 2));
  } catch (err) {
    console.error('❌ Failed to log webhook event:', err.message);
  }

  // ALSO: Save message content to conversation log if applicable
  const phone = data?.source_number;
  if (phone && (data.reply_content || data.auto_reply)) {
    if (data.reply_content) {
      saveConversation(phone, 'user', data.reply_content);
    }
    if (data.auto_reply) {
      saveConversation(phone, 'assistant', data.auto_reply, data.intent);
    }
  }
}


// 📬 /webhook/delivery — log delivery status updates
app.post('/webhook/delivery', (req, res) => {
  console.log('📬 Delivery webhook received:', req.body);
  try {
    logWebhookEvent('delivery', req.body);
    res.status(200).send('OK');
  } catch (err) {
    console.error('Error logging delivery:', err);
    res.status(500).send('Failed to log delivery report');
  }
});

// 📩 /webhook/reply — log inbound SMS replies
app.post('/webhook/reply', async (req, res) => {
  try {
    console.log("the entire reply body",req.body);
    const source_number = req.body.source_address;
    const reply_content = req.body.reply_msg;


    console.log("📩 Incoming SMS:", { from: source_number, text: reply_content });

    // 1. Generate the GPT reply
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4-0613",
      messages: [
        {
          role: "system",
          content: "You're a helpful and friendly SMS assistant. Reply casually and clearly to customers."
        },
        {
          role: "user",
          content: reply_content
        }
      ]
    });

    const reply = gptResponse.choices[0].message.content.trim();
    console.log("🤖 GPT reply:", reply);

    // 2. Classify intent
    const classify = await openai.chat.completions.create({
      model: "gpt-4-0613",
      messages: [
        {
          role: "system",
          content: "Classify the user's message into one of: inquiry_shipping, complaint_product, confirm_receipt, cancel_order, other. Respond with just the label."
        },
        {
          role: "user",
          content: reply_content
        }
      ]
    });

    const intent = classify.choices[0].message.content.trim();
    console.log("🔎 GPT intent:", intent);

    // 3. Send the reply back via MessageMedia
    await axios.post(`${process.env.MCP_SERVER_URL}/send`, {
      messages: [
        {
          destination_number: source_number,
          content: reply,
          format: "SMS",
          delivery_report: true
        }
      ]
    });

    // 4. Log the interaction with intent
    logWebhookEvent("reply_auto", {
      source_number,
      reply_content,
      auto_reply: reply,
      intent
    });

    res.status(200).send("Reply processed and auto-responded");
  } catch (err) {
    console.error("❌ Error auto-replying to SMS:", err.message);
    res.status(500).send("Failed to auto-reply");
  }
});


app.get('/dashboard', (req, res) => {
  const file = path.join(__dirname, 'webhook-log.json');

  if (!fs.existsSync(file)) {
    return res.send('<h2>No logs found</h2>');
  }

  const logs = JSON.parse(fs.readFileSync(file, 'utf8'));

  const htmlRows = logs.map(entry => {
    const color = entry.type === 'reply' ? '#e6f7ff' : '#f9f9f9';
    const content = entry.reply_content || entry.message_content || '[no content]';
    return `
      <tr style="background:${color}">
        <td>${entry.type}</td>
        <td>${entry.source_number || '-'}</td>
        <td>${content}</td>
        <td>${entry.status || '-'}</td>
        <td>${entry.received_at}</td>
      </tr>`;
  }).join('');

  const html = `
    <html>
      <head>
        <title>SMS Log Dashboard</title>
        <style>
          body { font-family: sans-serif; padding: 1rem; }
          table { border-collapse: collapse; width: 100%; }
          th, td { padding: 8px 12px; border: 1px solid #ccc; text-align: left; }
          th { background: #f0f0f0; }
        </style>
      </head>
      <body>
        <h2>📊 SMS Log Dashboard</h2>
        <table>
          <tr>
            <th>Type</th>
            <th>Phone</th>
            <th>Message</th>
            <th>Status</th>
            <th>Received At</th>
          </tr>
          ${htmlRows}
        </table>
      </body>
    </html>
  `;

  res.send(html);
});

// MCP schema metadata
app.get('/meta', (req, res) => {
  res.json({
    service: "messagemedia.sms",
    description: "SMS history and delivery context for phone numbers",
    context_types: ["phone_number"],
    capabilities: ["send_sms", "get_sms_context"]
  });
});

// OpenAI-compatible function schema
app.get('/function-schema', (req, res) => {
  res.json([
    {
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
    },
    {
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
  ]);
});


// 🔊 Start server
app.listen(PORT, () => {
  console.log(`✅ MCP server listening on http://localhost:${PORT}`);
});
