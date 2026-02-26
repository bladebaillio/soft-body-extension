# Soft Body: Update and Render

Call update blocks every frame, then render to an image or sprite image.

## Update
- `update ...`
- `update all visible soft bodies`

## Render to image
- `render soft body ... on ...`
- `render all visible soft bodies on ...`

## Render to sprite image
- `render soft body ... on sprite ...`
- `render all visible soft bodies on sprite ...`

## Typical loop
```blocks
game.onUpdate(function () {
    softbody.updateAllVisibleSoftBodies()
    softbody.renderAllVisibleSoftBodies(scene.backgroundImage())
})
```
