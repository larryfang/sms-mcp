require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');


const axios = require('axios');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/doc', express.static(path.join(__dirname, 'doc')));
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
    const response = await messageAPI.post('/v1/messages', { messages });

    res.status(200).json({
      message: 'SMS sent successfully!',
      response: response.data
    });
  } catch (err) {
    console.error('❌ Error sending SMS:', err.response?.data || err.message);
    res.status(500).json({
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
  console.error("context being called");
  const { phone_number, use_live_data = true } = req.body;

  if (!phone_number) {
    return res.status(400).json({ error: 'phone_number is required' });
  }

  try {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    if (use_live_data) {
      const payload = { start_date: startDate, end_date: endDate };
      const response = await messageAPI.post(`/v2-preview/reporting/messages/detail`, payload);
      const messages = response.data.messages || [];

      const filtered = messages.filter(msg =>
        msg.source_address === phone_number || msg.destination_address === phone_number
      );

      // MO = user replies, MT = assistant messages
      const replies = filtered.filter(
        m => m.direction === 'MO' && m.source_address === phone_number && m.content?.trim()
      );

      const deliveries = filtered.filter(
        m => m.direction === 'MT' && m.destination_address === phone_number
      );

      replies.forEach((reply, index) => {
        console.error(`📩 Reply [${index}]:`, {
          content: reply.content,
          timestamp: reply.timestamp,
          direction: reply.direction,
          source: reply.source_address,
          destination: reply.destination_address,
          message_id: reply.message_id,
        });
      });
      
      const lastReply = replies.at(0);
      const lastDelivery = deliveries.at(0);
      const context = [];

      if (replies.length > 0) {
        context.push({
          type: "list",
          label: "Recent Replies",
          value: replies.slice(-100).map(r => ({
            content: r.content || '[no content]',
            date_received: r.timestamp
          }))
        });
      }


      if (deliveries.length > 0) {
        context.push({
          type: "list",
          label: "Recent Delivery Reports",
          value: deliveries.slice(-100).map(d => ({
            status: d.status_description || d.status || 'unknown',
            message_id: d.message_id,
            date_received: d.timestamp
          }))
        });
      }

      const lastReplyText = lastReply?.content || "None";
      const lastDeliveryStatus = lastDelivery?.status_description || lastDelivery?.status || "N/A";

      const summary = `${phone_number} has ${replies.length} reply(ies) and ${deliveries.length} delivery report(s). Last reply: "${lastReplyText}" Last delivery status: ${lastDeliveryStatus}.`;

      const prompt_context = `Phone ${phone_number}: Last status "${lastDeliveryStatus}", Last reply: "${lastReplyText}"`;

      const prompt_guidance = {
        usage: "Use this context to understand the customer's SMS interaction history.",
        examples: [
          `This customer replied "${lastReplyText}" after receiving 2 messages.`,
          `${phone_number} has not replied yet, last delivery status was ${lastDeliveryStatus}.`
        ]
      };

      return res.json({
        summary,
        prompt_context,
        context,
        prompt_guidance
      });
    }

    // Legacy fallback mode (webhook-log.json)
    const logFile = path.join(__dirname, 'webhook-log.json');
    if (!fs.existsSync(logFile)) {
      return res.status(200).json({ summary: 'No logs yet.', context: [] });
    }

    const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    const filtered = logs.filter(entry => entry.source_number === phone_number);

    const replies = filtered.filter(e => e.type === 'reply');
    const deliveries = filtered.filter(e => e.type === 'delivery');

    const lastReply = replies.at(0);
    const lastDelivery = deliveries.at(0);

    const context = [];

    if (replies.length > 0) {
      context.push({
        type: "list",
        label: "Recent Replies",
        value: replies.slice(-100).map(r => ({
          content: r.reply_content || r.content || '[no content]',
          date_received: r.date_received || r.received_at
        }))
      });
    }

    if (deliveries.length > 0) {
      context.push({
        type: "list",
        label: "Recent Delivery Reports",
        value: deliveries.slice(-100).map(d => ({
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
        `This customer replied "${lastReplyText}" after receiving 2 messages.`,
        `${phone_number} has not replied yet, last delivery status was ${lastDeliveryStatus}.`
      ]
    };

    return res.json({
      summary,
      prompt_context,
      context,
      prompt_guidance
    });

  } catch (err) {
    console.error("Error in /context:", err.response?.data || err.message || err);
    return res.status(500).json({ error: "Failed to generate context" });
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
  console.error('📬 Delivery webhook received:', req.body);
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
    const source_number = req.body.source_address;
    const reply_content = req.body.reply_msg;

    console.error("📩 Incoming SMS:", { from: source_number, text: reply_content });

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
    console.error("🤖 GPT reply:", reply);

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
    console.error("🔎 GPT intent:", intent);

    // 3. Send the reply back via your own /send API
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

    res.status(200).send("Auto-reply sent via GPT");
  } catch (err) {
    console.error("❌ Error auto-replying to SMS:", err.message);
    res.status(500).send("Failed to auto-reply");
  }
});



app.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // past 7 days

    const response = await messageAPI.post('/v2-preview/reporting/messages/detail', {
      start_date: start.toISOString(),
      end_date: now.toISOString()
    });

    const messages = response.data.messages || [];

    const rows = messages.map(msg => {
      const isReply = msg.direction === 'MO';
      const isDelivery = msg.status?.toLowerCase() === 'delivered' || msg.status;

      return `
        <tr style="background: ${isReply ? '#e6f7ff' : '#f9f9f9'}">
          <td>${msg.direction}</td>
          <td>${msg.source_address || '-'}</td>
          <td>${msg.destination_address || '-'}</td>
          <td>${msg.content || '-'}</td>
          <td>${msg.status || '-'}</td>
          <td>${msg.message_id || '-'}</td>
          <td>${msg.received || msg.timestamp || '-'}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <title>📊 Live SMS Dashboard</title>
          <style>
            body { font-family: sans-serif; padding: 1rem; }
            table { border-collapse: collapse; width: 100%; }
            th, td { padding: 8px 12px; border: 1px solid #ccc; text-align: left; }
            th { background: #f0f0f0; }
          </style>
        </head>
        <body>
          <h2>📊 Live SMS Log Dashboard (Last 7 Days)</h2>
          <table>
            <tr>
              <th>Direction</th>
              <th>From</th>
              <th>To</th>
              <th>Content</th>
              <th>Status</th>
              <th>Message ID</th>
              <th>Timestamp</th>
            </tr>
            ${rows}
          </table>
        </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error("❌ Error in /dashboard:", err.message || err);
    res.status(500).send("Failed to load dashboard");
  }
});



app.get('/report', async (req, res) => {
  try {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    const response = await messageAPI.post('/v2-preview/reporting/messages/detail', {
      start_date: startDate,
      end_date: endDate
    });

    const messages = response.data.messages || [];

    // Parse and aggregate
    const dailyStats = {};

    for (const msg of messages) {
      const date = new Date(msg.timestamp).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { date, Inbound: 0, Outbound: 0 };
      }
      if (msg.direction === 'MO') {
        dailyStats[date].Inbound += 1;
      } else if (msg.direction === 'MT') {
        dailyStats[date].Outbound += 1;
      }
    }

    const summary = Object.values(dailyStats).sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json({ summary });
  } catch (err) {
    console.error("Error in /report:", err.response?.data || err.message || err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
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
  console.error(`✅ MCP server listening on http://localhost:${PORT}`);
});
