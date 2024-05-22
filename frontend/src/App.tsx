import {useMicVADWrapper} from "./hooks/useMicVADWrapperXF.js";
import RotateLoader from "react-spinners/RotateLoader";
// import {particleActions} from "./profile-chat-manager.ts";
import { particleActions } from "./particle-manager.ts"
import {useState, useEffect} from "react";
import Canvas from "./Canvas.tsx";

const App = () => {
    const [loading, setLoading] = useState(true);
    // 添加一个状态来追踪粒子显示的状态文字
    const [status, setStatus] = useState(particleActions.getStatusText());
    // 新增状态用于在1到3之间轮换省略号的数量
    const [ellipsis, setEllipsis] = useState('.');

    useMicVADWrapper(setLoading);

    // 使用effect来更新状态文字
    useEffect(() => {
        // 创建一个间隔定时器来定期检查状态文字
        const interval = setInterval(() => {
            const currentStatus = particleActions.getStatusText();
            setStatus(currentStatus);
        }, 100); // 可以调整间隔时间

        // 返回清除函数，清除定时器
        return () => clearInterval(interval);
    }, []); // 空数组保证effect仅在组件加载时运行一次

    // 新增一个hook用于更新省略号数量
    useEffect(() => {
        const interval = setInterval(() => {
            // 在1到3之间轮换省略号的数量
            setEllipsis(prevEllipsis => {
                const dotCount = (prevEllipsis.length % 3) + 1;
                return '.'.repeat(dotCount);
            });
        }, 500);  // 可以调整间隔时间来改变动画速度

        return () => clearInterval(interval);
    }, []);
    if (loading) {
        return (
            <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                width: "100vw",
            }}>
                <RotateLoader
                    loading={loading}
                    color={"#27eab6"}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                />
            </div>
        );
    }

    return (
        <div>
            <Canvas draw={particleActions.draw}/>
            {/* 下面的div用来展示当前的状态信息 */}
            <div style={{
                position: "absolute",
                bottom: "120px",
                width: "100%",
                textAlign: "center",
                color: "transparent", // 让文字颜色透明
                backgroundImage: "linear-gradient(to right, #ff7e5f, #feb47b)", // 使用渐变背景色
                WebkitBackgroundClip: "text", // 设置背景只在文字部分显示
                fontSize: "22px",
                fontFamily: "cursive",
                animation: "colorChange 5s infinite", // 添加颜色动画效果
                textShadow: "2px 2px 4px #000000", // 添加字体阴影
                WebkitTextStroke: "1px #27eab6" // 添加文字描边效果
            }}>
            {status + ellipsis}
            </div>
            <style>{`
                @keyframes colorChange {
                    0% { color: #ff7e5f; }
                    50% { color: #feb47b; }
                    100% { color: #ff7e5f; }
            }
            `}</style>
        </div>
    );
    
}

export default App;
