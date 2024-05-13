let sphereRad = 130 // 20..500
const radius_sp = 1 // 1..2
let framesPerRotation = 5000
let r, g, b  // particle color

const setLightBlue = () => {
    r = 52
    g = 235
    b = 222
}
const setOrange = () => {
    r = 255
    g = 191
    b = 0
}
const setViolet = () => {
    r = 235
    g = 67
    b = 250
}
const setFuchsia = () => {
    r = 201
    g = 10
    b = 144
}

const wait = 1
let count = wait - 1
const numToAddEachFrame = 5
const particleList = {
    first: undefined
}
const recycleBin = {
    first: undefined
}

setLightBlue()

const turnSpeed = () => 2 * Math.PI / framesPerRotation //the sphere will rotate at this speed (one complete rotation every 1600 frames).

// 添加一个变量来追踪当前的状态文字
let statusText: string = "我在听，您请讲";

// 添加一个变量来追踪当前的动画状态
let animationState: string = "idleWave";
const historyBarHeight = Array(6).fill(0)

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

const fastVolecity = 10;

const onUserSpeaking = () => {
    console.log("user speaking")
    framesPerRotation = 5000
    startFastMove(180, sphereRad < 180 ? 'outwards': 'inwards', fastVolecity)
    sphereRad = 180
    setOrange()
    setStatusText('聆听中')
    setAnimationState('random') // 在聆听状态时，条柱的变动是随机的
};
const onProcessing = () => {
    console.log("processing")
    framesPerRotation = 100
    startFastMove(100, sphereRad < 100 ? 'outwards': 'inwards', fastVolecity)
    sphereRad = 100
    setViolet()
    setStatusText('思考中')
    setAnimationState('fastWave') // 在思考状态时，条柱的变动是快速的正弦波
};
const onAiSpeaking = () => {
    console.log("ai speaking")
    framesPerRotation = 1000
    startFastMove(200, sphereRad < 200 ? 'outwards': 'inwards', fastVolecity)
    sphereRad = 200
    setFuchsia()
    setStatusText('正在回复')
    // particleList.first = null
    setAnimationState('random') // 在回答状态时，条柱的变动也是随机的
};
const reset = () => {
    console.log("reset")
    framesPerRotation = 5000
    startFastMove(130, sphereRad < 130 ? 'outwards': 'inwards', fastVolecity)
    sphereRad = 130
    setLightBlue()
    setStatusText('我在听，您请讲')
    setAnimationState('idleWave') // 在等待状态时，条柱的变动是平缓的正弦波
};

const particleAlpha = 1 // maximum alpha
const fLen = 320 // represents the distance from the viewer to z=0 depth.
let m

// we will not draw coordinates if they have too large of a z-coordinate (which means they are very close to the observer).
const zMax = fLen - 2
let turnAngle = 1 //initial angle
const sphereCenterY = -150, sphereCenterZ = -3 - sphereRad
const particleRad = 3

//alpha values will lessen as particles move further back, causing depth-based darkening:
const zeroAlphaDepth = -750

//random acceleration factors - causes some random motion
const randAccelX = 0.1, randAccelY = 0.1, randAccelZ = 0.1
const gravity = -0 //try changing to a positive number (not too large, for example 0.3), or negative for floating upwards.
const rgbString = () => "rgba(" + r + "," + g + "," + b + "," //partial string for color which will be completed by appending alpha value.
//we are defining a lot of variables used in the screen update functions globally so that they don't have to be redefined every frame.
let p
let outsideTest
let nextParticle
let sinAngle
let cosAngle
let rotX, rotZ
let depthAlphaFactor
let i
let theta, phi
let x0, y0, z0

