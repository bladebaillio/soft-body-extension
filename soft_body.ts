//% weight=100 color=#7E58AD icon="➰"
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
        public damping: number = 0.98
        public springStiffness: number = 0.8

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

            // Create a fresh template image
            let templateImage = image.create(segment.image.width, segment.image.height)
            templateImage.drawImage(segment.image, 0, 0)

            // Create unique sprites for this chain
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

            // Store all force calculations before applying them
            let forces: { x: number, y: number }[] = []
            for (let i = 0; i < this.points.length; i++) {
                forces.push({ x: 0, y: 0 })
            }

            // Calculate all forces
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

            // Apply forces with snappier response
            for (let i = 0; i < this.points.length; i++) {
                if (!this.isFixed[i]) {
                    let point = this.points[i]
                    let tempX = point.x
                    let tempY = point.y

                    let velX = (point.x - this.oldX[i]) * this.damping
                    let velY = (point.y - this.oldY[i]) * this.damping

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



        // Add this method inside the SoftBody class
        setSegmentGravity(index: number, hasGravity: boolean) {
            if (index >= 0 && index < this.points.length) {
                this.isFixed[index] = !hasGravity
            }
        }
        // Add these methods to the SoftBody class
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
            // Create a joint between the segments
            let dx = body2.points[segment2].x - body1.points[segment1].x
            let dy = body2.points[segment2].y - body1.points[segment1].y
            let distance = Math.sqrt(dx * dx + dy * dy)

            // Store connection info in both bodies
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


    //% block="create soft body from sprite array $segments with length $length gravity $hasGravity"
    //% segments.shadow=variables_get
    //% length.defl=5
    //% hasGravity.defl=true
    //% group="Creation"
    export function createSoftBodyFromArray(segments: Sprite[], length: number, hasGravity: boolean): SoftBody {
        let body = new SoftBody(segments[0], length, segments.length, hasGravity)

        // Replace the auto-generated sprites with the provided ones
        for (let i = 0; i < segments.length; i++) {
            body.points[i].destroy()
            body.points[i] = segments[i]
            body.oldX[i] = segments[i].x
            body.oldY[i] = segments[i].y
        }

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

    // Add these block definitions
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

    //% block="connect segment $segment1 of $body1 to segment $segment2 of $body2"
    //% body1.shadow=variables_get
    //% body2.shadow=variables_get
    //% segment1.defl=0 segment2.defl=0
    //% group="Modify"
    export function connectSoftBodies(body1: SoftBody, segment1: number, body2: SoftBody, segment2: number) {
        SoftBody.connectSoftBodies(body1, segment1, body2, segment2)
    }
    // Add these block definitions
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

    //% block="render soft body $softBody with thickness $thickness on $drawTarget"
    //% softBody.shadow=variables_get
    //% thickness.defl=1
    //% drawTarget.shadow=variables_get
    //% group="Update"
    export function renderSoftBody(softBody: SoftBody, thickness: number, drawTarget: Image) {
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

    //% block="destroy $softBody"
    //% softBody.shadow=variables_get
    //% group="Creation"
    export function destroySoftBody(softBody: SoftBody) {
        // Destroy all sprites
        for (let point of softBody.points) {
            point.destroy()
        }
        // Remove from active soft bodies list
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

        return Math.atan2(dy, dx) * 57.296 // Convert radians to degrees
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
