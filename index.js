const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

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



// 🗃️ Webhook storage
const webhookLogPath = path.join(__dirname, 'webhook-log.json');

function logWebhookEvent(type, data) {
  const existing = fs.existsSync(webhookLogPath)
    ? JSON.parse(fs.readFileSync(webhookLogPath, 'utf8'))
    : [];

  const entry = {
    type,
    received_at: new Date().toISOString(),
    ...data
  };

  existing.push(entry);
  fs.writeFileSync(webhookLogPath, JSON.stringify(existing, null, 2));
}
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
app.post('/webhook/reply', (req, res) => {
  console.log('📩 Reply webhook received:', req.body);
  try {
    logWebhookEvent('reply', req.body);
    res.status(200).send('OK');
  } catch (err) {
    console.error('Error logging reply:', err);
    res.status(500).send('Failed to log reply');
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
