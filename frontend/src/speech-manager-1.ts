import { particleActions } from "./particle-manager.ts";
import { SpeechPlayer } from "./player.ts";
import { utils } from "@ricky0123/vad-react"

let sourceIsStarted = false;
let speechEndTimer: ReturnType<typeof setTimeout> | null = null;
let player: SpeechPlayer | undefined;
const speechEndTimeoutThreshold = 150000; // Set to 15 seconds

const conversationThusFar = [];

// const Url = "https://test.yangyang-backend.cn";
const Url = "http://127.0.0.1:8000";

export const onSpeechStart = debounce( async (record) => {
    console.log("speech started");
    particleActions.onUserSpeaking();
    stopSourceIfNeeded();
    await record.connectWebSocket();
}, 1000);

export const onSpeechEnd = debounce(async (audio, record) => {
    console.log("speech ended");
    resetSpeechEndTimer();
    // 等待录音停止并获取最终识别结果
    const blob = createAudioBlob(audio);
    await validate(blob);
    await record.doSTT(blob);
    await fastProcessAudio(record);
}, 1000);

export const onMisfire = (record) => {
    console.log("vad misfire");
    record.forceStop();
    // record.setStatus(null);
    particleActions.reset();
};

export const initSpeechEndTimer = (record) => {
    speechEndTimer = setTimeout(() => {
        // 在此处填充特定文本，并调用sendData。例如:
        console.log("No speech detected. Auto triggering conversation.");
        fastSendData(record, true);
    }, speechEndTimeoutThreshold);
};

const createAudioBlob = (audio) => {
    const wavBuffer = utils.encodeWAV(audio);
    return new Blob([wavBuffer], { type: 'audio/wav' });
};

const stopSourceIfNeeded = () => {
    if (player && sourceIsStarted) {
        console.log("Need to stop player.")
        resetSpeechEndTimer();
        sourceIsStarted = false;
        player.pause();
    }

};

const fastProcessAudio = async (record) => {
    particleActions.onProcessing();
    fastSendData(record);
}

const fastSendData = (record, reminder=false) => {
    console.log("sending data");
    resetSpeechEndTimer(); // Reset timer whenever speech ends
    fetch(`${Url}/inference`, {
        method: "POST",
        body: JSON.stringify({ text: record.perText }),
        headers: {
            'conversation': base64Encode(JSON.stringify(conversationThusFar)),
            'reminder': reminder.toString()
        }
    })
        .then(handleResponse)
        .then(handleSuccess(record))
        .catch(handleError);
};

function base64Encode(str: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    return window.btoa(String.fromCharCode(...new Uint8Array(data)));
}

function base64Decode(base64: string) {
    const binaryStr = window.atob(base64);
    const bytes = new Uint8Array([...binaryStr].map((char) => char.charCodeAt(0)));
    return new TextDecoder().decode(bytes);
}

// 防抖动设置，务必选择，因为vad会触发多次录音，导致一次问题有多个post，拖慢后台回复时间。
function debounce(func, delay) {
    let debounceTimer;
    return function(...args) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }

function resetSpeechEndTimer() {
    console.log("resetSpeechEndTimer")
    clearTimeout(speechEndTimer);
    speechEndTimer = null;
    console.log("SpeechEndTimer Reset");
}

const handleResponse = async (res) => {
    if (!res.ok) {
        return res.text().then(error => {
            throw new Error(error);
        });
    }

    const newMessages = JSON.parse(base64Decode(res.headers.get("text")));
    conversationThusFar.push(...newMessages);

    return res;
};

const handleSuccess = (record) => async (response) => {
    stopSourceIfNeeded();
    sourceIsStarted = true;
    const audioEl = document.querySelector('audio');
    player = new SpeechPlayer({
        audio: audioEl,
        onPlaying: () => {},
        onPause: () => {onAiSpeakEnded(record)},
        onChunkEnd: () => {onAiSpeakEnded(record)},
        mimeType: 'audio/mpeg',
      });
    await player.init();
    player.feedWithResponse(response);
}

const onAiSpeakEnded = (record) => () => {
    console.log("AI Speak End...")
    particleActions.reset();
    console.log("initSpeechEndTimer");
    initSpeechEndTimer(record);
    record.start();
}

const handleError = (error) => {
    console.log(`error encountered: ${error.message}`);
    particleActions.reset();
};

const validate = async (data) => {
    const decodedData = await new AudioContext().decodeAudioData(await data.arrayBuffer());
    const duration = decodedData.duration;
    const minDuration = 0.4;

    if (duration < minDuration) throw new Error(`Duration is ${duration}s, which is less than minimum of ${minDuration}s`);
};


