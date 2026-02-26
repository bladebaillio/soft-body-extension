# Soft Body: Creation

Use these blocks to create and manage soft body chains.

## Create a soft body
- **create soft body from ...**
- `segment`: sprite image used for each segment.
- `length`: target distance between segments.
- `segments`: number of segments to create.
- `gravity`: whether gravity affects segments.

## Cut a soft body
- **cut ... at segment ...**
- Splits a body into two bodies at the index.
- Returns the new body on the right side of the cut.

## Destroy a soft body
- **destroy ...**
- Destroys all segment sprites in that body.

## Example
```blocks
let s = sprites.create(img`1`)
let body = softbody.createSoftBody(s, 6, 8, true)
let body2 = softbody.cutSoftBodyAtSegment(body, 3)
```
