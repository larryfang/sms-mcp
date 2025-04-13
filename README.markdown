# 📦 AI-Powered MCP Server (MessageMedia + OpenAI)

This project is a full-stack AI-native SMS assistant built around the Model Context Protocol (MCP). It integrates:

- ✅ GPT-4 function calling
- ✅ MessageMedia SMS API (send, receive, delivery reports)
- ✅ Express-based webhook + chat server
- ✅ `/context` endpoint for AI memory
- ✅ HTML UI, OpenAI router, and message log dashboard
- ✅ GitHub + Railway-compatible Docker deployment

---

## 📁 Project Structure

```
├── index.js             # MCP API server (context, send, webhooks)
├── openai-router.js     # GPT interface w/ function calling
├── start-all.js         # Starts both servers (for Docker)
├── webhook-log.json     # Logs delivery + reply events
├── conversations/       # Per-user GPT conversation logs
├── chat-ui.html         # Simple browser-based chatbot
├── Dockerfile           # Deployment container
├── .env                 # Environment variables (NOT committed)
```

---

## ⚙️ .env File Format

Create a `.env` file like this:

```
MESSAGE_API_KEY=your_api_key
MESSAGE_API_SECRET=your_secret
MESSAGE_BASE_URL=https://api.messagemedia.com
OPENAI_API_KEY=your_openai_key
MCP_SERVER_URL=http://localhost:3000
CHAT_PORT=4000
PORT=3000
API_TOKEN=your_protected_token
```

---

## 🧪 Local Testing

Install dependencies:
```bash
npm install
```

Start servers locally:
```bash
node start-all.js
```

Visit:
- [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- [http://localhost:4000/chat](http://localhost:4000/chat)
- Open `chat-ui.html` in browser

---

## 🐳 Docker Deployment

### Build and run locally with Docker

```bash
docker build -t mcp-sms .
docker run -p 3000:3000 -p 4000:4000 --env-file .env mcp-sms
```

### Required Ports
- `3000` for MCP context + webhook server
- `4000` for GPT chat API

Make sure `.env` exists in the same directory.

---

## 🚀 Deployment to Railway

1. Push your code to GitHub
2. Visit [https://railway.app](https://railway.app)
3. Create a **new project** → Deploy from GitHub
4. Railway will auto-detect the `Dockerfile`
5. Add all `.env` variables in the **Variables** tab
6. Deploy and monitor logs

---

## 🔁 GPT Functions Supported

### 1. get_sms_context

> Ask: “What’s the message history for +61412345678?”

Returns:
- Summary of last replies + delivery reports
- Prompt-friendly context

### 2. send_sms

> Ask: “Send an SMS to +61412345678 saying: your order is ready.”

Triggers:
- MessageMedia API via `/send`
- GPT reply in chat UI

---

## 🔐 Security & Rate Limiting

- Requires `Authorization: Bearer <API_TOKEN>` on all routes
- Limited to **30 requests per minute per IP**

---

## 🧠 Future Ideas

- 🔁 GPT auto-replies to incoming SMS via `/webhook/reply`
- 📥 Redis cache layer for `/context`
- 🔌 LangChain tools support
- 🧑‍💻 Admin UI to view/send messages manually

---

## 👨‍💻 Author

Built by @larryfang with ❤️