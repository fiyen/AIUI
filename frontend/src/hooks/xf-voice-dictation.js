import CryptoJS from 'crypto-js';
export default class IatRecorder {
    constructor(opts = {}) {
        // 服务接口认证信息(语音听写（流式版）WebAPI)
        this.APPID = opts.APPID || '';
        this.APISecret = opts.APISecret || '';
        this.APIKey = opts.APIKey || '';

        // webSocket请求地址
        this.url = opts.url || "wss://iat-api.xfyun.cn/v2/iat";
        this.host = opts.host || "iat-api.xfyun.cn";

        // 识别监听方法
        this.onTextChange = opts.onTextChange || Function();
        this.onWillStatusChange = opts.onWillStatusChange || Function();
        
        // 方言/语种
        this.status = 'null'
        this.language = opts.language || 'zh_cn'
        this.accent = opts.accent || 'mandarin';
        
        // 流媒体
        this.streamRef = [];
        // 记录音频数据
        this.audioData = [];
        // 缓存音频数据，保存在webSocket没有连上之前的音频数据（实时对话，发起语音时连接webSocket，不能等连上再记录语音）
        this.audioDataBuffer = [];
        // 记录听写结果
        this.resultText = '';
        // 永久暂存位置
        this.perText = '';
        // wpgs下的听写结果需要中间状态辅助记录
        this.resultTextTemp = '';
        // 音频数据多线程
        this.init();
    }

    // 获取webSocket请求地址鉴权
    getWebSocketUrl() {
        return new Promise((resolve) => {
            const { url, host, APISecret, APIKey } = this;
            // 请求地址根据语种不同变化
            try {
                console.log("get web socker url")
                let date = new Date().toGMTString(),
                    algorithm = 'hmac-sha256',
                    headers = 'host date request-line',
                    signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`,
                    signatureSha = CryptoJS.HmacSHA256(signatureOrigin, APISecret),
                    signature = CryptoJS.enc.Base64.stringify(signatureSha),
                    authorizationOrigin = `api_key="${APIKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`,
                    authorization = btoa(authorizationOrigin);
                resolve(`${url}?authorization=${authorization}&date=${date}&host=${host}`);
            } catch (error) {
                console.log("get web socker url error")
                let date = new Date().toGMTString(),
                    algorithm = 'hmac-sha256',
                    headers = 'host date request-line',
                    signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`,
                    signatureSha = CryptoJS.HmacSHA256(signatureOrigin, APISecret),
                    signature = CryptoJS.enc.Base64.stringify(signatureSha),
                    authorizationOrigin = `api_key="${APIKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`,
                    authorization = btoa(authorizationOrigin);
                resolve(`${url}?authorization=${authorization}&date=${date}&host=${host}`);
            }
        });
    }

