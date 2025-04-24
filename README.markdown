# 📱 Sinch MCP GPT SMS Server

An AI-native SMS assistant powered by GPT and MessageMedia — now with a live SMS report dashboard!

## ✅ Features

- Send and receive SMS via GPT
- View full SMS conversation history
- Auto-reply via GPT using webhook
- Contextual memory per phone number
- MCP-compliant with `/meta` and `/function-schema`
- LangChain agent integration
- 📊 Live SMS Report Dashboard (NEW!)

## 📊 Live Dashboard Preview

Below is a screenshot of the embedded high bar chart showing SMS volume:

![SMS Report Screenshot](sms_report_preview.png)

## 🧠 Architecture Overview

```plaintext
User ↔ chat.html
     ↕
GPT Chat Server (OpenAI-router.js)
     ↕ (tool calls)
MCP Server (index.js)
     ↕
MessageMedia SMS API
```

- `index.js`: Core MCP server, webhook processor, `/context` + `/send` + `/report` endpoints
- `Openai-router.js`: ChatGPT proxy handling tool calls via OpenAI Functions
- `chat.html`: Interactive frontend for messaging and tools
- `sms_report_live_dashboard.html`: Live chart using `/report`

## 🛠️ How to Run

```bash
npm install
OPENAI_API_KEY=your_key node start-all.js
```

- Access Chat UI: [http://localhost:3000/chat.html](http://localhost:3000/chat.html)
- Access Report Dashboard: [http://localhost:3000/sms_report_live_dashboard.html](http://localhost:3000/sms_report_live_dashboard.html)

## 📂 Folder Structure

```plaintext
.
├── index.js                # MCP Server
├── Openai-router.js        # GPT Chat Interface
├── webhook-log.json        # Legacy logs (if not using MessageMedia)
├── chat.html               # GPT chat client
├── sms_report_live_dashboard.html  # Dashboard with Chart.js
├── langchain_mcp_agent.py  # LangChain integration script
├── .env                    # Environment variables
├── public/
│   └── sms_report_preview.png  # Chart screenshot
```

## 📦 Tools

- [x] `get_sms_context`
- [x] `send_sms`
- [x] `show_sms_report` (NEW)

## 📍 Roadmap

- 🔄 Auto-classification of replies
- 📈 Sentiment + urgency scoring
- 🤖 Unified Copilot with webhook/CLI/chat

## 📊 SMS Report Chart

A new feature has been added to display a live dashboard of SMS volume by day.

You can now ask in the `chat.html` interface:

> "Show me my report history of +61412345678"

The assistant will respond with an embedded report like this:

![SMS Report Chart](./chart.png)