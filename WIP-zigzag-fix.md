# WIP: subsurface cap zigzag fix (not final — delete once ADR/spec written)

## Status: implemented, partially working. Resume here tomorrow.
One zigzag cluster now nudges apart correctly. At least one other does not yet. Root cause of the
remaining failure not yet diagnosed - no debug data gathered for it (the earlier `console.log` debug
instrumentation was removed once the first case was confirmed against real data; may need to add it
back, scoped to the still-broken cluster, to see why it isn't matching/nudging).

## Confirmed root cause (validated against real loop data via temporary debug logging)
A Zigzag (CONTEXT.md) is NOT two DiagramPoint halves of a drawn Intersection coinciding (that theory,
reached earlier in the grilling session, turned out to be wrong once checked against real data - the
"other half" is often simply absent from the loop entirely). It's an **ordinary diagram Intersection
point** (`diagramPoint.intersection` set) landing at the *exact same flattened coordinate* as a
**Crossing point** (`surfaceIntersection` set, no `diagramPoint`) nearby in the loop - confirmed via
two real examples with exactly-equal float coordinates. Which knot's ordinary copy is present (and
which role - lower/upper - it plays) varies per intersection; the Crossing point fills in for
whichever knot's own copy isn't present in this particular walk.

A third, genuinely different-but-nearby Crossing point is often also present in the same cluster
(CONTEXT.md's "second, nearby crossing point... not at the 2D intersection at all") - that one is
correctly left untouched, only the exactly-coincident pair gets nudged.

## Implementation (`src/utils/sub-surfaces.ts`)
- `ZIGZAG_MATCH_EPSILON = 0.01` - coordinate-coincidence threshold for finding the pair.
- `ZIGZAG_NUDGE_DISTANCE` - currently `40` for visual testing; dial back down (original plan was `1`)
  once fully confirmed working.
- `getZigzagNeighbors` - finds, for a given index, which boundary neighbor is "outward" (continues
  along its own knot's line - ordinary diagram point) vs "cluster" (a Crossing point).
- `nudgeZigzagBoundary` - for each ordinary Intersection point, finds a coincident Crossing point by
  coordinate distance, determines lower/upper roles (via `intersection.bottomLineKnotId`/`topLineKnotId`
  vs the ordinary point's own `knotId`), and nudges the "lower" role toward its own outward neighbor's
  direction, "upper" role the same distance the opposite way.
- Wired into `getShiftedCapBoundary` (single choke point both cap and wall already read from, so cap,
  wall, and cap shift all inherit the fix automatically - matches the earlier "one shared cleanup
  step" decision).

## Next steps (tomorrow)
1. Find the still-broken zigzag cluster; re-add scoped debug logging if needed to see its actual point
   sequence (same technique that resolved the first case - don't keep guessing blind).
2. Likely candidates for why it might differ from the working case: maybe its Crossing-point partner
   isn't immediately adjacent (multiple chained Crossing points), which `getZigzagNeighbors`'s
   immediate-neighbor-only check doesn't handle; or maybe both of `index`'s neighbors end up being
   Crossing points somehow; or a within-knot (`isWithinKnot`) misclassification.
3. Once both clusters confirmed working: dial `ZIGZAG_NUDGE_DISTANCE` back down to something small but
   safely above `ZIGZAG_MATCH_EPSILON`/other 0.01 epsilons (started at `1` as the original plan).
4. Confirm the *other* symptoms are actually fixed too, not just the visual "bump" - bad cap triangles,
   invalid wall-vs-knot intersections, and broken cap shift at these points (the original bug report) -
   not just that the two points visibly separate.
5. Consider whether this needs its own ADR (matching the 0004/0005/0007 pattern) once confirmed.
6. CONTEXT.md's "Zigzag" glossary entry (added this session) may need a small update once the final
   mechanism/fix is fully nailed down - it currently doesn't mention the "ordinary point + Crossing
   point coincide" detail explicitly.

## Relevant files
- `src/utils/sub-surfaces.ts` - `nudgeZigzagBoundary` and helpers, `getShiftedCapBoundary`.
- `src/utils/surfaces.ts` - `getIntersectionsNotInKnotTriangles` (bridging triangle / far-edge crossing
  source).
- `src/utils/drawing.ts` - `intersectionParallelId`/`Intersection` (turned out less central to the fix
  than first assumed, but still relevant background).
- CONTEXT.md - "Zigzag", "Crossing point", "Subsurface cap", "Subsurface wall", "Cap shift".
- ADR 0004, 0005, 0007 - precedent for cap-only / wall-only / shift-only geometric fixes.
