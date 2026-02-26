# Soft Body: Query

Use query blocks to inspect bodies and segments.

## Segment queries
- `get segment ... from ...`
- `get segment index of ... in ...`
- `get angle of segment ... in ...`

## Body queries
- `get soft body of segment ...`
- `get ... segment count`
- `get total length of ...`

## Notes
- Indexes are zero-based.
- If a segment or body is not found, query blocks may return `-1` or `null`.
