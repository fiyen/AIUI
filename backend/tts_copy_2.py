import logging
import os
import time
import uuid
import json

import requests
from gtts import gTTS
import edge_tts
from elevenlabs import generate, save
from typing import AsyncGenerator, Dict, Any

from .util import delete_file

from dotenv import load_dotenv
load_dotenv()

LANGUAGE = os.getenv("LANGUAGE", "en")
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "EDGETTS")

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", None)
ELEVENLABS_VOICE = os.getenv("ELEVENLABS_VOICE", "EXAVITQu4vr4xnSDxMaL")
EDGETTS_VOICE = os.getenv("EDGETTS_VOICE", "en-US-EricNeural")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL")


async def to_speech(text, background_tasks):
    if TTS_PROVIDER == "gTTS":
        # print("gTTS")
        return _gtts_to_speech(text, background_tasks)
    elif TTS_PROVIDER == "ELEVENLABS":
        # print("ELEVENLABS")
        return _elevenlabs_to_speech(text, background_tasks)
    elif TTS_PROVIDER == "STREAMELEMENTS":
        # print("STREAMELEMENTS")
        return _streamelements_to_speech(text, background_tasks)
    elif TTS_PROVIDER == "EDGETTS":
        # print("EDGETTS")
        return await _edge_tts_to_speech(text, background_tasks)
    elif TTS_PROVIDER == 'OPENAITTS':
        return await _openai_tts_to_speech(text, background_tasks)
    else:
        raise ValueError(f"env var TTS_PROVIDER set to unsupported value: {TTS_PROVIDER}")


async def _openai_tts_to_speech(text, background_tasks):
    start_time = time.time()
    filepath = f"/tmp/{uuid.uuid4()}.mp3"

    VOICE = os.getenv("OPENAI_VOICE", 'alloy')

    url = f"{OPENAI_BASE_URL}/v1/audio/speech"

    payload = json.dumps({
        "model": "tts-1",
        "input": text,
        "voice": VOICE
    })
    headers = {
        'Authorization': f'Bearer {OPENAI_API_KEY}',
        'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
        'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=payload, stream=True)
    
    # 以二进制写入模式打开文件并逐步写入数据
    async def generate_audio_stream():
        only_once = False
        for chunk in response.iter_content(chunk_size=1024):
            if not only_once:
                logging.info('TTS time start return: %s %s', time.time() - start_time, 'seconds')
                only_once = True
            yield chunk
        logging.info('TTS time return over: %s %s', time.time() - start_time, 'seconds')
    return generate_audio_stream


async def _edge_tts_to_speech(text, background_tasks):
    start_time = time.time()

    communicate = edge_tts.Communicate(text, EDGETTS_VOICE)
    filepath = f"/tmp/{uuid.uuid4()}.mp3"
    await communicate.save(filepath)

    background_tasks.add_task(delete_file, filepath)

    logging.info('TTS time: %s %s', time.time() - start_time, 'seconds')
    return filepath


def _gtts_to_speech(text, background_tasks):
    start_time = time.time()

    tts = gTTS(text, lang=LANGUAGE)
    filepath = f"/tmp/{uuid.uuid4()}.mp3"
    tts.save(filepath)

    background_tasks.add_task(delete_file, filepath)

    logging.info('TTS time: %s %s', time.time() - start_time, 'seconds')
    return filepath


def _elevenlabs_to_speech(text, background_tasks):
    start_time = time.time()

    audio = generate(
        api_key=ELEVENLABS_API_KEY,
        text=text,
        voice=ELEVENLABS_VOICE,
        model="eleven_monolingual_v1"
    )

    filepath = f"/tmp/{uuid.uuid4()}.mp3"
    save(audio, filepath)

    background_tasks.add_task(delete_file, filepath)

    logging.info('TTS time: %s %s', time.time() - start_time, 'seconds')
    return filepath


def _streamelements_to_speech(text, background_tasks):
    start_time = time.time()

    response = requests.get(f"https://api.streamelements.com/kappa/v2/speech?voice=Salli&text={text}")

    filepath = f"/tmp/{uuid.uuid4()}.mp3"
    with open(filepath, "wb") as f:
        f.write(response.content)

    background_tasks.add_task(delete_file, filepath)

    logging.info('TTS time: %s %s', time.time() - start_time, 'seconds')
    return filepath

async def stream_to_bytes(audio_stream: AsyncGenerator[Dict[str, Any], None]) -> bytes:
    audio_bytes = b''
    async for chunk in audio_stream:
        if chunk["type"] == "audio":
            audio_bytes += chunk["data"]
    return audio_bytes
