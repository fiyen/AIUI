import json
import openai
import base64
import logging
import os
import time


openai.api_key = "sk-SAjwdnzO9CC968qj03370c84305849E88bB877F9688cC477"
openai.api_base = "https://newapi.yybot.tech/v1"

messages = [
    {
        "role": "system",
        "content": "你是一个人工智能助手，请用中文回复问题。"
    }
]
messages.append({"role": "user", "content": "这是一个测试，请回答你好。"})

res = openai.ChatCompletion.create(model="gpt-3.5-turbo-0125", messages=messages, timeout=15)

print(res)

completion = res['choices'][0]['message']['content']

print(completion)