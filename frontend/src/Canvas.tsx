import { useEffect, useRef, useState } from "react";

const useCanvas = (draw, statusText) => {
    const canvasRef = useRef(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(1);
    const imageCache = useRef([]); // 用于预加载的图片缓存
    const imageRef = useRef(new Image());

    // 预加载图片方法
    const preloadImages = () => {
        for (let i = 0; i <= 21; i++) {
            const img = new Image();
            img.src = `/frame_${i}.png`;
            img.onload = () => {
                imageCache.current[i] = img; // 加载完成后添加到图片缓存
            };
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const displayWidth = canvas.width;
        const displayHeight = canvas.height;
        const projCenterX = displayWidth / 2;
        const projCenterY = displayHeight / 2;
        let animationFrameId;

        preloadImages(); // 预加载所有图片

        const loadImage = (index) => {
            // 使用预加载的图片，如果未加载则使用新的Image
            imageRef.current = imageCache.current[index] || new Image();
            if (!imageRef.current.complete) { // 如果图片未加载完毕，设置加载完成后的回调
                imageRef.current.onload = () => {
                    render(); // 图像加载完成后，重新渲染画布
                };
                imageRef.current.src = `/frame_${index}.png`; // 设置src以加载图片
            } else {
                render(); // 图片已预加载，直接渲染
            }
        };

        const cycleImages = () => {
            setCurrentImageIndex((prevIndex) => {
                const nextIndex = prevIndex === 21 ? 0 : prevIndex + 1;
                loadImage(nextIndex);
                return nextIndex;
            });
        };

        const drawImageWithinCircle = () => {
            context.clearRect(0, 0, displayWidth, displayHeight); // 清除画布
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
        const renderInterval = 30; // 调整为100ms或根据需要调整渲染间隔
        let step = 0
        const render = () => {
            if (Date.now() - lastRenderTime >= renderInterval) {
                lastRenderTime = Date.now();
                context.clearRect(0, 0, displayWidth, displayHeight);
                if (step % 10 == 0) {
                    cycleImages();
                }
                step = step > 10000 ? 0 : step + 1;
                drawImageWithinCircle();
                draw(context, displayWidth, displayHeight, projCenterX, projCenterY, statusText);
            }

            animationFrameId = window.requestAnimationFrame(render);
        };

        loadImage(currentImageIndex); // 初次加载第一张图片


        return () => {
            window.cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return canvasRef;
};

export default function Canvas(props) {
    const { draw, statusText, ...rest } = props;
    const canvasRef = useCanvas(draw, statusText);

    return <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} {...rest} />;
}
