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
The Subsurface board computes this projected loop itself, and draws it as one continuous overlay
path on top of `KnotShape`'s output — no gaps, no approximation, and each point keeps a reference
to its source (a `Line`/diagram point, or the crossing data) for future click/hover interaction.

The board computes its loop from the same raw, uncentered knot data it already draws its own
lines from (`App.vue`'s `drawingDataForViewer`, which itself is now just an uneditable copy of
`drawingData` — see below) — the same data the Viewer's `knots3D`/`subSurfaceLoop` are computed
from too. Using identical input for both is not optional: 3D extrusion (`get3DPoint` in
`diagram.ts`) assigns each point's height as `8 * surfaceIndex`, a fixed step independent of the
2D data's scale. An earlier version of this had the Viewer compute from centered-and-halved
coordinates while the board computed from raw ones; feeding the same knots through that extrusion
at two different 2D scales produces two *differently proportioned* 3D shapes, not the same shape
at a different size — their surface triangulations disagreed on which triangles intersect where,
and epsilon-based "same point" checks (`arePointsClose`, `isPointBetweenPoints` in
`sub-surfaces.ts`) that passed at one scale failed at the other, so the Viewer and the board's
overlay computed visibly different loops. Both boards now sharing the same raw data removes that
class of bug entirely, and also means the Subsurface board's knot lines line up with the Drawing
tab's coordinates exactly.

The Viewer's fixed camera and grid, however, were tuned assuming that old centered/halved scale —
raw SVG coordinates can be far larger. Rather than reintroduce a data-level transform (which would
reopen the scale-mismatch bug above), `KnotViewer.vue` wraps only its *rendered* content in a
`TresGroup` with a cosmetic position/scale offset computed from the drawing's bounding box. This
never touches `knots3D` or `subSurfaceLoop` — it's applied after that geometry is already
computed, purely to keep the existing camera framing working. The Subsurface board's 2D overlay,
having no such fixed camera, needs no equivalent.
