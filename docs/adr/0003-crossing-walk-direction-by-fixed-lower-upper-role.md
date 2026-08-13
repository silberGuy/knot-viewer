# Crossing walk direction keyed to a fixed lower/upper role, not the walk's arrival side

`CrossingWalkDirection` ("selfForward" / "selfBackward" / "twinForward" / "twinBackward") is
currently defined relative to whichever of a crossing's two points the walk happens to be
standing on when it resolves that crossing (see CONTEXT.md's "Crossing walk direction" entry).
That's workable mid-walk, where there's always a "current" point for "self" to mean something
relative to. It breaks down for `getWalkStart` (`secondaries.ts`), whose entire job is to decide
which knot to start on *before* any walk state exists - there's no "current" point yet to resolve
"self" against. A crossing's id (`getCrossingId`) is deliberately order-independent - the same id
names the crossing however it's first reached - but a stored `"selfForward"` has no such fixed
meaning: it means "continue on knot A" if the walk happens to be standing on A's copy of the
crossing point, and "continue on knot B" if it's standing on B's. `getWalkStart` currently papers
over this by iterating `knotsWithSecondaryPoints` in whatever order the input `knots` array
happens to be in, and treating the first knot it finds a matching point on as "self"
(`secondaries.ts:373-391`). Which knot actually anchors the walk is therefore an accident of
array order, not something the stored direction - or the user who set it via the crossing-walk
arrow - actually determines. The same ambiguity means a persisted per-crossing override can't
really be reasoned about as "this crossing's direction," only as "this crossing's direction, from
whichever side happens to be resolved first," which the data model doesn't track and the UI
doesn't expose.

We considered keeping self/twin and just special-casing `getWalkStart` to prefer a canonical side
(e.g. always the first knot in the original `knots` prop). Rejected: it would silence
`getWalkStart`'s specific symptom without fixing the underlying issue - a single stored direction
value would still describe different actual behavior depending on which side of the crossing the
walk happens to enter from once it's running, so two logically-identical walks could still resolve
the same override differently depending on incidental knot ordering elsewhere in the pipeline.

Instead, `CrossingWalkDirection` moves from self/twin to a role - `"lowerForward"` /
`"lowerBackward"` / `"upperForward"` / `"upperBackward"` - that's fixed per crossing, independent
of walk position, the same way `getCrossingId` is already order-independent. Every crossing's two
points get a role assigned once, from the crossing's own data, not from which point the walk
happens to be standing on: at a crossing that sits at a real 2D intersection, "lower" is the point
whose triangle belongs to that intersection's `bottomLineKnotId` knot and "upper" the
`topLineKnotId` knot - reusing the over/under distinction the app already establishes when the
user draws or flips a crossing (`Intersection.topLineKnotId`/`bottomLineKnotId`,
`isFlipped`/`isTop` in `drawing.ts`). At a crossing that's only a byproduct of a bridging triangle
(not at a real intersection - see `isAtRealIntersection`), there's no over/under to reuse, so the
two points fall back to a fixed, order-independent tie-break (comparing point id to twin id
lexicographically - the same trick `getCrossingId` already relies on). Those crossings have no
user-facing arrow anyway (`getCrossingWalkArrows` skips them), so the fallback only needs to be
consistent, not meaningful.

Resolving a crossing then becomes: compare the *named* role in the stored direction against the
current point's own fixed role. Same role means stay on the knot the walk is already on (the old
"self" case); different role means jump to the twin point on the other knot (the old "twin" case).
This is exactly `advance`'s existing branch structure (`secondaries.ts:287-323`) with the
condition swapped from `isTwinDirection(direction)` to a role comparison - the jump mechanics
(finding the twin point, `justArrivedViaJump`) don't change.

The direct payoff is `getWalkStart`: instead of anchoring on "whichever knot's array position
happens to contain a matching point first," it anchors explicitly on the anchor crossing's
lower-role point - an arbitrary but now *fixed* choice, not an accident of iteration order. The
same fix removes the equivalent ambiguity from `getDefaultCrossingWalkDirections`'s seeding and
`getCrossingWalkArrows`'s arrival-exclusion logic, both of which currently reason in terms of
self/twin relative to the walk's live position. See `docs/specs/0001-crossing-walk-direction-lower-upper.md`
for the concrete plan.
