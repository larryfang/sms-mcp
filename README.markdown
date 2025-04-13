# 🧠 AI-Powered MCP Server (MessageMedia + GPT-4)

This project is a production-ready Model Context Protocol (MCP) server that enables real-time, AI-native SMS workflows using:

- 🧠 GPT-4 function calling
- 📩 MessageMedia SMS API (send + receive)
- 🧾 LLM-ready context generation
- 💬 Per-user chat history
- 📊 Webhook log viewer + chat UI
- 🐳 Docker-ready deployment

---

## 🧱 Architecture Overview (MCP Perspective)

The MCP server acts as a **translator and orchestrator** between AI agents and real-world communication (SMS).

It enables GPT to:

- Fetch message history context (`get_sms_context`)
- Send real outbound SMS (`send_sms`)
- Interpret inbound replies and delivery status via webhooks

---

### 📈 Architecture Diagram

![MCP Diagram](A_flowchart_diagram_illustrates_a_Model_Context_Pr.png)

---

## 🧠 Key Responsibilities of MCP Server

- Normalize external system data into predictable schema
- Allow structured bi-directional actions (send/retrieve)
- Return:
  - `summary`: human-readable history
  - `prompt_context`: one-line GPT embed string
  - `context`: structured blocks
  - `prompt_guidance`: examples for GPT use
- Be usable by GPT function calling, LangChain, or other AI agents

---

## 📁 Project Structure

```
├── index.js             # MCP: /context, /send, webhook handlers
├── openai-router.js     # GPT interface + function routing
├── start-all.js         # Runs both servers in Docker
├── webhook-log.json     # Webhook events from MessageMedia
├── conversations/       # Saved GPT chats per phone number
├── chat-ui.html         # In-browser GPT assistant
├── Dockerfile           # Deployment config
```

---

## ⚙️ .env Configuration

```
MESSAGE_API_KEY=your_api_key
MESSAGE_API_SECRET=your_secret
MESSAGE_BASE_URL=https://api.messagemedia.com
OPENAI_API_KEY=your_openai_key
PORT=3000
CHAT_PORT=4000
MCP_SERVER_URL=http://localhost:3000
API_TOKEN=your_token_here
```

---

## 🔁 GPT Functions Supported

### 1. `get_sms_context`
Fetch message history from webhook log
```json
{ "phone_number": "+61412345678" }
```

### 2. `send_sms`
Trigger outbound SMS to a phone number
```json
{ "destination_number": "+61412345678", "content": "Hi there" }
```

---

## 🧪 Test Locally

```bash
npm install
node start-all.js
```

- View logs: http://localhost:3000/dashboard
- Use chat: http://localhost:4000/chat (via chat-ui.html)
- Send request: `curl -X POST http://localhost:4000/chat ...`

---

## 🐳 Docker Support

```bash
docker build -t mcp-sms .
docker run -p 3000:3000 -p 4000:4000 --env-file .env mcp-sms
```

---

## ✅ Status

✅ Ready for:

- Local testing
- Real MessageMedia SMS traffic
- GPT automation + message memory
- Deployment to Render, Railway, or Fly.io