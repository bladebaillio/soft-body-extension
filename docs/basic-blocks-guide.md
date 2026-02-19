# Soft-Body Blocks: Basic Usage Guide

This page explains a simple way to use the soft-body blocks in MakeCode Arcade.

## What these blocks do

A **soft body** is a chain of sprite segments connected by spring-like behavior.
You can:

- create a soft body from one sprite,
- update its physics every frame,
- render it to the screen,
- and optionally style it with lines/fill.

## Quick start (basic setup)

Use this order for your blocks:

1. **Create a segment sprite** (the visual dot/part).
2. **Create soft body** from that sprite.
3. In `game.onUpdate`, call **update all visible soft bodies**.
4. In `game.onPaint`, call **render all visible soft bodies on screen**.

## Example workflow

### 1) Create a segment sprite and a soft body

- Make a small sprite (for example 4x4 or 6x6).
- Place it at a start position.
- Use:
  - `create soft body from [segment] length [8] segments [10] gravity [true]`

Tips:

- **length** = distance between connected segments.
- **segments** = total pieces in the chain.
- Turning gravity on makes it droop/fall.

### 2) Update physics every frame

Use:

- `update all visible soft bodies`

Put it inside a repeating update block (like `game.onUpdate`).

### 3) Render every frame

Use:

- `render all visible soft bodies on [screen image]`

Put it in a draw/paint event so visuals refresh each frame.

## Useful modifier blocks

After creating your soft body variable (for example `mySoftBody`), these are common blocks:

- `set [mySoftBody] gravity strength to [400]`
  - Higher number = stronger pull down.
- `set segment [index] in [mySoftBody] gravity [false]`
  - Use `false` to pin/fix one segment in place.
- `set segment [index] in [mySoftBody] position to x [..] y [..]`
  - Good for grabbing or repositioning anchor points.
- `draw lines between segments of [mySoftBody] with color [1]`
  - Turns on line rendering.
- `fill area between segments of [mySoftBody] with color [2]`
  - Gives a thicker, blob-like look.

## Beginner-friendly recipe (rope effect)

- Create a soft body with gravity on.
- Pin segment 0 (set gravity for segment 0 to `false`).
- In update, move segment 0 to follow a sprite/player or fixed point.
- Update + render each frame.

This creates a rope/tail style behavior.

## Common mistakes

- **Created but not updating**: body appears frozen.
- **Updating but not rendering**: physics runs but you do not see lines/fill.
- **Too many segments with high stiffness**: can look jittery.
- **Gravity too high**: body may stretch violently.

## Suggested starting values

- length: `6` to `10`
- segments: `6` to `14`
- gravity strength: `250` to `450`

Adjust slowly until motion looks right in your game.

---

If you want, you can expand this page later with screenshots or GIFs for each block group (`Creation`, `Modify`, `Update`, `Query`).
