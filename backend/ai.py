import base64
import json
import logging
import os
import time

import openai

from dotenv import load_dotenv
load_dotenv()


APIKEY = os.getenv("OPENAI_API_KEY")
BASEURL = os.getenv("OPENAI_BASE_URL")

openai.api_key = APIKEY
openai.api_base = f"{BASEURL}/v1"

AI_COMPLETION_MODEL = os.getenv("AI_COMPLETION_MODEL", "gpt-3.5-turbo-1106")
LANGUAGE = os.getenv("LANGUAGE", "en")
INITIAL_PROMPT = "You are a skilled and patient English conversation teacher adept at engaging with students in a dialogue to improve their English speaking abilities. During the conversation, your role is to converse with the student, provide guidance on speaking English, respond suitably to the student's statements, naturally introduce new topics or continue existing ones, and maintain control over the direction of the conversation. One important thing you should never forget: you shold split your response into shorter sentence with about 10 words, splitting by '\n', do not forget this symbol."


async def get_completion(user_prompt, conversation_thus_far):
    if _is_empty(user_prompt):
        raise ValueError("empty user prompt received")

    start_time = time.time()
    messages = [
        {
            "role": "system",
            "content": INITIAL_PROMPT
        }
    ]

    messages.extend(json.loads(base64.b64decode(conversation_thus_far)))
    messages.append({"role": "user", "content": user_prompt})

    logging.debug("calling %s", AI_COMPLETION_MODEL)
    res = await openai.ChatCompletion.acreate(model=AI_COMPLETION_MODEL, messages=messages, timeout=15)
    logging.info("response received from %s %s %s %s", AI_COMPLETION_MODEL, "in", time.time() - start_time, "seconds")

    completion = res['choices'][0]['message']['content']
    logging.info('%s %s %s', AI_COMPLETION_MODEL, "response:", completion)

    return completion


def _is_empty(user_prompt: str):
    return not user_prompt or user_prompt.isspace()
