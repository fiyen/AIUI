from memgpt import create_client
from memgpt.client.client import LocalClient

# Connect to the server as a user
client = create_client()

# Create an agent
agent_info = client.create_agent(
  name="my_agent1", 
  persona="You are a friendly agent.", 
  human="Bob is a friendly human."
)

# agent_info = LocalClient().get_agent(00000000-0000-0000-0000-000000000000)

# Send a message to the agent
messages = client.user_message(agent_id=agent_info.id, message="Hello, agent!")
# Create a helper that sends a message and prints the assistant response only
def send_message(message: str):
    """
    sends a message and prints the assistant output only.
    :param message: the message to send
    """
    response = client.user_message(agent_id=agent_info.id, message=message)
    for r in response:
        # Can also handle other types "function_call", "function_return", "function_message"
        if "assistant_message" in r:
            print("ASSISTANT:", r["assistant_message"])
        elif "internal_monologue" in r:
            print("THOUGHTS:", r["internal_monologue"])

# Send a message and see the response
send_message("Please introduce yourself and tell me about your abilities!")