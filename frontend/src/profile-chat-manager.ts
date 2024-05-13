// 添加一个变量来追踪当前的状态文字
let statusText: string = "我在听，您请讲";

// 添加一个变量来追踪当前的动画状态
let animationState: string = "idleWave";
const historyBarHeight = Array(6).fill(0);
const historyBarHeightSmall = Array(6).fill(0);
let numDynamicDots = 1;

function setAnimationState(newState: string) {
    animationState = newState;
    historyBarHeight.fill(0);
}
// 提供一个设置状态文本的方法
function setStatusText(newStatusText: string) {
    statusText = newStatusText;
}

function getStatusText() {
    return statusText
}

const onUserSpeaking = () => {
    console.log("user speaking")
    setStatusText('聆听中')
    setAnimationState('random') // 在聆听状态时，条柱的变动是随机的
};
const onProcessing = () => {
    console.log("processing")
    setStatusText('思考中')
    numDynamicDots = 1;
    setAnimationState('fastWave') // 在思考状态时，条柱的变动是快速的正弦波
};
const onAiSpeaking = () => {
    console.log("ai speaking")
    setStatusText('正在回复')
    setAnimationState('random') // 在回答状态时，条柱的变动也是随机的
};
const reset = () => {
    console.log("reset")
    setStatusText('我在听，您请讲')
    setAnimationState('idleWave') // 在等待状态时，条柱的变动是平缓的正弦波
};

function draw(context, displayWidth, displayHeight, projCenterX, projCenterY) {
    // 绘制语音条柱，6条，等间隔居中排列
    const numBars = 6; // 条柱的数量
    const barSpacing = 10; // 条柱间距
    const barWidth = 20; // 条柱的宽度
    const barHeight = 40; // 条柱最高高度

    // 计算所有柱子占据的总宽度
    const totalBarsWidth = numBars * barWidth + (numBars - 1) * barSpacing; 

    // 计算第一根柱子的X坐标，确保整个柱组在画布中心
    const firstBarPositionX = projCenterX - totalBarsWidth / 2; 
    
    // 随机，但是不能太剧烈，添加历史高度进行控制。

    drawDynamicBars(context, numBars, historyBarHeight, barHeight, barWidth, firstBarPositionX, projCenterY * 1.2, barSpacing);
    
    // // 定义圆形相框的大小和位置
    // const frameRadius = 150; // 可根据需要调整
    // const frameX = projCenterX;
    // const frameY = projCenterY - frameRadius * 1;

    // context.save(); // 保存当前的绘图状态
    // context.beginPath();
    // context.arc(frameX, frameY, frameRadius, 0, 2 * Math.PI);
    // context.clip(); // 剪裁，使得之后的绘制只能在这个圆形区域内进行

    // context.restore(); // 恢复先前保存的绘图状态，取消剪裁
    // // 绘制圆形相框的边框
    // context.beginPath();
    // context.lineWidth = 10; // 边框的宽度
    // context.strokeStyle = '#27eab6'; // 边框的颜色
    // context.arc(frameX, frameY, frameRadius, 0, 2 * Math.PI);
    // context.stroke();
    // 定义气泡的位置和大小
    const bubbleWidth = 70; // 气泡的宽度
    const bubbleHeight = 50; // 气泡的高度
    const bubbleX = displayWidth * 0.56; // X坐标，向左偏移20像素
    const bubbleY = displayHeight * 0.1; // Y坐标，顶部偏移20像素

    // 绘制圆角矩形聊天气泡
    if (statusText === "思考中") {
        drawBubble(context, bubbleX, bubbleY, bubbleWidth, bubbleHeight)
        drawDynamicBars(context, Math.floor(numDynamicDots / 10 + 1), historyBarHeightSmall, 0, bubbleWidth / 5, 
                        bubbleX + bubbleWidth / 10, bubbleY + bubbleHeight / 2, bubbleWidth / 10);
        numDynamicDots = numDynamicDots === 29 ? 1 : numDynamicDots + 1;
    } else if (statusText === "正在回复") {
        drawBubble(context, bubbleX, bubbleY, bubbleWidth, bubbleHeight)
        drawDynamicBars(context, 3, historyBarHeightSmall, bubbleHeight * 0.4, bubbleWidth / 5, 
                        bubbleX + bubbleWidth / 10, bubbleY + bubbleHeight / 2, bubbleWidth / 10);
    }

}

function drawBubble(context, bubbleX, bubbleY, bubbleWidth, bubbleHeight) {
    const radius = 15; // 圆角的半径
    context.beginPath();
    context.moveTo(bubbleX + radius, bubbleY);
    context.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
    context.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
    context.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
    context.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
    context.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
    context.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
    context.lineTo(bubbleX, bubbleY + radius);
    context.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
    context.closePath();
    context.fillStyle = '#ffffff'; // 气泡的填充颜色
    context.fill();
}

function drawDynamicBars(context, numBars, historyBarHeight, barHeight, barWidth, firstBarPositionX, barPositionY, barSpacing) {
    for (let i = 0; i < numBars; i++) {
        let newHeight
        switch(animationState) {
            case 'random':
                newHeight = historyBarHeight[i] + Math.random() * barHeight / 5 * (Math.random() < 0.5 ? 1 : -1); // 随机变化
                break;
            case 'fastWave':
                newHeight = barHeight / 2 + barHeight / 2 * Math.sin(Date.now() / 100 + i);  // 快速正弦波
                break;
            case 'idleWave':
                newHeight = barHeight / 2 + barHeight / 2 * Math.sin(Date.now() / 1000 + i);  // 平缓正弦波
                break;
            default:
                newHeight = barHeight / 2 + barHeight / 2 * Math.sin(Date.now() / 100 + i);  // 平缓正弦波
        }
        const barHeightNow = Math.max(0, Math.min(newHeight, barHeight));
        historyBarHeight[i] = barHeightNow;
        const barPositionX = firstBarPositionX + i * (barWidth + barSpacing);
        drawBar(context, barWidth, barHeightNow, barPositionX, barPositionY, 1);
    }
}

// 这个函数绘制一个条柱，根据传入的高度参数 h 改变其高度
function drawBar(context, barWidth, barHeight, positionX, positionY, opacity) {
    drawItem(positionX, positionY - barHeight / 2, barWidth, barHeight, context, opacity);
}

function drawItem(x, y, w, h, ctx, opacity = 1) {
    const radius = w / 2;

    // 确定半透明度在规定范围内
    opacity = Math.max(0.1, opacity)

    // 开始绘制路径
    ctx.beginPath();

    // 绘制上半圆
    ctx.arc(x + radius, y, radius, Math.PI, 0, false);

    // 绘制右侧直线
    ctx.lineTo(x + w, y + h - radius);

    // 绘制下半圆
    ctx.arc(x + radius, y + h, radius, 0, Math.PI, false);

    // 绘制左侧直线，关闭路径
    ctx.lineTo(x, y + radius);

    // 设置样式并且填充颜色
    ctx.fillStyle = getBarColor(opacity);
    ctx.closePath();
    ctx.fill();
}

function getBarColor(opacity) {
    // 假定这个函数返回一个合适的颜色值
    // 这里使用 rgba 颜色模型，并插入透明度参数
    return `rgba(255, 100, 100, ${opacity})`; // 示例：返回红色半透明色
}

export const particleActions = {
    onUserSpeaking,
    onProcessing,
    onAiSpeaking,
    getStatusText,
    reset,
    draw
};
