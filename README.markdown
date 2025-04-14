
# 📱 AI-Native SMS Assistant (V1)

An AI-powered SMS assistant that integrates with MessageMedia to send, receive, and manage SMS conversations. Built with Node.js and OpenAI's GPT-4, it provides real-time context-aware messaging and a user-friendly dashboard.

---

## 🚀 Features

- **Send SMS**: Send messages via the `/send` endpoint.
- **Receive & Auto-Reply**: Handle incoming messages with GPT-generated responses.
- **Contextual Insights**: Retrieve conversation context through the `/context` endpoint.
- **Dashboard**: Visualize message logs and statuses.
- **Chat Interface**: Interact with the assistant via a web-based chat UI.
- **Function Schema**: OpenAI-compatible function schema for integration.

---

## 🛠️ Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yourusername/ai-sms-assistant.git
   cd ai-sms-assistant
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment variables**:

   Create a `.env` file in the root directory and add the following:

   ```env
   OPENAI_API_KEY=your_openai_api_key
   MESSAGE_API_KEY=your_messagemedia_api_key
   MESSAGE_API_SECRET=your_messagemedia_api_secret
   MESSAGE_BASE_URL=https://api.messagemedia.com
   MCP_SERVER_URL=http://localhost:3000
   ```

4. **Start the server**:

   ```bash
   node index.js
   ```

   The server will be running at `http://localhost:3000`.

---

## 🧪 Usage

- **Send SMS**:

  ```bash
  POST /send
  {
    "messages": [
      {
        "destination_number": "+61400000000",
        "content": "Hello, this is a test message."
      }
    ]
  }
  ```

- **Retrieve Context**:

  ```bash
  POST /context
  {
    "phone_number": "+61400000000"
  }
  ```

- **Access Dashboard**:

  Navigate to `http://localhost:3000/dashboard` to view message logs.

- **Chat Interface**:

  Open `http://localhost:3000/chat.html` in your browser to interact with the assistant.

---

## 📂 Project Structure

- `index.js`: Main server file with route implementations.
- `public/`: Static files including `chat.html`.
- `conversations/`: Stored conversation logs per user.
- `webhook-log.json`: Logs of incoming and outgoing messages.

---

## 🏗️ Architecture

### Overview

The AI-Native SMS Assistant is designed to facilitate seamless SMS communication by integrating OpenAI's GPT-4 for intelligent responses and MessageMedia for message delivery.

### Components

1. **Express Server (`index.js`)**
   - Endpoints: `/send`, `/context`, `/webhook/reply`, `/webhook/delivery`, `/dashboard`, `/meta`, `/function-schema`.

2. **OpenAI Integration**
   - Generates context-aware responses and classifies user intents.

3. **MessageMedia Integration**
   - Sends and receives SMS messages and delivery reports.

4. **Chat Interface (`public/chat.html`)**
   - Web-based interface for interacting with the assistant.

### Data Flow

- Sending Messages → via `/send`
- Receiving & Auto-reply → via `/webhook/reply`
- Context Retrieval → via `/context`
- Logs UI → via `/dashboard`
- Chat + Function Calls → via `/chat.html`

---

## 🎬 Demo Script

### Duration: ~5 minutes

#### ✅ Introduction

"Welcome to the AI-Native SMS Assistant demo. Today, we'll showcase how this assistant streamlines SMS communications using OpenAI's GPT-4 and MessageMedia."

#### ✅ Sending an SMS

"We'll use the `/send` endpoint to dispatch a greeting to a user."

#### ✅ Receiving and Auto-Replying

"Simulate an incoming message. The assistant processes it and replies intelligently."

#### ✅ Retrieving Conversation Context

"Use the `/context` endpoint to view message history and delivery reports."

#### ✅ Exploring the Dashboard

"Visit `/dashboard` to explore message logs visually."

#### ✅ Chat Interface

"Interact naturally via `chat.html`. It detects phone numbers, triggers GPT tools, and shows results contextually."

---

## 📄 License

MIT License
