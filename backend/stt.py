import logging
import os
import shutil
import time
import uuid

import ffmpeg
import openai

from .util import delete_file

from dotenv import load_dotenv
load_dotenv()

LANGUAGE = os.getenv("LANGUAGE", "en")

APIKEY = os.getenv("OPENAI_API_KEY")
BASEURL = os.getenv("OPENAI_BASE_URL")

openai.api_key = APIKEY
openai.api_base = f"{BASEURL}/v1"


async def transcribe(audio):
    start_time = time.time()
    initial_filepath = f"/tmp/{uuid.uuid4()}{audio.filename}"

    with open(initial_filepath, "wb+") as file_object:
        shutil.copyfileobj(audio.file, file_object)

    converted_filepath = f"/tmp/ffmpeg-{uuid.uuid4()}{audio.filename}"

    logging.debug("running through ffmpeg")
    (
        ffmpeg
        .input(initial_filepath)
        .output(converted_filepath, loglevel="error")
        .run()
    )
    logging.debug("ffmpeg done")

    read_file = open(converted_filepath, "rb")

    logging.debug("calling whisper")
    transcription = (await openai.Audio.atranscribe("whisper-1", read_file, language=LANGUAGE))["text"]
    logging.info("STT response received from whisper in %s %s", time.time() - start_time, 'seconds')
    logging.info('user prompt: %s', transcription)

    # delete_file(converted_filepath)

    return transcription