function draw(context, displayWidth, displayHeight, projCenterX, projCenterY) {
    //if enough time has elapsed, we will add new particles.
    count++
    if (count >= wait) {

        count = 0
        for (i = 0; i < numToAddEachFrame; i++) {
            theta = Math.random() * 2 * Math.PI
            phi = Math.acos(Math.random() * 2 - 1)
            x0 = sphereRad * Math.sin(phi) * Math.cos(theta)
            y0 = sphereRad * Math.sin(phi) * Math.sin(theta)
            z0 = sphereRad * Math.cos(phi)

            //We use the addParticle function to add a new particle. The parameters set the position and velocity components.
            //Note that the velocity parameters will cause the particle to initially fly outwards away from the sphere center (after
            //it becomes unstuck).
            const p = addParticle(x0, sphereCenterY + y0, sphereCenterZ + z0, 0.002 * x0, 0.002 * y0, 0.002 * z0)

            //we set some "envelope" parameters which will control the evolving alpha of the particles.
            p.attack = 50
            p.hold = 50
            p.decay = 100
            p.initValue = 0
            p.holdValue = particleAlpha
            p.lastValue = 0

            //the particle will be stuck in one place until this time has elapsed:
            p.stuckTime = 90 + Math.random() * 20

            p.accelX = 0
            p.accelY = gravity
            p.accelZ = 0
        }
    }

    //update viewing angle
    turnAngle = (turnAngle + turnSpeed()) % (2 * Math.PI)
    sinAngle = Math.sin(turnAngle)
    cosAngle = Math.cos(turnAngle)

    //background fill
    context.fillStyle = "#000000"
    context.fillRect(0, 0, displayWidth, displayHeight)

    //update and draw particles
    p = particleList.first
    while (p != null) {
        //before list is altered record next particle
        nextParticle = p.next

        //update age
        p.age++

        //if the particle is past its "stuck" time, it will begin to move.
        // Check if the fastMove behavior should be applied
        if (p.isFastMoving) {
            const distance = Math.sqrt(p.x ** 2 + (p.y - sphereCenterY) ** 2 + (p.z - sphereCenterZ) ** 2);
            const isMovingTowards = p.direction === 'inwards';
            
            // If particle is not yet at minDistance, then move it at the velocity specified
            if ((isMovingTowards && distance > p.minDistance) || (!isMovingTowards && distance < p.minDistance)) {

                // Update particle position based on direction and velocity
                const velocityFactor = isMovingTowards ? -p.velocity : p.velocity;
                p.x += velocityFactor * p.velX;
                p.y += velocityFactor * p.velY;
                p.z += velocityFactor * p.velZ;

            } else {
                // Stop fastMove behavior if minDistance has been reached
                p.isFastMoving = false;
            }
        } else {
            if (p.age > p.stuckTime) {
                p.velX += p.accelX + randAccelX * (Math.random() * 2 - 1)
                p.velY += p.accelY + randAccelY * (Math.random() * 2 - 1)
                p.velZ += p.accelZ + randAccelZ * (Math.random() * 2 - 1)
    
                p.x += p.velX
                p.y += p.velY
                p.z += p.velZ
            }
        }


        /*
        We are doing two things here to calculate display coordinates.
        The whole display is being rotated around a vertical axis, so we first calculate rotated coordinates for
        x and z (but the y coordinate will not change).
        Then, we take the new coordinates (rotX, y, rotZ), and project these onto the 2D view plane.
        */
        rotX = cosAngle * p.x + sinAngle * (p.z - sphereCenterZ)
        rotZ = -sinAngle * p.x + cosAngle * (p.z - sphereCenterZ) + sphereCenterZ
        m = radius_sp * fLen / (fLen - rotZ)
        p.projX = rotX * m + projCenterX
        p.projY = p.y * m + projCenterY

        //update alpha according to envelope parameters.
        if (p.age < p.attack + p.hold + p.decay) {
            if (p.age < p.attack) {
                p.alpha = (p.holdValue - p.initValue) / p.attack * p.age + p.initValue
            } else if (p.age < p.attack + p.hold) {
                p.alpha = p.holdValue
            } else if (p.age < p.attack + p.hold + p.decay) {
                p.alpha = (p.lastValue - p.holdValue) / p.decay * (p.age - p.attack - p.hold) + p.holdValue
            }
        } else {
            p.dead = true
        }

        //see if the particle is still within the viewable range.
        outsideTest = (p.projX > displayWidth) || (p.projX < 0) || (p.projY < 0) || (p.projY > displayHeight) || (rotZ > zMax);

        if (outsideTest || p.dead) {
            recycle(p)
        } else {
            //depth-dependent darkening
            depthAlphaFactor = (1 - rotZ / zeroAlphaDepth)
            depthAlphaFactor = (depthAlphaFactor > 1) ? 1 : ((depthAlphaFactor < 0) ? 0 : depthAlphaFactor)
            context.fillStyle = rgbString() + depthAlphaFactor * p.alpha + ")"

            //draw
            context.beginPath()
            context.arc(p.projX, p.projY, m * particleRad, 0, 2 * Math.PI, false)
            context.closePath()
            context.fill()
        }

        p = nextParticle
    }
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

    for (let i = 0; i < numBars; i++) {
        let newHeight
        switch(animationState) {
            case 'random':
                newHeight = historyBarHeight[i] + Math.random() * 10 * (Math.random() < 0.5 ? 1 : -1); // 随机变化
                break;
            case 'fastWave':
                newHeight = 25 + 25 * Math.sin(Date.now() / 100 + i);  // 快速正弦波
                break;
            case 'idleWave':
                newHeight = 25 + 25 * Math.sin(Date.now() / 1000 + i);  // 平缓正弦波
                break;
            default:
                newHeight = 25 + 25 * Math.sin(Date.now() / 100 + i);  // 平缓正弦波
        }
        const barHeightNow = Math.max(0, Math.min(newHeight, barHeight));
        historyBarHeight[i] = barHeightNow;
        const barPositionX = firstBarPositionX + i * (barWidth + barSpacing);
        drawBar(context, barWidth, barHeightNow, barPositionX, projCenterY*1.25, 1);
    }
}

