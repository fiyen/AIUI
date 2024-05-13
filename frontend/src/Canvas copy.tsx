import {useEffect, useRef, useState} from "react";

const Canvas = props => {
    const { draw, statusText, ...rest } = props;
    const canvasRef = useCanvas(draw, statusText);

    return <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} {...rest}/>;
};

const useCanvas = (draw, statusText) => {
    const canvasRef = useRef(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(1); // 初始化当前图片索引
    const imageRef = useRef(new Image()); // 创建Image对象用于加载图像

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const displayWidth = canvas.width;
        const displayHeight = canvas.height;
        const projCenterX = displayWidth / 2;
        const projCenterY = displayHeight / 2;
        let animationFrameId;

        const loadImage = (index) => {
            imageRef.current.onload = () => {
                render(); // 图像加载完成后，开始渲染 Canvas
            };
            imageRef.current.src = `/frame_${index}.png`; // 根据index设置图像源
        };

        // 新增循环播放图片代码
        const cycleImages = () => {
            setCurrentImageIndex((prevIndex) => {
                // 循环播放：若当前索引等于60，则重置为1，否则加1
                const nextIndex = prevIndex === 23 ? 0 : prevIndex + 1;
                loadImage(nextIndex); // 载入下一张图片
                return nextIndex;
            });
        };

        const drawImageWithinCircle = () => {
            context.save();
            context.beginPath();
        
            const circleRadius = 150;
            context.arc(projCenterX, projCenterY - 150, circleRadius, 0, Math.PI * 2);
            context.clip();
            
            const imageWidth = imageRef.current.width;
            const imageHeight = imageRef.current.height;

            const scale = Math.min(circleRadius * 2 / imageWidth, circleRadius * 2 / imageHeight);
            const scaledWidth = imageWidth * scale;
            const scaledHeight = imageHeight * scale;

            const offsetX = (scaledWidth - circleRadius * 2) / 2;
            const offsetY = (scaledHeight - circleRadius * 2) / 2;

            context.drawImage(
                imageRef.current,
                projCenterX - scaledWidth / 2,
                projCenterY - scaledHeight / 2 - 150,
                scaledWidth,
                scaledHeight
            );
        
            context.restore();
        };

        let lastRenderTime = Date.now();
        const renderInterval = 100; // 调整为100ms或根据需要调整渲染间隔
        const render = () => {
            if (Date.now() - lastRenderTime >= renderInterval) {
                draw(context, displayWidth, displayHeight, projCenterX, projCenterY, statusText);
                cycleImages();
                lastRenderTime = Date.now();
                drawImageWithinCircle();
            }

            animationFrameId = window.requestAnimationFrame(render);
        };

        loadImage(currentImageIndex); // 初次载入第一张图片

        return () => {
            window.cancelAnimationFrame(animationFrameId);
        };
    }, [draw, statusText]);

    return canvasRef;
};


export default Canvas