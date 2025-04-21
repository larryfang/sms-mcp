from langchain_openai import ChatOpenAI
from langchain.agents import initialize_agent, Tool
from langchain.agents.agent_types import AgentType
from langchain.tools import tool
import requests
import logging
import os

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Your MCP server URL (make sure this is set in your environment)
MCP_SERVER = os.getenv("MCP_SERVER_URL", "http://localhost:3000")

# Tool: Get SMS Context
@tool
def get_sms_context_tool(phone_number: str) -> str:
    """Get the recent SMS context for a given phone number."""
    res = requests.post(f"{MCP_SERVER}/context", json={"phone_number": phone_number})
    if res.status_code != 200:
        return f"❌ Failed to retrieve context: {res.text}"
    data = res.json()

    summary = data.get("summary", "No summary available.")
    prompt = data.get("prompt_context", "")
    context_blocks = data.get("context", [])

    reply_block = ""
    for section in context_blocks:
        label = section.get("label", "Context")
        lines = "\n".join(
            f"- {v.get('content') or v.get('status') or '[no content]'}  ({v.get('date_received', 'no date')})"
            if isinstance(v, dict) else f"- {v}"
            for v in section.get("value", [])
        )
        reply_block += f"\n📌 {label}:\n{lines}\n"

    return f"""📬 SMS Summary for {phone_number}:
{summary}

🧠 GPT Prompt Context: {prompt}
{reply_block}"""

# Tool: Send SMS
@tool
def send_sms_tool(destination_number: str, content: str) -> str:
    """Send an SMS to the specified phone number."""
    res = requests.post(f"{MCP_SERVER}/send", json={
        "messages": [
            {
                "destination_number": destination_number,
                "content": content,
                "format": "SMS",
                "delivery_report": True
            }
        ]
    })
    if res.status_code != 200:
        return f"❌ Failed to send SMS: {res.text}"

    data = res.json()
    return f"✅ Message sent to {destination_number}. Message ID: {data.get('message_id')}"

# Set up OpenAI model
llm = ChatOpenAI(model="gpt-4", temperature=0)

# Define agent tools
tools = [get_sms_context_tool, send_sms_tool]

# Initialize agent
agent_executor = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.OPENAI_FUNCTIONS,
    verbose=True
)

# Run loop for user testing
if __name__ == "__main__":
    while True:
        try:
            user_input = input("🧠 Ask something (or type 'exit'): ")
            if user_input.lower() in ["exit", "quit"]:
                break
            result = agent_executor.run(user_input)
            print("🤖", result)
        except Exception as e:
            print("❌ Error:", e)