function addParticle(x0, y0, z0, vx0, vy0, vz0) {
    let newParticle

    //check recycle bin for available drop:
    if (recycleBin.first != null) {
        newParticle = recycleBin.first
        //remove from bin
        if (newParticle.next != null) {
            recycleBin.first = newParticle.next
            newParticle.next.prev = null
        } else {
            recycleBin.first = null
        }
    }
    //if the recycle bin is empty, create a new particle (a new empty object):
    else {
        newParticle = {}
    }

    //add to beginning of particle list
    if (particleList.first == null) {
        particleList.first = newParticle
        newParticle.prev = null
        newParticle.next = null
    } else {
        newParticle.next = particleList.first
        particleList.first.prev = newParticle
        particleList.first = newParticle
        newParticle.prev = null
    }

    //initialize
    newParticle.x = x0
    newParticle.y = y0
    newParticle.z = z0
    newParticle.velX = vx0
    newParticle.velY = vy0
    newParticle.velZ = vz0
    newParticle.age = 0
    newParticle.dead = false
    newParticle.right = Math.random() < 0.5;
    // Initialize new properties for fastMove behavior
    newParticle.isFastMoving = false;
    newParticle.minDistance = 0;
    newParticle.direction = 0;
    newParticle.velocity = 0;
    return newParticle
}

function recycle(p) {
    //remove from particleList
    if (particleList.first === p) {
        if (p.next != null) {
            p.next.prev = null
            particleList.first = p.next
        } else {
            particleList.first = null
        }
    } else {
        if (p.next == null) {
            p.prev.next = null
        } else {
            p.prev.next = p.next
            p.next.prev = p.prev
        }
    }
    //add to recycle bin
    if (recycleBin.first == null) {
        recycleBin.first = p
        p.prev = null
        p.next = null
    } else {
        p.next = recycleBin.first
        recycleBin.first.prev = p
        recycleBin.first = p
        p.prev = null
    }
}

function startFastMove(minDistance, direction, velocity) {
    p = particleList.first
    while (p != null) {
        //before list is altered record next particle
        nextParticle = p.next
        p.isFastMoving = true;
        p.minDistance = minDistance;
        p.direction = direction; // 'inwards' or 'outwards'
        p.velocity = velocity;
        p = nextParticle;
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
