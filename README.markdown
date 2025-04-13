# Zendesk MCP Server (Model Context Protocol)

This project is a lightweight, AI-native MCP (Model Context Protocol) server that integrates with Zendesk's REST APIs. It allows GPT-based AI agents (e.g. OpenAI, LangChain) to fetch real-time customer and organization context dynamically.

---

## Features

- Accepts `ticket_id`, `user_id`, or `organization_id`
- Fetches user, org, and ticket context from Zendesk
- Returns:
  - `summary`: human-readable LLM-friendly summary
  - `prompt_context`: single-line LLM embedding string
  - `context`: structured blocks (text, list)
  - `prompt_guidance`: usage instructions and few-shot examples
- Exposes:
  - `/context`: main context API
  - `/meta`: MCP schema metadata
  - `/function-schema`: OpenAI function-compatible definition
- Fully Dockerized and deployable
- Compatible with GPT-4 function calling

---

## Getting Started

### 1. Clone and install dependencies
```bash
git clone https://github.com/your-repo/zendesk-mcp-server
cd zendesk-mcp-server
npm install
```

### 2. Set up `.env`
```env
ZENDESK_DOMAIN=your-subdomain.zendesk.com
ZENDESK_EMAIL=your-email@yourdomain.com
ZENDESK_API_TOKEN=your_zendesk_api_token
PORT=3000
OPENAI_API_KEY=your_openai_key
MCP_SERVER_URL=http://mcp-server:3000
CHAT_PORT=4000
```

### 3. Run Locally
```bash
node index.js
```

Visit:
- `http://localhost:3000/context`
- `http://localhost:3000/meta`
- `http://localhost:3000/function-schema`

---

## Docker Support

### Build Image
```bash
docker build -t zendesk-mcp .
```

### Run Container
```bash
docker run -p 3000:3000 \
  -e ZENDESK_DOMAIN=your-subdomain.zendesk.com \
  -e ZENDESK_EMAIL=your-email \
  -e ZENDESK_API_TOKEN=your-token \
  zendesk-mcp
```

### Run with Docker Compose (Recommended for Multi-Service Setup)
```bash
docker-compose up --build
```
This starts both the MCP server and the OpenAI Chat API. Ensure you have `.env` configured as shown above.

---

## Function Calling with OpenAI (Example)

See `openai-client.js` for an example where:
- GPT-4 automatically detects and calls `get_ticket_context`
- The function calls your local MCP server
- GPT writes a natural reply using the returned context

### Simulating a Full Chat Conversation

What you've tested so far is GPT-4 calling your MCP server using function calling, which works. Now you want to simulate a full conversation where:

A user asks something natural like:
> “Can you give me context for ticket 12345?”

- GPT-4 figures out it needs to call `get_ticket_context`
- GPT-4 calls your MCP server automatically
- GPT-4 uses the result to reply in a natural, chat-style response

Let’s build exactly that — your own OpenAI Agent Loop that mimics how GPT-4 with tools (functions) will behave in production.

### ✅ Step-by-Step: Full Chat-Based OpenAI Agent with Function Calling

#### ✨ Final Output Looks Like:
```plaintext
User: Can you give me context for ticket 12345?
GPT: Sure! Here's what I found:

Alice Smith is a Premium customer under Acme Corp. She submitted 3 tickets recently. The latest ticket is titled "Login timeout" and is currently open.
```

### What This Script Does:
- Sends a natural user message to GPT-4
- GPT-4 detects your function, calls it with a `ticket_id`
- You send that to your MCP server
- Feed the MCP server’s context result back to GPT
- GPT-4 writes a human-style response using the result

---

## Web Chat Interface + OpenAI Router API

To demonstrate end-to-end usage with real input/output, this project includes:

### 1. `/chat` API endpoint (`openai-router.js`)
A Node.js API that accepts natural language messages, detects intent using GPT-4 + function calling, and uses the MCP server to fetch data and compose replies.

#### 🔧 .env additions:
```env
OPENAI_API_KEY=your_openai_key
MCP_SERVER_URL=http://mcp-server:3000
CHAT_PORT=4000
```

#### ▶️ Run the API:
```bash
node openai-router.js
```

This starts a server at `http://localhost:4000/chat`

### 2. `chat-ui.html`
A simple HTML frontend to type user prompts and see AI-generated responses with Zendesk context.

#### 🧪 Example Questions:
- Who is the user for ticket 12345?
- Tell me about organization 78901
- How many tickets has user 112233 opened?

#### 💬 Usage
- Open `chat-ui.html` in a browser
- Ensure the `/chat` endpoint is running with CORS enabled
- Ask questions and see the result appear naturally

#### 🔐 Note
Make sure you install and enable CORS in `openai-router.js`:
```js
const cors = require('cors');
app.use(cors());
```

---

## Future Enhancements

- LangChain tool compatibility
- Redis caching layer
- Rate limiting
- More context types: `/orders`, `/billing`, `/subscriptions`

---

## License
MIT

---

## Author
Your Name — [@yourhandle](https://github.com/yourhandle)
