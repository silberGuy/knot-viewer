# Subsurface loop drawn as its own 2D overlay, not by recoloring existing lines

To show the Subsurface loop on the Subsurface board (not just the Viewer), we needed a way to
render it against the knots' existing 2D lines. The established extension point for per-line
styling is `KnotShape`'s `#line` slot (see ADR 0001) — coloring the lines that belong to the
loop would have reused that seam directly.

We rejected it: a Subsurface loop's points alternate between ordinary points (inherited from a
knot's diagram, mappable to an existing `Line`) and crossing points (interpolated in 3D where
two knots' surfaces intersect, with no corresponding 2D line at all — see `CONTEXT.md`). Slot-based
recoloring can only style lines that exist; segments touching a crossing point would have had to
be skipped or approximated onto the nearest real line, leaving visible gaps or misleading detail
in a walk that's actually continuous.

Instead, every point in the loop — ordinary or crossing — gets a precise 2D position via the
same x/z-plane projection used to build 3D points from the diagram in the first place (`get3DKnots`
in `diagram.ts`; a crossing point's coordinates are already the result of that same 3D geometry).
The Subsurface board computes this projected loop itself, from the same (uncentered) props it
already renders, and draws it as one continuous overlay path on top of `KnotShape`'s output — no
gaps, no approximation, and each point keeps a reference to its source (a `Line`/diagram point,
or the crossing data) for future click/hover interaction.
