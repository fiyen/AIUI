import asyncio
import aiohttp
import json
import os
import logging
import time
import uuid
import re

from dotenv import load_dotenv
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_VOICE = os.getenv("OPENAI_VOICE", 'alloy')
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL")

async def fetch_tts(client, text):
    url = f"{OPENAI_BASE_URL}/v1/audio/speech"
    payload = json.dumps({
        "model": "tts-1",
        "input": text,
        "voice": OPENAI_VOICE
    })
    headers = {
        'Authorization': f'Bearer {OPENAI_API_KEY}',
        'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
        'Content-Type': 'application/json'
    }
    # 使用 aiohttp 发送异步请求
    async with client.post(url, headers=headers, data=payload) as response:
        # 确保响应状态正确
        response.raise_for_status() 
        # 读取整个响应的音频内容
        return await response.read()  # 读取整个内容作为bytes返回


def split_text(text, n_words=3):
    """
    用".", ","切分text，并保证切分后的句子的单词数都大于n_words.
    """
    text_list = text.strip().split('\n')
    if len(text_list) > 2:
        return [t for t in text_list if t]
    # 先根据句号切分文本
    text_list = re.split(r'\.', text)
    text_list = [t + '.' for t in text_list if t]
    # 对每个句子再根据逗号切分，并判断切分后的句子长度是否都大于等于3
    revised_text_list = []
    for split_symbol in [',', '?', '!']:
        for sentence in text_list:
            sub_sentences = sentence.split(split_symbol)
            ori_len = len(sub_sentences)
            sub_sentences = [sub_s.strip() for sub_s in sub_sentences if len(sub_s.split()) >= n_words]
            sub_sentences = [sub_s + split_symbol for sub_s in sub_sentences[:-1]] + sub_sentences[-1:]
            if len(sub_sentences) == ori_len:  # 如果相等，表明切分后的所有句子都大于n_words个单词。
                revised_text_list.extend(sub_sentences)
            else:
                revised_text_list.append(sentence.strip())
        text_list = [t for t in revised_text_list if t]
        revised_text_list = []

    return text_list


# async def stream_tts_responses(text):
#     start_time = time.time()
#     text_chunks = split_text(text)
#     print(text_chunks)

#     async def generate_audio_stream():
#         async with aiohttp.ClientSession() as client:
#             tasks = [fetch_tts(client, text) for text in text_chunks]
#             audio_chunks = await asyncio.gather(*tasks)  # 收集所有生成的音频chunk
#             for chunk in audio_chunks:  # 逐个yield
#                 yield chunk
#             logging.info('TTS time return over: %s %s', time.time() - start_time, 'seconds')

#     return generate_audio_stream()  # 注意这里直接调用函数来获取生成器
async def stream_tts_responses(text):
    start_time = time.time()
    text_chunks = split_text(text)
    print(text_chunks)

    async def generate_audio_stream():
        async with aiohttp.ClientSession() as client:
            # 创建所有任务，但不立即等待它们
            tasks = [asyncio.create_task(fetch_tts(client, text_chunk)) for text_chunk in text_chunks]

            # 按照文本块的原始顺序返回结果
            for task in tasks:
                try:
                    audio_chunk = await task
                    yield audio_chunk
                except Exception as e:
                    logging.error('Error during TTS processing: %s', e)
                    # 如果需要，可以在这里生成一个错误的音频块，或者直接跳过
        logging.info('TTS time return over: %s %s', time.time() - start_time, 'seconds')
    return generate_audio_stream()  # Get the generator function to stream audio

# 注意，如果在FastAPI中使用上述代码应确保endpoint是异步的，并且能正确处理异步生成器


