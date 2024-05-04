import { useEffect, useRef } from "react";
import { useMicVAD } from "@fiyen/vad-react/src";
import IatRecorder from "./xf-voice-dictation"; // 调整为正确的路径
import { onSpeechStart, onSpeechEnd, onMisfire, onSpeechDoing } from "../speech-manager"; // 确认路径

export const useMicVADWrapper = (onLoadingChange) => {
  
  // 初始化讯飞语音识别实例的 ref
  const recorderRef = useRef(null); 

  const micVAD = useMicVAD({
    preSpeechPadFrames: 5,
    positiveSpeechThreshold: 0.90,
    negativeSpeechThreshold: 0.75,
    redemptionFrames: 40,
    minSpeechFrames: 8,
    startOnLoad: true,
    onSpeechStart: () => onSpeechStart(recorderRef.current), 
    onSpeechEnd: (audio) => onSpeechEnd(audio, recorderRef.current),
    onVADMisfire: () => onMisfire(recorderRef.current),
    onSpeechDoing: (audio) => onSpeechDoing(audio, recorderRef.current)
  });

  // 管理加载状态的 ref
  const loadingRef = useRef(micVAD.loading);

  useEffect(() => {
    if (!recorderRef.current) {
      // 初始化 IatRecorder 实例并存储到 ref 中
      recorderRef.current = new IatRecorder({
        APPID: '822c6053',
        APISecret: 'M2IzOGUxNTdjMTNkZDk1NmE5OGQyZTBi',
        APIKey: '52cbdf917b14bfb5675972d192b23c37',
        // 其他可能的配置项
        onWillStatusChange: function (oldStatus, newStatus) {
            // 可以在这里进行页面中一些交互逻辑处理：注：倒计时（语音听写只有60s）,录音的动画，按钮交互等！
            console.log('识别状态：', oldStatus, newStatus);
        },
    
        // 监听识别结果的变化回调
        onTextChange: function (text) {
            // 可以在这里进行页面中一些交互逻辑处理：如将文本显示在页面中
            console.log('识别内容：',text)
            recorderRef.current.perText = text
        },
    
        // 监听识别错误回调
        onError: function(error){
            console.log('错误信息：', error)
        }
      });
      
    }

    // 监听 VAD 的加载状态变化
    if (loadingRef.current !== micVAD.loading) {
      onLoadingChange(micVAD.loading);
      loadingRef.current = micVAD.loading;
    }

    // 确保在挂载时立即执行 start()
    // recorderRef.current.start();
  }, [micVAD.loading, onLoadingChange]);

  // 在组件卸载时，我们可以停止语音识别并清理资源
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.stop();
      }
    };
  }, []);

  return micVAD;
}
