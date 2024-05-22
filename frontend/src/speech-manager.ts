// import {particleActions} from "./profile-chat-manager.ts";
import { particleActions } from "./particle-manager.ts"
import { SpeechPlayer } from "./player.ts";

// let speechEndTimer: ReturnType<typeof setTimeout> | null = null;
let player: SpeechPlayer | undefined;
let speechIsStart = false
let audioIsPlaying = false
let firstAudioSend = false
// const speechEndTimeoutThreshold = 150000; // Set to 15 seconds

const conversationThusFar = [];

const Url = import.meta.env.VITE_SERVER_URL;
// const Url = "http://127.0.0.1:8000";

export const onSpeechStart = debounce( async (record) => {
    if (!audioIsPlaying) {
        console.log("speech started");
        speechIsStart = true;
        // stopSourceIfNeeded();
        particleActions.onUserSpeaking();
        console.log("try to connect webSocket")
        record.start();
    }
}, 1000);

export const onSpeechDoing = debounce( async (audioList, record) => {
    if (!audioIsPlaying) {
        let status: number;
        if (firstAudioSend) {status = 1;} else {status = 0; firstAudioSend=true}
        const transAudioList = audioList.map((audio, index) => ({
            audio: transcode(audio),
            status: (status === 0 && index === 0) ? 0 : 1
        }));
        // console.log("SpeechDoing", audio, transAudio);
        record.pushAudioList(transAudioList);
    }
}, 40);

export const onSpeechEnd = debounce(async (audio, record) => {
    if (!audioIsPlaying) {
        console.log("speech ended");
        speechIsStart = false;
        // const blob = createAudioBlob(concatenatedAudio);
        // saveAudioData(blob);
        // 等待录音停止并获取最终识别结果
        record.pushAudioList([{audio: '', status: 2}]); // 结束
        await record.stopAndGetText();
        await fastProcessAudio(record);
    }
}, 1000);

export const onMisfire = debounce((record) => {
    if (!audioIsPlaying) {
        console.log("vad misfire");
        speechIsStart = false;
        record.stop();
        // record.setStatus(null);
        particleActions.reset();
    }
}, 1000);

// export const initSpeechEndTimer = (record) => {
//     speechEndTimer = setTimeout(() => {
//         // 在此处填充特定文本，并调用sendData。例如:
//         console.log("No speech detected. Auto triggering conversation.");
//         fastSendData(record, true);
//     }, speechEndTimeoutThreshold);
// };

// const stopSourceIfNeeded = () => {
//     if (speechIsStart && audioIsPlaying) {
//         console.log("Need to stop player.")
//         // resetSpeechEndTimer();
//         audioIsPlaying = false;
//         player.pause();
//     }

// };

const fastProcessAudio = async (record) => {
    particleActions.onProcessing();
    fastSendData(record);
}

const fastSendData = (record, reminder=false) => {
    console.log("sending data");
    // resetSpeechEndTimer(); // Reset timer whenever speech ends
    fetch(`${Url}/inference`, {
        method: "POST",
        body: JSON.stringify({ text: record.perText }),
        headers: {
            'conversation': base64Encode(JSON.stringify(conversationThusFar)),
            'reminder': reminder.toString()
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

// function resetSpeechEndTimer() {
//     console.log("resetSpeechEndTimer")
//     clearTimeout(speechEndTimer);
//     speechEndTimer = null;
//     console.log("SpeechEndTimer Reset");
// }

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

const handleSuccess = async (response) => {
    if (!speechIsStart) {
        audioIsPlaying = true
        // stopSourceIfNeeded();
        const audioEl = document.querySelector('audio');
        player = new SpeechPlayer({
            audio: audioEl,
            onPlaying: () => {particleActions.onAiSpeaking()},
            onPause: () => {onAiSpeakEnded()},
            onChunkEnd: () => {},
            mimeType: 'audio/mpeg',
          });
        await player.init();
        await player.feedWithResponse(response);
    }
}

const onAiSpeakEnded = () => {
    console.log("AI Speak End...")
    particleActions.reset();
    audioIsPlaying = false;
};

// const onAiSpeakPaused = () => {
//     console.log("AI Speak Paused...")
//     audioIsPlaying = false;
// }

const handleError = (error) => {
    console.log(`error encountered: ${error.message}`);
    particleActions.reset();
};
  
  const to16BitPCM = (input) => {
    const dataLength = input.length * (16 / 8);
    const dataBuffer = new ArrayBuffer(dataLength);
    const dataView = new DataView(dataBuffer);
    let offset = 0;
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        dataView.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return dataView;
  }
  
  const transcode = (audioData) => {
    const output = to16BitPCM(audioData);
    return Array.from(new Uint8Array(output.buffer));
  }
  