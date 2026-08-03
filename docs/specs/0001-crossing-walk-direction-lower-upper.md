# Spec: `CrossingWalkDirection` as a fixed lower/upper role

Status: proposed, not yet implemented.
Decision record: [docs/adr/0003-crossing-walk-direction-by-fixed-lower-upper-role.md](../adr/0003-crossing-walk-direction-by-fixed-lower-upper-role.md).

## Summary

Replace the self/twin encoding of `CrossingWalkDirection` with a lower/upper encoding, where
"lower" and "upper" name a fixed role per crossing (derived from the crossing's own data) instead
of being relative to whichever point the walk currently stands on. Keeps the same flat 4-value
string union shape as today (`Map<crossingId, CrossingWalkDirection>` unchanged) to minimize
downstream churn - a `{ role, step }` object shape was considered and rejected purely to avoid
touching every call site that treats `CrossingWalkDirection` as a plain string.

No data migration is needed: `crossingWalkDirections` lives only in the Pinia store
(`src/data/subsurface-walk.ts`) and is reset to defaults every time the Subsurface tab mounts
(`SubsurfaceBoard.vue:76-78`), per CONTEXT.md - there's no persisted state across sessions that
could hold a stale self/twin value.

## Type changes (`src/components/types.ts`)

```ts
export type CrossingWalkDirection = "lowerForward" | "lowerBackward" | "upperForward" | "upperBackward";
```

Rewrite the doc comment above it (currently lines 89-93) to describe the new fixed-role
semantics: each crossing's two points have a fixed lower/upper role (assigned once from the
crossing's own data, see `getCrossingRole` below); a direction names which role's knot the walk
should be on, and whether to continue forward or backward once there - independent of which point
the walk arrived from.

## New helper: `getCrossingRole`

Add to `sub-surfaces.ts`, near `getCrossingId`:

```ts
function findRealIntersection(surfaceIntersection: SubSurfacesPoint["surfaceIntersection"]) {
    const fromP1 = surfaceIntersection?.lineP1.diagramPoint.intersection;
    if (fromP1 && !fromP1.isWithinKnot) return fromP1;
    const fromP2 = surfaceIntersection?.lineP2.diagramPoint.intersection;
    if (fromP2 && !fromP2.isWithinKnot) return fromP2;
    return undefined;
}

// A crossing point's fixed side, independent of which of the crossing's two points the walk
// is currently standing on (contrast with the old self/twin framing). At a crossing that sits
// at a real 2D intersection, reuses the over/under already decided when the user drew/flipped
// that intersection (topLineKnotId/bottomLineKnotId). At a crossing that's only a byproduct of
// a bridging triangle (isAtRealIntersection false - no user-facing arrow), falls back to a
// fixed, order-independent tie-break so the walk can still resolve it consistently.
function getCrossingRole(point: SubSurfacesPoint): "lower" | "upper" | undefined {
    const si = point.surfaceIntersection;
    const twinPointId = si?.twinPointId;
    if (!si || !twinPointId) return undefined;

    const realIntersection = findRealIntersection(si);
    if (realIntersection) {
        if (si.triangle.knotId === realIntersection.bottomLineKnotId) return "lower";
        if (si.triangle.knotId === realIntersection.topLineKnotId) return "upper";
    }

    return point.id < twinPointId ? "lower" : "upper";
}
```

This factors out the intersection-lookup half of the existing `isAtRealIntersection`
(`sub-surfaces.ts:474-479`) - consider having `isAtRealIntersection` call `findRealIntersection`
too instead of duplicating the "touches a real, non-within-knot intersection" check.

**Open question / risk to verify before relying on this**: the real-intersection branch assumes
`point.triangle.knotId` always equals exactly one of `{topLineKnotId, bottomLineKnotId}`, and that
the twin's `triangle.knotId` always equals the other one - i.e. that both twins of a
real-intersection crossing agree on being "at a real intersection" and on which knot is which
side. This should follow from how `getTrianglesIntersections` builds twin pairs from two
different knots' triangles, but hasn't been traced end-to-end against actual runtime data.
Verify with a `console.assert` or a manual check against a multi-knot drawing with a real
crossing before removing the fallback path's reach into this branch.

## `advance` (`sub-surfaces.ts:287-323`)

```ts
function directionToStep(direction: CrossingWalkDirection): 1 | -1 {
    return direction === "lowerBackward" || direction === "upperBackward" ? -1 : 1;
}

function directionToRole(direction: CrossingWalkDirection): "lower" | "upper" {
    return direction === "lowerForward" || direction === "lowerBackward" ? "lower" : "upper";
}
```

Replace the `isTwinDirection(direction)` branch condition with a role comparison:

```ts
const direction = crossingWalkDirections.get(crossingId) ?? DEFAULT_CROSSING_WALK_DIRECTION;
const step = directionToStep(direction);
const targetRole = directionToRole(direction);
const currentRole = getCrossingRole(point)!; // defined: crossingId is only set when surfaceIntersection.twinPointId exists

if (targetRole === currentRole) {
    return {
        knot: state.knot,
        pointIndex: stepIndex(state.pointIndex, step, state.knot.points.length),
        step,
        justArrivedViaJump: false,
    };
}

// unchanged: find twin point, jump, justArrivedViaJump: true
```

Add a shared default constant (currently the literal `"twinForward"` is duplicated three times -
`sub-surfaces.ts:303`, `:379`, `:532`):

```ts
const DEFAULT_CROSSING_WALK_DIRECTION: CrossingWalkDirection = "upperForward";
```

`"upperForward"` is a deliberate but arbitrary choice (there's no exact old-behavior equivalent,
since "twin" meant different knots depending on arrival side) - it reads naturally as "cross onto
the over strand, then continue forward," a reasonable default the user can still override via the
existing arrow-click cycling.

## `getDefaultCrossingWalkDirections` (`sub-surfaces.ts:228-240`)

Seed every crossing with `DEFAULT_CROSSING_WALK_DIRECTION` instead of the `"twinForward"` literal.
No other change - the seeding loop doesn't need to know about roles.

## `getWalkStart` (`sub-surfaces.ts:361-395`)

This is the function the ADR is actually fixing. Replace "first knot whose points contain a match"
with "the knot whose point at this crossing has the lower role":

```ts
for (const knot of knotsWithSubSurfacePoints) {
    const anchorIndex = knot.points.findIndex(
        p => getCrossingId(p) === anchorId && getCrossingRole(p) === "lower",
    );
    if (anchorIndex === -1) continue;
    // ...rest unchanged: resolve direction, step, awayFromAnchor, walk backward to the
    // nearest isOrdinaryPoint on this same knot...
}
```

This is the crux of the fix: which knot anchors the walk no longer depends on `knots` array
order - it's always the crossing's lower-role point, deterministically, for any input order.

## `getCrossingWalkArrows` (`sub-surfaces.ts:488-538`)

- `ALL_DIRECTIONS` becomes `["lowerForward", "lowerBackward", "upperForward", "upperBackward"]`.
- `currentDirection` default: `crossingWalkDirections.get(crossingId) ?? DEFAULT_CROSSING_WALK_DIRECTION`.
- The arrival-exclusion logic (`sub-surfaces.ts:512-519`) currently always excludes a `"self*"`
  variant, because it's checking whether the walk arrived via a step on the point's *own* knot
  (which is always true for how a walk reaches any point). Swap the excluded literal to use the
  point's actual fixed role instead of always "self":

```ts
const currentRole = getCrossingRole(point)!;
let excludedDirection: CrossingWalkDirection | undefined;
if (previousPoint?.id === backwardNeighborId) {
    excludedDirection = currentRole === "lower" ? "lowerBackward" : "upperBackward";
} else if (previousPoint?.id === forwardNeighborId) {
    excludedDirection = currentRole === "lower" ? "lowerForward" : "upperForward";
}
```

## `getDirectionTarget` (`sub-surfaces.ts:444-459`)

Replace `isTwinDirection(direction)` with a role comparison against the point's own fixed role
(same substitution as in `advance`):

```ts
function getDirectionTarget(
    point: SubSurfacesPoint,
    knot: SubSurfacesKnot,
    knotsWithSubSurfacePoints: SubSurfacesKnot[],
    direction: CrossingWalkDirection,
): SubSurfacesPoint | undefined {
    const pointIndex = knot.points.findIndex(p => p.id === point.id);
    if (directionToRole(direction) !== getCrossingRole(point)) {
        // unchanged: look up twin point/knot via surfaceIntersection.twinPointId
    }
    return knot.points[stepIndex(pointIndex, directionToStep(direction), knot.points.length)];
}
```

## UI (`SubsurfaceBoard.vue`)

No structural change expected: `cycleDirection` only walks `arrow.options` as an opaque array
(`SubsurfaceBoard.vue:156-164`) and doesn't inspect direction values itself - it inherits the new
4-value union automatically. Manually re-check after the change that clicking an arrow at both a
lower-role and an upper-role crossing point still cycles through exactly the 3 non-reversing
options with a sensible arrow angle.

## Docs to update alongside the code change

- `CONTEXT.md`'s "Crossing walk direction" entry (currently describes "continue along the knot
  it's currently on... or cross to the twin point on the other knot's surface") - reword to
  describe the fixed lower/upper role instead of arrival-relative self/twin.
- `AGENTS.md` doesn't currently document `sub-surfaces.ts` internals at all (deliberately, per its
  own note) - no change needed there.

## Validation plan

No test suite exists in this repo (per `AGENTS.md`); validate manually via `yarn dev`:

1. Draw two overlapping knots with at least one real 2D crossing between them and switch to the
   Subsurface tab.
2. Confirm the loop drawn is unchanged in shape from before the change (same points, same order)
   for the default direction on every crossing - the new default resolves to a specific,
   fixed choice, so the rendered loop for an all-default `crossingWalkDirections` map may differ
   in *shape* from today's (different arbitrary starting anchor/knot), which is expected; what
   matters is that it's a single, valid, closed loop, not the previous behavior's degenerate short
   loops caused by array-order-dependent anchoring.
3. Click through every crossing arrow's 3 offered options and confirm the loop redraws to a valid
   closed loop each time (no premature termination, no immediate self-revisit).
4. Reorder the knots passed into the board (e.g. swap draw order of the two knots) with an
   identical `crossingWalkDirections` map and confirm the walk's start point/knot no longer
   changes as a side effect - this is the specific bug this change fixes, so it's the one case
   worth deliberately reproducing pre-change and re-checking post-change.
5. `yarn build` (runs `vue-tsc -b`) to confirm no leftover `"selfForward"` / `"twinForward"` /
   `isTwinDirection` references remain.