    // 操作初始化
    init() {
        try {
            if (!this.APPID || !this.APIKey || !this.APISecret) {
                alert('请正确配置【迅飞语音听写（流式版）WebAPI】服务接口认证信息！');
            } else {
                console.log("初始化完成")
            }
        } catch (error) {
            alert('对不起：请在服务器环境下运行！');
            console.error('请在服务器如：WAMP、XAMPP、Phpstudy、http-server、WebServer等环境中运行！', error);
        }
        // console.log("%c ❤️使用说明：http://www.muguilin.com/blog/info/609bafc50d572b3fd79b058f", "font-size:32px; color:blue; font-weight: bold;");
    }
    // 修改录音听写状态
    setStatus(status) {
        this.onWillStatusChange && this.status !== status && this.onWillStatusChange(this.status, status);
        this.status = status;
    }
    // 设置识别结果内容
    setResultText({ resultText, resultTextTemp } = {}) {
        this.onTextChange && this.onTextChange(resultTextTemp || resultText || '');
        resultText !== undefined && (this.resultText = resultText);
        resultTextTemp !== undefined && (this.resultTextTemp = resultTextTemp);
    }
    // 修改听写参数
    setParams({ language, accent } = {}) {
        language && (this.language = language)
        accent && (this.accent = accent)
    }
    // 对处理后的音频数据进行base64编码，
    toBase64(buffer) {
        let binary = '';
        let bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
    // 连接WebSocket
    connectWebSocket() {
        return this.getWebSocketUrl().then(url => {
            let iatWS;
            if ('WebSocket' in window) {
                iatWS = new WebSocket(url);
            } else if ('MozWebSocket' in window) {
                iatWS = new MozWebSocket(url);
            } else {
                alert('浏览器不支持WebSocket!');
                return false;
            }
            this.webSocket = iatWS;
            this.setStatus('init');
            iatWS.onopen = () => {
                this.setStatus('ing');
                this.startIntervalSend();
            };
            iatWS.onmessage = e => {
                this.webSocketRes(e.data);
            };
            iatWS.onerror = e => {
                console.log("error:", e)
            };
            iatWS.onclose = e => {
                console.log("close:", e)
            };
        })
    }
    pushAudioList(audioList) {
        this.audioData.push(...audioList)
    }

    // 启动定时器，每40ms发送一次音频数据
    startIntervalSend() {
        this.intervalHandler = setInterval(() => {
            // 当有音频数据时
            if(this.audioData.length) {
                const {audio, status} = this.audioData.shift();
                this.webSocketSend(audio, status);
            } else {
                if (this.status === 'end') {
                    this.stopIntervalSend();
                    this.stop();
                }          
            }
        }, 40);
    }

    // 取消定时器
    stopIntervalSend() {
        if(this.intervalHandler) {
            clearInterval(this.intervalHandler);
            this.intervalHandler = null;
        }
    }

    // 向webSocket发送数据(音频二进制数据经过Base64处理)
    webSocketSend(audio, status) {
        if (this.webSocket.readyState !== 1) return false;
        // console.log("audio", audio, "status", status)
        const params = {
            common: {
                app_id: this.APPID,
            },
            business: {
                language: this.language, //小语种可在控制台--语音听写（流式）--方言/语种处添加试用
                domain: 'iat',
                accent: this.accent, //中文方言可在控制台--语音听写（流式）--方言/语种处添加试用
                vad_eos: 10000,
                dwa: 'wpgs' //为使该功能生效，需到控制台开通动态修正功能（该功能免费）
            },
            data: {
                status: status,
                format: 'audio/L16;rate=16000',
                encoding: 'raw',
                audio: this.toBase64(audio)
            }
        }
        // 发送数据
        this.webSocket.send({data: JSON.stringify(params)});
    }
    // 识别结束 webSocket返回数据
    webSocketRes(resultData) {
        let jsonData = JSON.parse(resultData);
        if (jsonData.data && jsonData.data.result) {
            let data = jsonData.data.result;
            let str = '';
            let ws = data.ws;
            for (let i = 0; i < ws.length; i++) {
                str = str + ws[i].cw[0].w;
            }
            // 开启wpgs会有此字段(前提：在控制台开通动态修正功能)
            // 取值为 "apd"时表示该片结果是追加到前面的最终结果；取值为"rpl" 时表示替换前面的部分结果，替换范围为rg字段
            if (data.pgs) {
                if (data.pgs === 'apd') {
                    // 将resultTextTemp同步给resultText
                    this.setResultText({
                        resultText: this.resultTextTemp
                    });
                }
                // 将结果存储在resultTextTemp中
                this.setResultText({
                    resultTextTemp: this.resultText + str
                });
            } else {
                this.setResultText({
                    resultText: this.resultText + str
                });
            }
        }
    }

    start() {
        this.connectWebSocket();
        this.setResultText({ resultText: '', resultTextTemp: '' });
    }

    stop() {
        if (this.webSocket) {
            this.webSocket.close();
        }
    }

    stopAndGetText() {
        // ... 现有的停止逻辑
        this.setStatus("end");
        return new Promise((resolve) => {
            // 监听WebSocket关闭事件
            this.webSocket.addEventListener('close', () => {
                // 当WebSocket关闭时，我们获取已更新的识别结果
                resolve(this.resultText);
            });
        });
    }
}