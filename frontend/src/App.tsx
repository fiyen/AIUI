import {useMicVADWrapper} from "./hooks/useMicVADWrapperXF.js";
import RotateLoader from "react-spinners/RotateLoader";
import {particleActions} from "./particle-manager.ts";
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
                color: "#27eab6",
            }}>
                {status + ellipsis}
            </div>
        </div>
    );
    
}

export default App;
