import base64
import json
import time
import logging

from fastapi import FastAPI, UploadFile, BackgroundTasks, Header, Response
from fastapi.responses import FileResponse
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .ai import get_completion
from .stt import transcribe
from .tts import to_speech

REMINDER_PROMPT = "Please note that the person you are chatting with has not replied for a long time. Take the initiative to start the conversation based on the chat history and provide reasonable advice to eliminate the tension of the person you are talking to, encouraging them to continue the conversation.Strictly control the length of your response, keeping it within 20 words."

app = FastAPI()
logging.basicConfig(level=logging.INFO)

# 允许的源列表，可以是具体的域名或'*'（代表所有源）
origins = [
    "http://localhost:3000",  # 允许前端应用的源
    # "http://anotherfrontend.com", # 如果你有其他前端域名，也可以添加到这个列表中
]

# 添加CORSMiddleware到应用中，允许跨源请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # 允许访问的源列表
    allow_credentials=True,  # 允许携带cookies
    allow_methods=["*"],  # 允许的请求方法
    allow_headers=["*"],  # 允许的请求头
    expose_headers=["text"]  # 允许前端访问的自定义响应头
)


@app.post("/inference")
async def infer(audio: UploadFile, background_tasks: BackgroundTasks,
                conversation: str = Header(default=None),
                reminder: bool=Header(default=False)) -> FileResponse:
    logging.debug("received request")
    start_time = time.time()

    if not reminder:
        user_prompt_text = await transcribe(audio)
    else:
        user_prompt_text = REMINDER_PROMPT
    ai_response_text = await get_completion(user_prompt_text, conversation)
    ai_response_audio_filepath = await to_speech(ai_response_text, background_tasks)

    logging.info('total processing time: %s %s', time.time() - start_time, 'seconds')
    return FileResponse(path=ai_response_audio_filepath, media_type="audio/mpeg",
                        headers={"text": _construct_response_header(user_prompt_text, ai_response_text)})


# @app.get("/")
# async def root():
#     return RedirectResponse(url="/index.html")


# app.mount("/", StaticFiles(directory="frontend/dist"), name="static")


def _construct_response_header(user_prompt, ai_response):
    return base64.b64encode(
        json.dumps(
            [{"role": "user", "content": user_prompt}, {"role": "assistant", "content": ai_response}]).encode(
            'utf-8')).decode("utf-8")
