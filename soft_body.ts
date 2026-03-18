//% weight=100 color=#7E58AD icon="\uf0c1"
namespace softbody {

    let activeSoftBodies: SoftBody[] = []
    export class SoftBody {
        public points: Sprite[] = []
        public simX: number[] = []
        public simY: number[] = []
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
        public maxStretchFactor: number = 0
        public shouldFill: boolean = false
        public fillColor: number = 2
        public segmentFillColors: number[] = []
        constructor(segment: Sprite, length: number, segments: number, hasGravity: boolean) {
            this.segmentLength = length
            this.hasGravity = hasGravity
            let templateImage = image.create(segment.image.width, segment.image.height)
            templateImage.drawImage(segment.image, 0, 0)
            for (let i = 0; i < segments; i++) {
                let newSprite = sprites.create(templateImage.clone())
                newSprite.setPosition(segment.x + (i * length), segment.y)
                this.points.push(newSprite)
                this.simX.push(newSprite.x)
                this.simY.push(newSprite.y)
                this.oldX.push(newSprite.x)
                this.oldY.push(newSprite.y)
                this.isFixed.push(false)
                this.segmentFillColors.push(this.fillColor)
            }
        }
        update() {
            const dt = 1 / 60
            let forces: { x: number, y: number }[] = []
            for (let i = 0; i < this.points.length; i++) {
                forces.push({ x: 0, y: 0 })
                let externalDx = this.points[i].x - this.simX[i]
                let externalDy = this.points[i].y - this.simY[i]
                if (Math.abs(externalDx) > 0.75 || Math.abs(externalDy) > 0.75) {
                    this.simX[i] = this.points[i].x
                    this.simY[i] = this.points[i].y
                    if (this.isFixed[i]) {
                        this.oldX[i] = this.simX[i]
                        this.oldY[i] = this.simY[i]
                    }
                }
            }
            for (let i = 0; i < this.points.length - 1; i++) {
                let dx = this.simX[i + 1] - this.simX[i]
                let dy = this.simY[i + 1] - this.simY[i]
                let distance = Math.sqrt(dx * dx + dy * dy)
                if (distance === 0) continue

                if (this.maxStretchFactor > 0) {
                    let maxDist = this.segmentLength * this.maxStretchFactor
                    if (distance > maxDist) {
                        let excess = distance - maxDist
                        let nx = dx / distance
                        let ny = dy / distance

                        if (!this.isFixed[i] && !this.isFixed[i + 1]) {
                            this.simX[i] += nx * excess * 0.5
                            this.simY[i] += ny * excess * 0.5
                            this.simX[i + 1] -= nx * excess * 0.5
                            this.simY[i + 1] -= ny * excess * 0.5
                        } else if (!this.isFixed[i]) {
                            this.simX[i] += nx * excess
                            this.simY[i] += ny * excess
                        } else if (!this.isFixed[i + 1]) {
                            this.simX[i + 1] -= nx * excess
                            this.simY[i + 1] -= ny * excess
                        }

                        distance = maxDist
                        dx = this.simX[i + 1] - this.simX[i]
                        dy = this.simY[i + 1] - this.simY[i]
                    }
                }
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
            this.applyConnections()

            for (let i = 0; i < this.points.length; i++) {
                if (!this.isFixed[i]) {
                    let tempX = this.simX[i]
                    let tempY = this.simY[i]
                    let velX = (this.simX[i] - this.oldX[i]) * this.damping
                    let velY = (this.simY[i] - this.oldY[i]) * this.damping

                    let newX = this.simX[i] + velX + forces[i].x
                    let newY = this.simY[i] + velY + forces[i].y

                    if (this.hasGravity) {
                        newY += this.gravityStrength * dt * dt
                    }
                    if (this.maxSegmentVelocity > 0) {
                        let dx = newX - this.oldX[i]
                        let dy = newY - this.oldY[i]
                        let speed = Math.sqrt(dx * dx + dy * dy)

                        if (speed > this.maxSegmentVelocity) {
                            let scale = this.maxSegmentVelocity / speed
                            newX = this.oldX[i] + dx * scale
                            newY = this.oldY[i] + dy * scale
                        }
                    }

                    this.simX[i] = newX
                    this.simY[i] = newY

                    this.oldX[i] = tempX
                    this.oldY[i] = tempY
                } else {
                    this.oldX[i] = this.simX[i]
                    this.oldY[i] = this.simY[i]
                }
                this.points[i].x = this.simX[i]
                this.points[i].y = this.simY[i]
            }
        }
        private applyConnections() {
            for (let connection of this.connections) {
                let thisIndex = connection.thisSegment
                let otherIndex = connection.otherSegment
                let otherBody = connection.otherBody
                if (!isValidSegmentIndex(this, thisIndex) || !isValidSegmentIndex(otherBody, otherIndex)) {
                    continue
                }
                let ax = this.simX[thisIndex]
                let ay = this.simY[thisIndex]
                let bx = otherBody.simX[otherIndex]
                let by = otherBody.simY[otherIndex]
                let dx = bx - ax
                let dy = by - ay
                let distance = Math.sqrt(dx * dx + dy * dy)
                if (distance === 0) continue

                let diff = connection.restLength - distance
                let percent = diff / distance
                let offsetX = dx * percent
                let offsetY = dy * percent

                let isFixedA = this.isFixed[thisIndex]
                let isFixedB = otherBody.isFixed[otherIndex]
                if (!isFixedA && !isFixedB) {
                    this.simX[thisIndex] -= offsetX * 0.5
                    this.simY[thisIndex] -= offsetY * 0.5
                    otherBody.simX[otherIndex] += offsetX * 0.5
                    otherBody.simY[otherIndex] += offsetY * 0.5
                } else if (!isFixedA) {
                    this.simX[thisIndex] -= offsetX
                    this.simY[thisIndex] -= offsetY
                } else if (!isFixedB) {
                    otherBody.simX[otherIndex] += offsetX
                    otherBody.simY[otherIndex] += offsetY
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
                this.simX[index] = x
                this.simY[index] = y
                this.oldX[index] = x
                this.oldY[index] = y
            }
        }
        static connectSoftBodies(body1: SoftBody, segment1: number, body2: SoftBody, segment2: number) {
            if (!isValidSegmentIndex(body1, segment1) || !isValidSegmentIndex(body2, segment2)) {
                return
            }
            let dx = body2.simX[segment2] - body1.simX[segment1]
            let dy = body2.simY[segment2] - body1.simY[segment1]
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
    function isValidSegmentIndex(body: SoftBody, index: number): boolean {
        if (!body) return false
        return index >= 0 && index < body.points.length
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
    function buildBodySides(softBody: SoftBody, offsetX: number, offsetY: number, minHalfWidth: number): { leftSide: { x: number, y: number }[], rightSide: { x: number, y: number }[] } {
        let leftSide: { x: number, y: number }[] = []
        let rightSide: { x: number, y: number }[] = []
        for (let i = 0; i < softBody.points.length; i++) {
            let point = softBody.points[i]
            let halfWidth = Math.max(minHalfWidth, point.width / 2)
            let relativeX = point.x - offsetX
            let relativeY = point.y - offsetY
            let dirX = 0
            let dirY = 0
            if (i < softBody.points.length - 1 && i > 0) {
                let prevX = softBody.points[i - 1].x - offsetX
                let prevY = softBody.points[i - 1].y - offsetY
                let nextX = softBody.points[i + 1].x - offsetX
                let nextY = softBody.points[i + 1].y - offsetY
                dirX = nextX - prevX
                dirY = nextY - prevY
            } else if (i < softBody.points.length - 1) {
                dirX = (softBody.points[i + 1].x - offsetX) - relativeX
                dirY = (softBody.points[i + 1].y - offsetY) - relativeY
            } else if (i > 0) {
                dirX = relativeX - (softBody.points[i - 1].x - offsetX)
                dirY = relativeY - (softBody.points[i - 1].y - offsetY)
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
        return { leftSide: leftSide, rightSide: rightSide }
    }
    function shouldCullQuad(drawTarget: Image, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean {
        const maxDistance = 1000
        const minX = -maxDistance
        const minY = -maxDistance
        const maxX = drawTarget.width + maxDistance
        const maxY = drawTarget.height + maxDistance
        return (
            x1 < minX || x1 > maxX || y1 < minY || y1 > maxY ||
            x2 < minX || x2 > maxX || y2 < minY || y2 > maxY ||
            x3 < minX || x3 > maxX || y3 < minY || y3 > maxY ||
            x4 < minX || x4 > maxX || y4 < minY || y4 > maxY
        )
    }
    function drawBodyFill(softBody: SoftBody, drawTarget: Image, offsetX: number, offsetY: number, cullOffscreen: boolean, minHalfWidth: number) {
        if (!softBody.shouldFill || softBody.points.length <= 1) return
        let sides = buildBodySides(softBody, offsetX, offsetY, minHalfWidth)
        let leftSide = sides.leftSide
        let rightSide = sides.rightSide
        for (let i = 0; i < softBody.points.length - 1; i++) {
            let x1 = leftSide[i].x
            let y1 = leftSide[i].y
            let x2 = leftSide[i + 1].x
            let y2 = leftSide[i + 1].y
            let x3 = rightSide[i + 1].x
            let y3 = rightSide[i + 1].y
            let x4 = rightSide[i].x
            let y4 = rightSide[i].y
            if (cullOffscreen && shouldCullQuad(drawTarget, x1, y1, x2, y2, x3, y3, x4, y4)) {
                continue
            }
            let segmentColor = softBody.fillColor
            if (softBody.segmentFillColors && softBody.segmentFillColors.length > i) {
                segmentColor = softBody.segmentFillColors[i]
            }
            fillTriangle(drawTarget, x1, y1, x2, y2, x3, y3, segmentColor)
            fillTriangle(drawTarget, x1, y1, x3, y3, x4, y4, segmentColor)
        }
    }
    function drawBodyLines(softBody: SoftBody, drawTarget: Image, offsetX: number, offsetY: number, clipToTarget: boolean) {
        if (!softBody.shouldDrawLines) return
        for (let i = 0; i < softBody.points.length - 1; i++) {
            let x1 = softBody.points[i].x - offsetX
            let y1 = softBody.points[i].y - offsetY
            let x2 = softBody.points[i + 1].x - offsetX
            let y2 = softBody.points[i + 1].y - offsetY
            if (!clipToTarget || isLineInBounds(x1, y1, x2, y2, drawTarget.width, drawTarget.height)) {
                drawTarget.drawLine(x1, y1, x2, y2, softBody.lineColor)
            }
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
    //% block="destroy $softBody"
    //% softBody.shadow=variables_get
    //% group="Creation"
    //% help=github:bladebaillio/soft-body-extension/docs/creation
    export function destroySoftBody(softBody: SoftBody) {
        for (let point of softBody.points) {
            point.destroy()
        }
        activeSoftBodies.removeElement(softBody)
    }
    //% block="cut $softBody at segment $index"
    //% softBody.shadow=variables_get
    //% index.defl=0
    //% blockSetVariable=newSoftBody
    //% group="Creation"
    //% help=github:bladebaillio/soft-body-extension/docs/creation
    export function cutSoftBodyAtSegment(
        softBody: SoftBody,
        index: number
    ): SoftBody | null {
        let count = softBody.points.length

        if (index < 0 || index >= count - 1) {
            return null
        }
        let templateSprite = softBody.points[index + 1]
        let newBody = new SoftBody(
            templateSprite,
            softBody.segmentLength,
            0,
            softBody.hasGravity
        )
        newBody.damping = softBody.damping
        newBody.springStiffness = softBody.springStiffness
        newBody.gravityStrength = softBody.gravityStrength
        newBody.maxSegmentVelocity = softBody.maxSegmentVelocity
        newBody.maxStretchFactor = softBody.maxStretchFactor
        newBody.shouldDrawLines = softBody.shouldDrawLines
        newBody.lineColor = softBody.lineColor
        newBody.shouldFill = softBody.shouldFill
        newBody.fillColor = softBody.fillColor

        for (let i = index + 1; i < count; i++) {
            let p = softBody.points[i]
            newBody.points.push(p)
            newBody.simX.push(softBody.simX[i])
            newBody.simY.push(softBody.simY[i])
            newBody.oldX.push(softBody.oldX[i])
            newBody.oldY.push(softBody.oldY[i])
            newBody.isFixed.push(softBody.isFixed[i])
            if (softBody.segmentFillColors && softBody.segmentFillColors.length > i) {
                newBody.segmentFillColors.push(softBody.segmentFillColors[i])
            } else {
                newBody.segmentFillColors.push(softBody.fillColor)
            }
        }

        let removeCount = count - (index + 1)
        for (let i = 0; i < removeCount; i++) {
            softBody.points.pop()
            softBody.simX.pop()
            softBody.simY.pop()
            softBody.oldX.pop()
            softBody.oldY.pop()
            softBody.isFixed.pop()
            if (softBody.segmentFillColors && softBody.segmentFillColors.length > 0) {
                softBody.segmentFillColors.pop()
            }
        }

        activeSoftBodies.push(newBody)
        return newBody
    }

    //% block="create soft body from $segment length $length segments $segments gravity $hasGravity"
    //% segment.shadow=variables_get
    //% length.defl=5
    //% segments.defl=8
    //% hasGravity.defl=true
    //% blockSetVariable=mySoftBody
    //% group="Creation"
    //% help=github:bladebaillio/soft-body-extension/docs/creation
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
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function setSegmentGravity(index: number, softBody: SoftBody, hasGravity: boolean) {
        softBody.setSegmentGravity(index, hasGravity)
    }
    //% block="update $softBody"
    //% softBody.shadow=variables_get
    //% group="Update"
    //% help=github:bladebaillio/soft-body-extension/docs/update
    export function updateSoftBody(softBody: SoftBody) {
        softBody.update()
    }
    //% block="set $softBody gravity strength to $strength"
    //% softBody.shadow=variables_get
    //% strength.defl=400
    //% group="Modify"
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function setGravityStrength(softBody: SoftBody, strength: number) {
        softBody.setGravityStrength(strength)
    }
    //% block="set segment $index in $softBody position to x $x y $y"
    //% softBody.shadow=variables_get
    //% index.defl=0
    //% x.defl=80 y.defl=60
    //% group="Modify"
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function setSegmentPosition(index: number, softBody: SoftBody, x: number, y: number) {
        softBody.setSegmentPosition(index, x, y)
    }

    //% block="get segment $index from $softBody"
    //% softBody.shadow=variables_get
    //% index.defl=0
    //% group="Query"
    //% help=github:bladebaillio/soft-body-extension/docs/query
    export function getSegment(index: number, softBody: SoftBody): Sprite {
        return softBody.points[index]
    }
    //% block="draw lines between segments of $softBody with color $color"
    //% softBody.shadow=variables_get
    //% color.defl=1
    //% group="Modify"
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function setLineColor(softBody: SoftBody, color: number) {
        softBody.lineColor = color
        softBody.shouldDrawLines = true
    }
    //% block="fill area between segments of $softBody with color $color"
    //% softBody.shadow=variables_get
    //% color.defl=2
    //% group="Modify"
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function setFillBetweenSegments(softBody: SoftBody, color: number) {
        softBody.fillColor = color
        softBody.shouldFill = true
        for (let i = 0; i < softBody.points.length; i++) {
            softBody.segmentFillColors[i] = color
        }
    }
    //% block="set fill color of segment $index in $softBody to $color"
    //% softBody.shadow=variables_get
    //% index.defl=0
    //% color.defl=2
    //% group="Modify"
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function setSegmentFillColor(index: number, softBody: SoftBody, color: number) {
        if (index < 0 || index >= softBody.points.length) return
        softBody.segmentFillColors[index] = color
        softBody.shouldFill = true
    }
    //% block="render soft body $softBody on $drawTarget"
    //% softBody.shadow=variables_get
    //% drawTarget.shadow=variables_get
    //% group="Update"
    //% help=github:bladebaillio/soft-body-extension/docs/update
    export function renderSoftBody(softBody: SoftBody, drawTarget: Image) {
        drawBodyFill(softBody, drawTarget, 0, 0, true, 2)
        drawBodyLines(softBody, drawTarget, 0, 0, false)
    }
    //% block="update all visible soft bodies"
    //% group="Update"
    //% help=github:bladebaillio/soft-body-extension/docs/update
    export function updateAllVisibleSoftBodies() {
        for (let softBody of activeSoftBodies) {
            softBody.update()
        }
    }
    //% block="render all visible soft bodies on $drawTarget"
    //% drawTarget.shadow=variables_get
    //% group="Update"
    //% help=github:bladebaillio/soft-body-extension/docs/update
    export function renderAllVisibleSoftBodies(drawTarget: Image) {
        for (let softBody of activeSoftBodies) {
            drawBodyFill(softBody, drawTarget, 0, 0, true, 0)
            drawBodyLines(softBody, drawTarget, 0, 0, false)
        }
    }
    //% block="render soft body $softBody on sprite $targetSprite"
    //% softBody.shadow=variables_get
    //% targetSprite.shadow=variables_get
    //% group="Update"
    //% help=github:bladebaillio/soft-body-extension/docs/update
    export function renderSoftBodyOnSprite(softBody: SoftBody, targetSprite: Sprite) {
        let offsetX = targetSprite.x - targetSprite.image.width / 2
        let offsetY = targetSprite.y - targetSprite.image.height / 2
        drawBodyLines(softBody, targetSprite.image, offsetX, offsetY, true)
    }
    //% block="render all visible soft bodies on sprite $targetSprite"
    //% targetSprite.shadow=variables_get
    //% group="Update"
    //% help=github:bladebaillio/soft-body-extension/docs/update
    export function renderAllVisibleSoftBodiesOnSprite(targetSprite: Sprite) {
        let drawTarget = targetSprite.image
        let spriteWorldX = targetSprite.x - targetSprite.image.width / 2
        let spriteWorldY = targetSprite.y - targetSprite.image.height / 2
        for (let softBody of activeSoftBodies) {
            drawBodyFill(softBody, drawTarget, spriteWorldX, spriteWorldY, false, 0)
            drawBodyLines(softBody, drawTarget, spriteWorldX, spriteWorldY, true)
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
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function setDamping(softBody: SoftBody, value: number) {
        softBody.damping = value
    }
    //% block="set $softBody spring stiffness to $value"
    //% softBody.shadow=variables_get
    //% value.defl=0.8 value.min=0 value.max=2
    //% group="Modify"
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function setSpringStiffness(softBody: SoftBody, value: number) {
        softBody.springStiffness = value
    }
    //% block="set $softBody segment max velocity to $value"
    //% softBody.shadow=variables_get
    //% value.defl=80 value.min=0
    //% group="Modify"
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function setSegmentMaxVelocity(softBody: SoftBody, value: number) {
        softBody.maxSegmentVelocity = Math.max(0, value)
    }

    //% block="set $softBody max stretch to $factor"
    //% softBody.shadow=variables_get
    //% factor.defl=1.1 factor.min=1 factor.max=2
    //% group="Modify"
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function setMaxStretch(softBody: SoftBody, factor: number) {
        softBody.maxStretchFactor = Math.max(1, factor)
    }

    //% block="add $sprite to $softBody"
    //% sprite.shadow=variables_get
    //% softBody.shadow=variables_get
    //% group="Modify"
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function addSegmentToSoftBody(sprite: Sprite, softBody: SoftBody) {
        if (softBody.points.length === 0) {
            softBody.points.push(sprite)
            softBody.simX.push(sprite.x)
            softBody.simY.push(sprite.y)
            softBody.oldX.push(sprite.x)
            softBody.oldY.push(sprite.y)
            softBody.isFixed.push(false)
            softBody.segmentFillColors.push(softBody.fillColor)
            return
        }
        let lastPoint = softBody.points[softBody.points.length - 1]
        sprite.x = lastPoint.x + softBody.segmentLength
        sprite.y = lastPoint.y
        softBody.points.push(sprite)
        softBody.simX.push(sprite.x)
        softBody.simY.push(sprite.y)
        softBody.oldX.push(sprite.x)
        softBody.oldY.push(sprite.y)
        softBody.isFixed.push(false)
        softBody.segmentFillColors.push(
            softBody.segmentFillColors.length > 0
                ? softBody.segmentFillColors[softBody.segmentFillColors.length - 1]
                : softBody.fillColor
        )
    }
    //% block="remove segment $index from $softBody"
    //% index.defl=0
    //% softBody.shadow=variables_get
    //% group="Modify"
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function removeSegmentFromSoftBody(index: number, softBody: SoftBody) {
        if (index >= 0 && index < softBody.points.length) {
            softBody.points[index].destroy()
            softBody.points.removeAt(index)
            softBody.simX.removeAt(index)
            softBody.simY.removeAt(index)
            softBody.oldX.removeAt(index)
            softBody.oldY.removeAt(index)
            softBody.isFixed.removeAt(index)
            if (softBody.segmentFillColors && softBody.segmentFillColors.length > index) {
                softBody.segmentFillColors.removeAt(index)
            }
        }
    }
    //% block="place $softBody at x $x y $y"
    //% softBody.shadow=variables_get
    //% x.defl=80 y.defl=60
    //% group="Modify"
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function placeSoftBody(softBody: SoftBody, x: number, y: number) {
        if (softBody.points.length === 0) return
        let offsetX = x - softBody.simX[0]
        let offsetY = y - softBody.simY[0]
        for (let i = 0; i < softBody.points.length; i++) {
            softBody.simX[i] += offsetX
            softBody.simY[i] += offsetY
            softBody.points[i].x = softBody.simX[i]
            softBody.points[i].y = softBody.simY[i]
            softBody.oldX[i] += offsetX
            softBody.oldY[i] += offsetY
        }
    }

    //% block="place $softBody from x $x1 y $y1 to x $x2 y $y2"
    //% softBody.shadow=variables_get
    //% x1.defl=20 y1.defl=60
    //% x2.defl=140 y2.defl=60
    //% group="Modify"
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function placeSoftBodyBetween(
        softBody: SoftBody,
        x1: number,
        y1: number,
        x2: number,
        y2: number
    ) {
        let count = softBody.points.length
        if (count <= 1) return

        let steps = count - 1
        let dx = (x2 - x1) / steps
        let dy = (y2 - y1) / steps

        for (let i = 0; i < count; i++) {
            let x = x1 + dx * i
            let y = y1 + dy * i

            let p = softBody.points[i]
            softBody.simX[i] = x
            softBody.simY[i] = y
            p.x = softBody.simX[i]
            p.y = softBody.simY[i]

            softBody.oldX[i] = x
            softBody.oldY[i] = y
        }
    }

    //% block="get segment index of $sprite in $softBody"
    //% sprite.shadow=variables_get
    //% softBody.shadow=variables_get
    //% group="Query"
    //% help=github:bladebaillio/soft-body-extension/docs/query
    export function getSegmentIndex(
        sprite: Sprite,
        softBody: SoftBody
    ): number {
        if (!sprite || !softBody) return -1

        let targetId = sprite.id
        for (let i = 0; i < softBody.points.length; i++) {
            if (softBody.points[i].id === targetId) {
                return i
            }
        }
        return -1
    }

    //% block="get soft body of segment $sprite"
    //% sprite.shadow=variables_get
    //% group="Query"
    //% help=github:bladebaillio/soft-body-extension/docs/query
    export function getSoftBodyFromSegment(sprite: Sprite): SoftBody | null {
        if (!sprite) return null

        let targetId = sprite.id

        for (let body of activeSoftBodies) {
            for (let p of body.points) {
                if (p.id === targetId) {
                    return body
                }
            }
        }
        return null
    }


    //% block="set $softBody movement locked to $locked"
    //% softBody.shadow=variables_get
    //% locked.defl=true
    //% group="Modify"
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function setSoftBodyLocked(softBody: SoftBody, locked: boolean) {
        for (let i = 0; i < softBody.points.length; i++) {
            softBody.isFixed[i] = locked
        }
    }
    //% block="get angle of segment $index in $softBody"
    //% softBody.shadow=variables_get
    //% index.defl=0
    //% group="Query"
    //% help=github:bladebaillio/soft-body-extension/docs/query
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
    //% help=github:bladebaillio/soft-body-extension/docs/query
    export function getSoftBodySegmentCount(softBody: SoftBody): number {
        return softBody.points.length
    }

    //% block="get total length of $softBody"
    //% softBody.shadow=variables_get
    //% group="Query"
    //% help=github:bladebaillio/soft-body-extension/docs/query
    export function getSoftBodyLength(softBody: SoftBody): number {
        let count = softBody.points.length
        if (count <= 1) return 0
        return softBody.segmentLength * (count - 1)
    }


    //% block="set $softBody segment direction to $direction"
    //% softBody.shadow=variables_get
    //% direction.defl=SegmentDirection.Right
    //% group="Modify"
    //% help=github:bladebaillio/soft-body-extension/docs/modify
    export function setSegmentDirection(softBody: SoftBody, direction: SegmentDirection) {
        for (let i = 1; i < softBody.points.length; i++) {
            let point = softBody.points[i]
            switch (direction) {
                case SegmentDirection.Right:
                    softBody.simX[i] = softBody.simX[i - 1] + softBody.segmentLength
                    softBody.simY[i] = softBody.simY[i - 1]
                    break
                case SegmentDirection.Left:
                    softBody.simX[i] = softBody.simX[i - 1] - softBody.segmentLength
                    softBody.simY[i] = softBody.simY[i - 1]
                    break
                case SegmentDirection.Up:
                    softBody.simX[i] = softBody.simX[i - 1]
                    softBody.simY[i] = softBody.simY[i - 1] - softBody.segmentLength
                    break
                case SegmentDirection.Down:
                    softBody.simX[i] = softBody.simX[i - 1]
                    softBody.simY[i] = softBody.simY[i - 1] + softBody.segmentLength
                    break
            }
            point.x = softBody.simX[i]
            point.y = softBody.simY[i]
            softBody.oldX[i] = softBody.simX[i]
            softBody.oldY[i] = softBody.simY[i]
        }
    }
}

