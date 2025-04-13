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

Install deps:
```bash
npm install
```

Start locally:
```bash
node start-all.js
```

Visit:
- [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- [http://localhost:4000/chat](http://localhost:4000/chat)
- Open `chat-ui.html` in browser

---

## 🚀 Deployment to Railway

1. Push code to GitHub
2. Go to [https://railway.app](https://railway.app)
3. Create new project → **Deploy from GitHub**
4. Railway auto-detects your `Dockerfile`
5. Set env vars in **Variables** tab
6. Done ✅

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

## 🔐 Security & Limits

- All routes require: `Authorization: Bearer <API_TOKEN>`
- Rate limited to 30 requests/min per IP (via express-rate-limit)

---

## 🧠 Future Ideas

- Auto-reply via `/webhook/reply` using GPT
- Redis cache for faster context access
- LangChain integration
- GPT-4o voice/text in chat-ui

---

## 👨‍💻 Author

Built by @larryfang with ❤️