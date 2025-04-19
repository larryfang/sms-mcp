import os
import requests
from langchain.agents import Tool, initialize_agent
from langchain.agents.agent_types import AgentType
from langchain.chat_models import ChatOpenAI
print("✅ Script started")
MCP_SERVER = os.getenv("MCP_SERVER_URL", "http://localhost:3000")


# Tool: Get SMS Context
def get_sms_context_tool(input: str) -> str:
    res = requests.post(f"{MCP_SERVER}/context", json={"phone_number": input})
    if res.status_code != 200:
        return f"Failed to retrieve context: {res.text}"
    data = res.json()
    return data.get("summary") or "No context found."

# Tool: Send SMS
def send_sms_tool(input: str) -> str:
    try:
        parts = input.split("::")
        if len(parts) != 2:
            return "Format must be: number::message"
        destination, content = parts
        payload = {
            "messages": [{
                "destination_number": destination.strip(),
                "content": content.strip(),
                "format": "SMS",
                "delivery_report": True
            }]
        }
        res = requests.post(f"{MCP_SERVER}/send", json=payload)
        return f"✅ Message sent! {res.json()}" if res.ok else f"❌ Failed: {res.text}"
    except Exception as e:
        return f"Error: {e}"

# Define LangChain Tools
tools = [
    Tool.from_function(
        name="get_sms_context",
        func=get_sms_context_tool,
        description="Fetch SMS reply and delivery context for a phone number. Input: a phone number like '+61412345678'."
    ),
    Tool.from_function(
        name="send_sms",
        func=send_sms_tool,
        description="Send an SMS to a user. Input format: '+61412345678::Your message here'"
    )
]

# LangChain Agent
llm = ChatOpenAI(temperature=0, model="gpt-4")
print("✅ Initializing LangChain agent...")
agent = initialize_agent(tools, llm, agent=AgentType.OPENAI_FUNCTIONS, verbose=True)

# Interactive Loop
print("🤖 LangChain MCP Assistant ready.")
while True:
    try:
        user_input = input("🧠 Ask something (or 'exit'): ")
        if user_input.lower() in ["exit", "quit"]:
            break
        answer = agent.run(user_input)
        print("🔎", answer)
    except Exception as e:
        print("⚠️ Error:", e)
