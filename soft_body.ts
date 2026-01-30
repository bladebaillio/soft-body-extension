//% weight=100 color=#7E58AD icon="\uf0c1"
namespace softbody {

    let activeSoftBodies: SoftBody[] = []
    export class SoftBody {
        public points: Sprite[] = []
        public oldX: number[] = []
        public oldY: number[] = []
        public segmentLength: number
        public image: Image | null = null
        public shouldDraw: boolean
        public hasGravity: boolean
        public isFixed: boolean[] = []
        public gravityStrength: number = 400
        public connections: {
            otherBody: SoftBody,
            thisSegment: number,
            otherSegment: number,
            restLength: number
        }[] = []
        public lineColor: number = 1
        public shouldDrawLines: boolean = false
        public damping: number = 0.85
        public springStiffness: number = 0.8
        public maxSegmentVelocity: number = 0
        public shouldFill: boolean = false
        public fillColor: number = 2
        private createSegmentSprite(templateImage: Image, x: number, y: number): Sprite {
            let newImage = templateImage.clone()
            let sprite = sprites.create(newImage)
            sprite.x = x
            sprite.y = y
            return sprite
        }
        constructor(segment: Sprite, length: number, segments: number, hasGravity: boolean) {
            this.segmentLength = length
            this.hasGravity = hasGravity
            let templateImage = image.create(segment.image.width, segment.image.height)
            templateImage.drawImage(segment.image, 0, 0)
            for (let i = 0; i < segments; i++) {
                let newSprite = sprites.create(templateImage.clone())
                newSprite.setPosition(segment.x + (i * length), segment.y)
                this.points.push(newSprite)
                this.oldX.push(newSprite.x)
                this.oldY.push(newSprite.y)
                this.isFixed.push(false)
            }
        }
        update() {
            const dt = 1 / 60
            let forces: { x: number, y: number }[] = []
            for (let i = 0; i < this.points.length; i++) {
                forces.push({ x: 0, y: 0 })
            }
            for (let i = 0; i < this.points.length - 1; i++) {
                let pointA = this.points[i]
                let pointB = this.points[i + 1]
                let dx = pointB.x - pointA.x
                let dy = pointB.y - pointA.y
                let distance = Math.sqrt(dx * dx + dy * dy)
                let diff = this.segmentLength - distance
                let force = (diff / distance) * this.springStiffness
                let forceX = dx * force
                let forceY = dy * force
                if (!this.isFixed[i]) {
                    forces[i].x -= forceX
                    forces[i].y -= forceY
                }
                if (!this.isFixed[i + 1]) {
                    forces[i + 1].x += forceX
                    forces[i + 1].y += forceY
                }
            }
            for (let i = 0; i < this.points.length; i++) {
                if (!this.isFixed[i]) {
                    let point = this.points[i]
                    let tempX = point.x
                    let tempY = point.y
                    let velX = (point.x - this.oldX[i]) * this.damping
                    let velY = (point.y - this.oldY[i]) * this.damping
                    if (this.maxSegmentVelocity > 0) {
                        let speed = Math.sqrt(velX * velX + velY * velY)
                        if (speed > this.maxSegmentVelocity) {
                            let scale = this.maxSegmentVelocity / speed
                            velX *= scale
                            velY *= scale
                        }
                    }

                    point.x += velX + forces[i].x
                    point.y += velY + forces[i].y
                    if (this.hasGravity) {
                        point.y += this.gravityStrength * dt * dt
                    }
                    this.oldX[i] = tempX
                    this.oldY[i] = tempY
                }
            }
        }
        setSegmentGravity(index: number, hasGravity: boolean) {
            if (index >= 0 && index < this.points.length) {
                this.isFixed[index] = !hasGravity
            }
        }
        setGravityStrength(strength: number) {
            this.gravityStrength = strength
        }
        setSegmentPosition(index: number, x: number, y: number) {
            if (index >= 0 && index < this.points.length) {
                this.points[index].x = x
                this.points[index].y = y
                this.oldX[index] = x
                this.oldY[index] = y
            }
        }
        static connectSoftBodies(body1: SoftBody, segment1: number, body2: SoftBody, segment2: number) {
            let dx = body2.points[segment2].x - body1.points[segment1].x
            let dy = body2.points[segment2].y - body1.points[segment1].y
            let distance = Math.sqrt(dx * dx + dy * dy)
            body1.connections.push({
                otherBody: body2,
                thisSegment: segment1,
                otherSegment: segment2,
                restLength: distance
            })
            body2.connections.push({
                otherBody: body1,
                thisSegment: segment2,
                otherSegment: segment1,
                restLength: distance
            })
        }
    }
    function solveConstraint(pointA: Sprite, pointB: Sprite, length: number, isFixedA: boolean, isFixedB: boolean) {
        let dx = pointB.x - pointA.x
        let dy = pointB.y - pointA.y
        let distance = Math.sqrt(dx * dx + dy * dy)
        let diff = length - distance
        let percent = diff / distance / 2
        let offsetX = dx * percent
        let offsetY = dy * percent
        if (!isFixedB) {
            pointB.x += offsetX
            pointB.y += offsetY
        }
        if (!isFixedA) {
            pointA.x -= offsetX
            pointA.y -= offsetY
        }
    }
    function fillTriangle(img: Image, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, color: number) {
        x1 = Math.round(x1)
        y1 = Math.round(y1)
        x2 = Math.round(x2)
        y2 = Math.round(y2)
        x3 = Math.round(x3)
        y3 = Math.round(y3)
        if (y1 > y2) {
            let tempX = x1
            let tempY = y1
            x1 = x2
            y1 = y2
            x2 = tempX
            y2 = tempY
        }
        if (y2 > y3) {
            let tempX = x2
            let tempY = y2
            x2 = x3
            y2 = y3
            x3 = tempX
            y3 = tempY
        }
        if (y1 > y2) {
            let tempX = x1
            let tempY = y1
            x1 = x2
            y1 = y2
            x2 = tempX
            y2 = tempY
        }
        if (y3 < 0 || y1 >= img.height) return
        let startY = Math.max(0, y1)
        let endY = Math.min(img.height - 1, y3)
        let dx13 = y3 - y1 !== 0 ? (x3 - x1) / (y3 - y1) : 0
        let dx12 = y2 - y1 !== 0 ? (x2 - x1) / (y2 - y1) : 0
        let dx23 = y3 - y2 !== 0 ? (x3 - x2) / (y3 - y2) : 0
        for (let y = startY; y <= endY; y++) {
            let sx, ex
            if (y < y2) {
                sx = x1 + dx13 * (y - y1)
                ex = x1 + dx12 * (y - y1)
            }
            else {
                sx = x1 + dx13 * (y - y1)
                ex = x2 + dx23 * (y - y2)
            }
            if (sx > ex) {
                let temp = sx
                sx = ex
                ex = temp
            }
            sx = Math.max(0, Math.min(img.width - 1, Math.round(sx)))
            ex = Math.max(0, Math.min(img.width - 1, Math.round(ex)))
            for (let x = sx; x <= ex; x++) {
                img.setPixel(x, y, color)
            }
        }
    }
    function drawHorizontalLine(img: Image, x1: number, y: number, x2: number, color: number) {
        if (y < 0 || y >= img.height) return;
        if (x1 > x2) [x1, x2] = [x2, x1];
        x1 = Math.max(0, Math.min(img.width - 1, x1));
        x2 = Math.max(0, Math.min(img.width - 1, x2));
        for (let x = x1; x <= x2; x++) {
            img.setPixel(x, y, color);
        }
    }
    export enum SegmentDirection {
        //% block="right"
        Right,
        //% block="left"
        Left,
        //% block="up"
        Up,
        //% block="down"
        Down
    }
    //% block="create soft body from $segment length $length segments $segments gravity $hasGravity"
    //% segment.shadow=variables_get
    //% length.defl=5
    //% segments.defl=8
    //% hasGravity.defl=true
    //% blockSetVariable=mySoftBody
    //% group="Creation"
    export function createSoftBody(segment: Sprite, length: number, segments: number, hasGravity: boolean): SoftBody {
        let body = new SoftBody(segment, length, segments, hasGravity)
        activeSoftBodies.push(body)
        return body
    }
    //% block="set segment $index in $softBody gravity $hasGravity"
    //% index.defl=0
    //% softBody.shadow=variables_get
    //% hasGravity.defl=true
    //% group="Modify"
    export function setSegmentGravity(index: number, softBody: SoftBody, hasGravity: boolean) {
        softBody.setSegmentGravity(index, hasGravity)
    }
    //% block="update $softBody"
    //% softBody.shadow=variables_get
    //% group="Update"
    export function updateSoftBody(softBody: SoftBody) {
        softBody.update()
    }
    //% block="set $softBody gravity strength to $strength"
    //% softBody.shadow=variables_get
    //% strength.defl=400
    //% group="Modify"
    export function setGravityStrength(softBody: SoftBody, strength: number) {
        softBody.setGravityStrength(strength)
    }
    //% block="set segment $index in $softBody position to x $x y $y"
    //% softBody.shadow=variables_get
    //% index.defl=0
    //% x.defl=80 y.defl=60
    //% group="Modify"
    export function setSegmentPosition(index: number, softBody: SoftBody, x: number, y: number) {
        softBody.setSegmentPosition(index, x, y)
    }
    
