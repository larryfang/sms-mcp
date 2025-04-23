# MessageMedia MCP Server (V1)

A fully AI-native **MCP (Model Context Protocol) server** for SMS communication using the [MessageMedia](https://messagemedia.com) API — designed to integrate with GPT tools like OpenAI, LangChain, Claude, and CRM systems (Zendesk, HubSpot, Salesforce, etc.).

---

## 🚀 Features

- ✅ Send and receive SMS with MessageMedia
- ✅ Auto-reply with GPT-4 to incoming SMS
- ✅ Webhook handling for delivery + reply logs
- ✅ `/context` endpoint to retrieve SMS history as GPT-usable context
- ✅ OpenAPI + MCP schema for tool-based LLM integrations
- ✅ LangChain Agent ready (Tool calling support)
- ✅ Chat UI frontend (`chat.html`)
- ✅ Visual dashboards (`/dashboard`, `/inbox`)
- ✅ Fully Dockerized for local or cloud deployment

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
pip install -r requirements.txt
```

### 2. Create a `.env` File
```env
PORT=3000
OPENAI_API_KEY=sk-...
MESSAGE_API_KEY=...
MESSAGE_API_SECRET=...
MESSAGE_BASE_URL=https://api.messagemedia.com
MESSAGE_SUB_ACCOUNT_ID=optional
MCP_SERVER_URL=http://localhost:3000
CHAT_PORT=4000
```

---

## 🧪 Local Development

### MCP Server (SMS context, /send, /webhooks)
```bash
node index.js
```

### OpenAI Router Server (/chat)
```bash
node Openai-router.js
```

---

## 🐳 Docker Support

### Dockerfile
Build the container:
```bash
docker build -t mcp-server .
```

Run:
```bash
docker run --env-file .env -p 3000:3000 -p 4000:4000 mcp-server
```

---

## 🧠 LangChain Integration (GPT Agent with Tools)

This project includes a LangChain-based GPT agent that can both:

- `get_sms_context`: Retrieve recent SMS replies and delivery history for a phone number.
- `send_sms`: Send a new SMS message to a phone number.

### 🔧 Tool Functions

| Tool Name        | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| get_sms_context  | Fetch SMS reply and delivery context for a given phone number              |
| send_sms         | Send an SMS using format: `+61412345678::Your message here`                |

### ▶️ How to Use

1. Ensure you have `langchain`, `openai`, `requests`, and `langchain-openai` installed:
```bash
pip install -U langchain langchain-openai langchain-community openai requests
```

2. Set environment variables in `.env`:
```env
OPENAI_API_KEY=your-openai-key
MCP_SERVER_URL=http://localhost:3000
```

3. Run the agent script:
```bash
python langchain_mcp_agent.py
```

4. Ask natural language questions like:
```
Did +61412345678 reply to our last message?
Send a message to +61412345678 saying “Thanks for confirming.”
```

---

## 💬 Web Chat UI

Open `public/chat.html` to test the MCP server via GPT in your browser.

You can type questions like:
- “Who replied last to +61412345678?”
- “Send ‘hello’ to +6141***”

---

## 📊 Dashboards

- `/dashboard`: View logs of SMS delivery and replies
- `/inbox`: Browse full conversation history per number

---

## 🧾 OpenAPI + MCP Schema

- `/meta`: MCP server capabilities
- `/function-schema`: Function-call compatible schema for OpenAI
- `/openapi-mcp-spec.json`: OpenAPI definition

---

## 📦 Folder Structure

```
├── index.js                 # MCP server (core)
├── Openai-router.js         # /chat endpoint using OpenAI functions
├── langchain_mcp_agent.py   # Python LangChain agent
├── ai_sms_agent.py          # GPT-powered scratch agent with no dependency
├── public/
│   └── chat.html            # Frontend UI
├── conversations/           # Logs per phone number
├── webhook-log.json         # Delivery & reply webhook logs
├── Dockerfile / .env        # Deployment configs
```

---

## 🤖 Build-Your-Own AI Agent (From Scratch)

This project includes `ai_sms_agent.py`, a clean Python GPT agent that directly integrates with your MCP server using OpenAI.

### Features

- Understands natural language like:
  - “Did +6141*** reply to our last message?”
  - “Send ‘Thanks’ to +6141***”
- GPT decides the right tool and arguments
- Calls `/context` or `/send` as needed

### ✅ How to Use

1. Install required packages:
```bash
pip install openai requests python-dotenv
```

2. Set `.env` with:
```env
OPENAI_API_KEY=sk-...
MCP_SERVER_URL=http://localhost:3000
```

3. Run the agent:
```bash
python ai_sms_agent.py
```

4. Start chatting:
```
User: Show me SMS history of +61412345678
🤖 GPT: [calls /context and replies with summary]

User: Send message to +61412345678 saying "Your delivery is confirmed"
🤖 GPT: [calls /send and confirms]
```

This agent is fully decoupled from LangChain or frontends and serves as a backend intelligence layer that could power:

- Slack bots
- Web assistants
- Phone line AI copilots
- CRM sidebar AI widgets
---

## 📊 SMS Report Dashboard

This release adds a new `/report` endpoint and an HTML dashboard `sms_report_live_dashboard.html` that visualizes inbound and outbound SMS traffic with a high bar chart.

### Features:
- Uses real-time data via the `/report` endpoint
- Fetches data dynamically from the MessageMedia reporting API
- Displays SMS activity broken down by date
- Interactive bar chart powered by Chart.js

### How to View:
Start the server and navigate to:
```
http://localhost:3000/sms_report_live_dashboard.html
```

---

## 🏗️ Updated Architecture Overview

### Components:
- **index.js**: Core MCP server routing `/send`, `/context`, `/report`, `/meta`, and webhook handling.
- **Openai-router.js**: Handles GPT-powered assistant logic and tool execution.
- **sms_report_live_dashboard.html**: Visual report interface fetching live data from `/report`.
- **langchain_mcp_agent.py**: Python-based agent with integrated tools using LangChain.
- **MessageMedia API**: Source of truth for real SMS history.

### Endpoints:
- `/send`: Sends outbound SMS.
- `/context`: Fetches context based on SMS history (live via MessageMedia).
- `/report`: Aggregates inbound/outbound stats by date.
- `/meta` and `/function-schema`: MCP spec compliance for tool discovery.

### Tools:
- `get_sms_context`: Exposes reply/delivery history.
- `send_sms`: Allows agent to initiate communication.

---