# Secondary wall walks the raw loop, independent of the cap's self-touching split

The Secondary cap (ADR 0004) is a flat, triangulated plane above the loop, deliberately built as
a separate, first step from connecting that cap down to the loop's own points at their real
height. This change adds that connection: the "wall" - for every pair of adjacent loop points, a
rectangle from their flattened, shared-height cap positions down to their real coords.

The cap has to split the loop into simple sub-loops wherever its flattened footprint self-touches
(`splitLoopAtDuplicateIntersections`), because Earcut requires a simple polygon to triangulate an
*area*. The wall isn't triangulating an area - each rectangle is local to one pair of adjacent
points and their two projections, with no dependency on the rest of the loop's shape. So the wall
walks `loop.points` directly, in its original walk order, wrapping the last point back to the
first to close the ring - it never calls `splitLoopAtDuplicateIntersections`. Reusing the cap's
split for the wall would not fix anything real, since a self-touching footprint isn't a problem
for an independent, local rectangle - it would just add pointless bookkeeping (and use only one of
each duplicate-intersection point pair, per the split's own documented tradeoff, which the wall has
no reason to inherit).

Each rectangle's four corners - `capᵢ`, `capᵢ₊₁`, `loopᵢ₊₁`, `loopᵢ` - aren't guaranteed to be
planar: loop points can sit at different real heights, and a flattened cap point's x/z can differ
slightly from its loop point's real x/z when the loop point carries a `diagramPoint` (see
`projectSecondariesPoint`). The rectangle is split into two triangles via the diagonal from `capᵢ`
to `loopᵢ₊₁`. Winding order doesn't matter for visibility, since `ViewerTriangle` already renders
both `FrontSide` and `BackSide`.