    //% block="get segment $index from $softBody"
    //% softBody.shadow=variables_get
    //% index.defl=0
    //% group="Query"
    export function getSegment(index: number, softBody: SoftBody): Sprite {
        return softBody.points[index]
    }
    //% block="draw lines between segments of $softBody with color $color"
    //% softBody.shadow=variables_get
    //% color.defl=1
    //% group="Modify"
    export function setLineColor(softBody: SoftBody, color: number) {
        softBody.lineColor = color
        softBody.shouldDrawLines = true
    }
    //% block="fill area between segments of $softBody with color $color"
    //% softBody.shadow=variables_get
    //% color.defl=2
    //% group="Modify"
    export function setFillBetweenSegments(softBody: SoftBody, color: number) {
        softBody.fillColor = color
        softBody.shouldFill = true
    }
    //% block="render soft body $softBody on $drawTarget"
    //% softBody.shadow=variables_get
    //% drawTarget.shadow=variables_get
    //% group="Update"
    export function renderSoftBody(softBody: SoftBody, drawTarget: Image) {
        if (softBody.shouldFill && softBody.points.length > 1) {
            let leftSide: { x: number, y: number }[] = []
            let rightSide: { x: number, y: number }[] = []
            for (let i = 0; i < softBody.points.length; i++) {
                let point = softBody.points[i]
                let halfWidth = Math.max(2, point.width / 2)
                let dirX = 0
                let dirY = 0
                if (i < softBody.points.length - 1 && i > 0) {
                    let prevX = softBody.points[i - 1].x
                    let prevY = softBody.points[i - 1].y
                    let nextX = softBody.points[i + 1].x
                    let nextY = softBody.points[i + 1].y
                    dirX = nextX - prevX
                    dirY = nextY - prevY
                } else if (i < softBody.points.length - 1) {
                    dirX = softBody.points[i + 1].x - point.x
                    dirY = softBody.points[i + 1].y - point.y
                } else if (i > 0) {
                    dirX = point.x - softBody.points[i - 1].x
                    dirY = point.y - softBody.points[i - 1].y
                }
                let length = Math.sqrt(dirX * dirX + dirY * dirY)
                if (length > 0) {
                    dirX /= length
                    dirY /= length
                } else {
                    dirX = 1
                    dirY = 0
                }
                let perpX = -dirY
                let perpY = dirX
                leftSide.push({
                    x: point.x + perpX * halfWidth,
                    y: point.y + perpY * halfWidth
                })
                rightSide.push({
                    x: point.x - perpX * halfWidth,
                    y: point.y - perpY * halfWidth
                })
            }
            for (let i = 0; i < softBody.points.length - 1; i++) {
                let x1 = leftSide[i].x
                let y1 = leftSide[i].y
                let x2 = leftSide[i + 1].x
                let y2 = leftSide[i + 1].y
                let x3 = rightSide[i + 1].x
                let y3 = rightSide[i + 1].y
                let x4 = rightSide[i].x
                let y4 = rightSide[i].y
                const maxDistance = 1000
                const screenBounds = {
                    minX: -maxDistance,
                    minY: -maxDistance,
                    maxX: drawTarget.width + maxDistance,
                    maxY: drawTarget.height + maxDistance
                }
                if (
                    x1 < screenBounds.minX || x1 > screenBounds.maxX || y1 < screenBounds.minY || y1 > screenBounds.maxY ||
                    x2 < screenBounds.minX || x2 > screenBounds.maxX || y2 < screenBounds.minY || y2 > screenBounds.maxY ||
                    x3 < screenBounds.minX || x3 > screenBounds.maxX || y3 < screenBounds.minY || y3 > screenBounds.maxY ||
                    x4 < screenBounds.minX || x4 > screenBounds.maxX || y4 < screenBounds.minY || y4 > screenBounds.maxY
                ) {
                    continue
                }
                fillTriangle(drawTarget, x1, y1, x2, y2, x3, y3, softBody.fillColor)
                fillTriangle(drawTarget, x1, y1, x3, y3, x4, y4, softBody.fillColor)
            }
        }
        if (softBody.shouldDrawLines) {
            for (let i = 0; i < softBody.points.length - 1; i++) {
                drawTarget.drawLine(
                    softBody.points[i].x,
                    softBody.points[i].y,
                    softBody.points[i + 1].x,
                    softBody.points[i + 1].y,
                    softBody.lineColor
                )
            }
        }
    }
    //% block="update all visible soft bodies"
    //% group="Update"
    export function updateAllVisibleSoftBodies() {
        for (let softBody of activeSoftBodies) {
            softBody.update()
        }
    }
    //% block="render all visible soft bodies on $drawTarget"
    //% drawTarget.shadow=variables_get
    //% group="Update"
    export function renderAllVisibleSoftBodies(drawTarget: Image) {
        for (let softBody of activeSoftBodies) {
            if (softBody.shouldFill && softBody.points.length > 1) {
                let leftSide: { x: number, y: number }[] = []
                let rightSide: { x: number, y: number }[] = []
                for (let i = 0; i < softBody.points.length; i++) {
                    let point = softBody.points[i]
                    let halfWidth = Math.max(2, point.width / 2)
                    let dirX = 0
                    let dirY = 0
                    if (i < softBody.points.length - 1 && i > 0) {
                        let prevX = softBody.points[i - 1].x
                        let prevY = softBody.points[i - 1].y
                        let nextX = softBody.points[i + 1].x
                        let nextY = softBody.points[i + 1].y
                        dirX = nextX - prevX
                        dirY = nextY - prevY
                    } else if (i < softBody.points.length - 1) {
                        dirX = softBody.points[i + 1].x - point.x
                        dirY = softBody.points[i + 1].y - point.y
                    } else if (i > 0) {
                        dirX = point.x - softBody.points[i - 1].x
                        dirY = point.y - softBody.points[i - 1].y
                    }
                    let length = Math.sqrt(dirX * dirX + dirY * dirY)
                    if (length > 0) {
                        dirX /= length
                        dirY /= length
                    } else {
                        dirX = 1
                        dirY = 0
                    }
                    let perpX = -dirY
                    let perpY = dirX
                    leftSide.push({
                        x: point.x + perpX * halfWidth,
                        y: point.y + perpY * halfWidth
                    })
                    rightSide.push({
                        x: point.x - perpX * halfWidth,
                        y: point.y - perpY * halfWidth
                    })
                }
                for (let i = 0; i < softBody.points.length - 1; i++) {
                    let x1 = leftSide[i].x
                    let y1 = leftSide[i].y
                    let x2 = leftSide[i + 1].x
                    let y2 = leftSide[i + 1].y
                    let x3 = rightSide[i + 1].x
                    let y3 = rightSide[i + 1].y
                    let x4 = rightSide[i].x
                    let y4 = rightSide[i].y
                    const maxDistance = 1000
                    const screenBounds = {
                        minX: -maxDistance,
                        minY: -maxDistance,
                        maxX: drawTarget.width + maxDistance,
                        maxY: drawTarget.height + maxDistance
                    }
                    if (
                        x1 < screenBounds.minX || x1 > screenBounds.maxX || y1 < screenBounds.minY || y1 > screenBounds.maxY ||
                        x2 < screenBounds.minX || x2 > screenBounds.maxX || y2 < screenBounds.minY || y2 > screenBounds.maxY ||
                        x3 < screenBounds.minX || x3 > screenBounds.maxX || y3 < screenBounds.minY || y3 > screenBounds.maxY ||
                        x4 < screenBounds.minX || x4 > screenBounds.maxX || y4 < screenBounds.minY || y4 > screenBounds.maxY
                    ) {
                        continue
                    }
                    fillTriangle(drawTarget, x1, y1, x2, y2, x3, y3, softBody.fillColor)
                    fillTriangle(drawTarget, x1, y1, x3, y3, x4, y4, softBody.fillColor)
                }
            }
            if (softBody.shouldDrawLines) {
                for (let i = 0; i < softBody.points.length - 1; i++) {
                    drawTarget.drawLine(
                        softBody.points[i].x,
                        softBody.points[i].y,
                        softBody.points[i + 1].x,
                        softBody.points[i + 1].y,
                        softBody.lineColor
                    )
                }
            }
        }
    }
    //% block="render soft body $softBody on sprite $targetSprite"
    //% softBody.shadow=variables_get
    //% targetSprite.shadow=variables_get
    //% group="Update"
    export function renderSoftBodyOnSprite(softBody: SoftBody, targetSprite: Sprite) {
        let drawTarget = targetSprite.image
        let spriteX = targetSprite.x - targetSprite.image.width / 2
        let spriteY = targetSprite.y - targetSprite.image.height / 2
        if (softBody.shouldDrawLines) {
            for (let i = 0; i < softBody.points.length - 1; i++) {
                let x1 = softBody.points[i].x - spriteX
                let y1 = softBody.points[i].y - spriteY
                let x2 = softBody.points[i + 1].x - spriteX
                let y2 = softBody.points[i + 1].y - spriteY
                if (isLineInBounds(x1, y1, x2, y2, drawTarget.width, drawTarget.height)) {
                    drawTarget.drawLine(x1, y1, x2, y2, softBody.lineColor)
                }
            }
        }
    }
    //% block="render all visible soft bodies on sprite $targetSprite"
    //% targetSprite.shadow=variables_get
    //% group="Update"
    export function renderAllVisibleSoftBodiesOnSprite(targetSprite: Sprite) {
        let drawTarget = targetSprite.image
        let cameraX = scene.cameraProperty(CameraProperty.X)
        let cameraY = scene.cameraProperty(CameraProperty.Y)
        let spriteWorldX = cameraX - targetSprite.image.width / 2
        let spriteWorldY = cameraY - targetSprite.image.height / 2
        for (let softBody of activeSoftBodies) {
            if (softBody.shouldFill && softBody.points.length > 1) {
                let leftSide: { x: number, y: number }[] = []
                let rightSide: { x: number, y: number }[] = []
                for (let i = 0; i < softBody.points.length; i++) {
                    let point = softBody.points[i]
                    let halfWidth = Math.max(2, point.width / 2)
                    let relativeX = point.x - spriteWorldX
                    let relativeY = point.y - spriteWorldY
                    let dirX = 0
                    let dirY = 0
                    if (i < softBody.points.length - 1 && i > 0) {
                        let prevX = softBody.points[i - 1].x - spriteWorldX
                        let prevY = softBody.points[i - 1].y - spriteWorldY
                        let nextX = softBody.points[i + 1].x - spriteWorldX
                        let nextY = softBody.points[i + 1].y - spriteWorldY
                        dirX = nextX - prevX
                        dirY = nextY - prevY
                    } else if (i < softBody.points.length - 1) {
                        dirX = (softBody.points[i + 1].x - spriteWorldX) - relativeX
                        dirY = (softBody.points[i + 1].y - spriteWorldY) - relativeY
                    } else if (i > 0) {
                        dirX = relativeX - (softBody.points[i - 1].x - spriteWorldX)
                        dirY = relativeY - (softBody.points[i - 1].y - spriteWorldY)
                    }
                    let length = Math.sqrt(dirX * dirX + dirY * dirY)
                    if (length > 0) {
                        dirX /= length
                        dirY /= length
                    } else {
                        dirX = 1
                        dirY = 0
                    }
                    let perpX = -dirY
                    let perpY = dirX
                    leftSide.push({
                        x: relativeX + perpX * halfWidth,
                        y: relativeY + perpY * halfWidth
                    })
                    rightSide.push({
                        x: relativeX - perpX * halfWidth,
                        y: relativeY - perpY * halfWidth
                    })
                }
                for (let i = 0; i < softBody.points.length - 1; i++) {
                    let x1 = leftSide[i].x
                    let y1 = leftSide[i].y
                    let x2 = leftSide[i + 1].x
                    let y2 = leftSide[i + 1].y
                    let x3 = rightSide[i + 1].x
                    let y3 = rightSide[i + 1].y
                    let x4 = rightSide[i].x
                    let y4 = rightSide[i].y
                    fillTriangle(drawTarget, x1, y1, x2, y2, x3, y3, softBody.fillColor)
                    fillTriangle(drawTarget, x1, y1, x3, y3, x4, y4, softBody.fillColor)
                }
            }
            if (softBody.shouldDrawLines) {
                for (let i = 0; i < softBody.points.length - 1; i++) {
                    let x1 = softBody.points[i].x - spriteWorldX
                    let y1 = softBody.points[i].y - spriteWorldY
                    let x2 = softBody.points[i + 1].x - spriteWorldX
                    let y2 = softBody.points[i + 1].y - spriteWorldY
                    if (isLineInBounds(x1, y1, x2, y2, drawTarget.width, drawTarget.height)) {
                        drawTarget.drawLine(x1, y1, x2, y2, softBody.lineColor)
                    }
                }
            }
        }
    }
    function isLineInBounds(x1: number, y1: number, x2: number, y2: number, width: number, height: number): boolean {
        return !((x1 < 0 && x2 < 0) || (x1 >= width && x2 >= width) ||
            (y1 < 0 && y2 < 0) || (y1 >= height && y2 >= height))
    }
    //% block="set $softBody damping to $value"
    //% softBody.shadow=variables_get
    //% value.defl=0.98 value.min=0 value.max=1
    //% group="Modify"
    export function setDamping(softBody: SoftBody, value: number) {
        softBody.damping = value
    }
    //% block="set $softBody spring stiffness to $value"
    //% softBody.shadow=variables_get
    //% value.defl=0.8 value.min=0 value.max=2
    //% group="Modify"
    export function setSpringStiffness(softBody: SoftBody, value: number) {
        softBody.springStiffness = value
    }
    //% block="set $softBody segment max velocity to $value"
    //% softBody.shadow=variables_get
    //% value.defl=80 value.min=0
    //% group="Modify"
    export function setSegmentMaxVelocity(softBody: SoftBody, value: number) {
        softBody.maxSegmentVelocity = Math.max(0, value)
    }
    //% block="destroy $softBody"
    //% softBody.shadow=variables_get
    //% group="Creation"
    export function destroySoftBody(softBody: SoftBody) {
        for (let point of softBody.points) {
            point.destroy()
        }
        activeSoftBodies.removeElement(softBody)
    }
    //% block="add $sprite to $softBody"
    //% sprite.shadow=variables_get
    //% softBody.shadow=variables_get
    //% group="Modify"
    export function addSegmentToSoftBody(sprite: Sprite, softBody: SoftBody) {
        let lastPoint = softBody.points[softBody.points.length - 1]
        sprite.x = lastPoint.x + softBody.segmentLength
        sprite.y = lastPoint.y
        softBody.points.push(sprite)
        softBody.oldX.push(sprite.x)
        softBody.oldY.push(sprite.y)
        softBody.isFixed.push(false)
    }
    //% block="remove segment $index from $softBody"
    //% index.defl=0
    //% softBody.shadow=variables_get
    //% group="Modify"
    export function removeSegmentFromSoftBody(index: number, softBody: SoftBody) {
        if (index >= 0 && index < softBody.points.length) {
            softBody.points[index].destroy()
            softBody.points.removeAt(index)
            softBody.oldX.removeAt(index)
            softBody.oldY.removeAt(index)
            softBody.isFixed.removeAt(index)
        }
    }
    //% block="place $softBody at x $x y $y"
    //% softBody.shadow=variables_get
    //% x.defl=80 y.defl=60
    //% group="Modify"
    export function placeSoftBody(softBody: SoftBody, x: number, y: number) {
        let offsetX = x - softBody.points[0].x
        let offsetY = y - softBody.points[0].y
        for (let i = 0; i < softBody.points.length; i++) {
            softBody.points[i].x += offsetX
            softBody.points[i].y += offsetY
            softBody.oldX[i] += offsetX
            softBody.oldY[i] += offsetY
        }
    }
    //% block="set $softBody movement locked to $locked"
    //% softBody.shadow=variables_get
    //% locked.defl=true
    //% group="Modify"
    export function setSoftBodyLocked(softBody: SoftBody, locked: boolean) {
        for (let i = 0; i < softBody.points.length; i++) {
            softBody.isFixed[i] = locked
        }
    }
    //% block="get angle of segment $index in $softBody"
    //% softBody.shadow=variables_get
    //% index.defl=0
    //% group="Query"
    export function getSegmentAngle(index: number, softBody: SoftBody): number {
        if (index >= softBody.points.length - 1) return 0
        let current = softBody.points[index]
        let next = softBody.points[index + 1]
        let dx = next.x - current.x
        let dy = next.y - current.y
        return Math.atan2(dy, dx) * 57.296
    }
    //% block="get $softBody segment count"
    //% softBody.shadow=variables_get
    //% group="Query"
    export function getSoftBodySegmentCount(softBody: SoftBody): number {
        return softBody.points.length
    }
    //% block="set $softBody segment direction to $direction"
    //% softBody.shadow=variables_get
    //% direction.defl=SegmentDirection.Right
    //% group="Modify"
    export function setSegmentDirection(softBody: SoftBody, direction: SegmentDirection) {
        let lastPoint = softBody.points[0]
        for (let i = 1; i < softBody.points.length; i++) {
            let point = softBody.points[i]
            switch (direction) {
                case SegmentDirection.Right:
                    point.x = lastPoint.x + softBody.segmentLength
                    point.y = lastPoint.y
                    break
                case SegmentDirection.Left:
                    point.x = lastPoint.x - softBody.segmentLength
                    point.y = lastPoint.y
                    break
                case SegmentDirection.Up:
                    point.x = lastPoint.x
                    point.y = lastPoint.y - softBody.segmentLength
                    break
                case SegmentDirection.Down:
                    point.x = lastPoint.x
                    point.y = lastPoint.y + softBody.segmentLength
                    break
            }
            softBody.oldX[i] = point.x
            softBody.oldY[i] = point.y
            lastPoint = point
        }
    }
}


