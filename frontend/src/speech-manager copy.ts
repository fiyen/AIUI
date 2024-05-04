import { utils } from "@ricky0123/vad-react";
import {particleActions} from "./particle-manager.ts";

let source: AudioBufferSourceNode;
let sourceIsStarted = false;

const conversationThusFar = [];

// const URL = "https://test.yangyang-backend.cn";
const URL = "http://127.0.0.1:8000";

export const onSpeechStart = () => {
    console.log("speech started");
    particleActions.onUserSpeaking();
    stopSourceIfNeeded();
};

export const onSpeechEnd = debounce(async (audio) => {
    console.log("speech ended");
    await processAudio(audio);
}, 200);

export const onMisfire = () => {
    console.log("vad misfire");
    particleActions.reset();
};

const stopSourceIfNeeded = () => {
    if (source && sourceIsStarted) {
        source.stop(0);
        sourceIsStarted = false;
    }
};

const processAudio = async (audio) => {
    particleActions.onProcessing();
    const blob = createAudioBlob(audio);
    await validate(blob);
    sendData(blob);
};

const createAudioBlob = (audio) => {
    const wavBuffer = utils.encodeWAV(audio);
    return new Blob([wavBuffer], { type: 'audio/wav' });
};

const sendData = (blob) => {
    console.log("sending data");
    fetch(`${URL}/inference`, {
        method: "POST",
        body: createBody(blob),
        headers: {
            'conversation': base64Encode(JSON.stringify(conversationThusFar))
        }
    })
        .then(handleResponse)
        .then(handleSuccess)
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

const handleResponse = async (res) => {
    if (!res.ok) {
        return res.text().then(error => {
            throw new Error(error);
        });
    }

    const newMessages = JSON.parse(base64Decode(res.headers.get("text")));
    conversationThusFar.push(...newMessages);
    return res.blob();
};

const createBody = (data) => {
    const formData = new FormData();
    formData.append("audio", data, "audio.wav");
    return formData;
};

const handleSuccess = async (blob) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    stopSourceIfNeeded();

    source = audioContext.createBufferSource();
    source.buffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
    source.connect(audioContext.destination);
    source.start(0);
    sourceIsStarted = true;
    source.onended = particleActions.reset;

    particleActions.onAiSpeaking();
};

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
