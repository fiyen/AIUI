import os
import time
import uuid

import requests
from gtts import gTTS
from pydub import AudioSegment

from app.util import delete_file


def _get_tts_provider():
    if LANGUAGE == "en":
        return "gTTS"

    tts_provider = os.getenv("TTS_PROVIDER", "STREAMELEMENTS")
    return tts_provider


LANGUAGE = os.getenv("LANGUAGE", "en")
TTS_PROVIDER = _get_tts_provider()
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", None)
AUDIO_SPEED = os.getenv("AUDIO_SPEED", None)


def to_speech(text):
    if TTS_PROVIDER == "gTTS":
        return _gtts_to_speech(text)
    elif TTS_PROVIDER == "ELEVENLABS":
        return _elevenlabs_to_speech(text)
    elif TTS_PROVIDER == "STREAMELEMENTS":
        return _streamelements_to_speech(text)
    else:
        raise ValueError(f"env var TTS_PROVIDER set to unsupported value: {TTS_PROVIDER}")


def _gtts_to_speech(text):
    start_time = time.time()

    tts = gTTS(text, lang=LANGUAGE)
    filepath = f"/tmp/{uuid.uuid4()}.mp3"
    tts.save(filepath)

    speed_adjusted_filepath = _adjust_audio_speed(filepath)

    print('TTS time:', time.time() - start_time, 'seconds')
    return speed_adjusted_filepath


def _elevenlabs_to_speech(text):
    start_time = time.time()

    response = requests.post(
        url="https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL",
        headers={
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
        },
        json={"text": text}
    )

    filepath = f"/tmp/{uuid.uuid4()}.mp3"
    with open(filepath, "wb") as f:
        f.write(response.content)

    speed_adjusted_filepath = _adjust_audio_speed(filepath)

    print('TTS time:', time.time() - start_time, 'seconds')
    return speed_adjusted_filepath


def _streamelements_to_speech(text):
    start_time = time.time()

    response = requests.get(f"https://api.streamelements.com/kappa/v2/speech?voice=Salli&text={text}")

    filepath = f"/tmp/{uuid.uuid4()}.mp3"
    with open(filepath, "wb") as f:
        f.write(response.content)

    speed_adjusted_filepath = _adjust_audio_speed(filepath)

    print('TTS time:', time.time() - start_time, 'seconds')
    return speed_adjusted_filepath


def _adjust_audio_speed(audio_filepath):
    if AUDIO_SPEED is None:
        return audio_filepath

    audio = AudioSegment.from_mp3(audio_filepath)
    faster_audio = audio.speedup(playback_speed=float(AUDIO_SPEED))

    speed_adjusted_filepath = f"/tmp/{uuid.uuid4()}.mp3"
    faster_audio.export(speed_adjusted_filepath, format="mp3")

    delete_file(audio_filepath)

    return speed_adjusted_filepath
