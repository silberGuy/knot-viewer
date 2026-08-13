# Spec: Secondary cap

Status: implemented.
Decision record: [docs/adr/0004-secondary-cap-flat-plane-independent-triangulation.md](../adr/0004-secondary-cap-flat-plane-independent-triangulation.md).
Glossary: see `CONTEXT.md`'s "Secondary cap" entry.

## Summary

Render a flat, triangulated surface built from the Secondary loop's own points, flattened to the
x/z plane and lifted to one shared height above every knot's own surface. Rendered by a new
component, `SecondaryCap.vue`, gated the same way the loop itself is (`isSecondaryActive`) plus
its own toggle. This step only builds the flat cap from the loop's flattened footprint — it is
*not* connected down to the loop's real points, which is future work and out of scope here.

## Remove the old, broken attempt first

`getSecondaryTriangles` (`src/utils/secondaries.ts:510-559`) reused the knot pipeline's
multi-level surface machinery (`getSurfaceLevels` + `getKnotTriangles`) and draped the result
across each point's own real height. It's wired up but never actually rendered
(`KnotViewer.vue:19-24` always passes `showSurfaces={false}` for the loop's `KnotViewerKnot`), and
per ADR 0004 it's being replaced, not extended.

1. Delete `getSecondaryTriangles` entirely (`secondaries.ts:510-559`).
2. In `getSecondaryIntersectionsLoop` (`secondaries.ts:370-395`), remove both
   `surfaceTriangles: []` from the initial `result` object literal and the line
   `result.surfaceTriangles = getSecondaryTriangles(result);`.
3. In `src/components/types.ts`, narrow `Secondary` (currently line 85: `export type Secondary =
   Omit<SecondariesKnot, 'diagramKnot'> & { id: string };`) to also omit `surfaceTriangles`:

   ```ts
   export type Secondary = Omit<SecondariesKnot, 'diagramKnot' | 'surfaceTriangles'> & { id: string };
   ```

4. **Required follow-on fix**: `KnotViewerKnot.vue`'s `triangles3D` computed
   (`KnotViewerKnot.vue:61-71`) does `props.knot.surfaceTriangles.map(...)` where `props.knot: Knot3D
   | SecondariesKnot | Secondary`. Once `Secondary` no longer has `surfaceTriangles`, this won't
   type-check for that union member even though the early `if (!props.showSurfaces) return [];`
   guard means it's never actually reached at runtime for the loop's instance (which always passes
   `showSurfaces={false}`) — TS can't narrow `props.knot`'s type from `props.showSurfaces` being a
   separate prop. Fix by narrowing on the property's existence instead:

   ```ts
   const triangles3D = computed(() => {
       if (!props.showSurfaces || !("surfaceTriangles" in props.knot)) return [];
       return props.knot.surfaceTriangles.map(...) // unchanged
   });
   ```

## New geometry functions (`src/utils/secondaries.ts`)

Reuse `projectSecondariesPoint` (already exported) for the flatten step — it already does exactly
"flatten this loop point to its x/z position," including the diagram-point-vs-crossing-point
branch; no need for a second flatten function.

The flattened footprint's only source of self-touching (confirmed against the domain model, not
assumed): the loop containing both halves of a drawn knot `Intersection` (`drawing.ts`) — one per
knot, linked via `intersectionParallelId` — without that intersection also being one of the loop's
own crossing points. Both halves then flatten to the same coordinate. Since both are already real
points in the loop, splitting there needs no new geometry — just slicing the loop into the two arcs
between them, recursively for more than one such pair. See ADR 0004 for why this replaced an
earlier detect-and-warn plan.

```ts
// See ADR 0004: a drawn Intersection produces two DiagramPoints at the same 2D location, one per
// knot, linked via intersectionParallelId. The secondary walk only jumps knots at its own
// crossing points (surfaceIntersection); if the two knots at a drawn intersection don't pierce
// there, the walk can visit both copies as separate ordinary points, which flatten to the same
// (x, y). Finds the first such pair still in `points`, if any.
function findDuplicateIntersectionPair(points: SecondariesPoint[]): [number, number] | undefined {
    for (let i = 0; i < points.length; i++) {
        const parallelId = points[i].diagramPoint?.intersectionParallelId;
        if (!parallelId) continue;
        const j = points.findIndex((p, index) => index !== i && p.diagramPoint?.id === parallelId);
        if (j !== -1) return i < j ? [i, j] : [j, i];
    }
    return undefined;
}

// Splits the loop into simple sub-loops wherever it contains both halves of a drawn Intersection
// - the only known source of the flattened footprint self-touching. Since both halves share one
// flattened coordinate, no new points are inserted: the loop just splits into the two arcs
// between them, each still closed through that shared coordinate. Recurses for more than one pair.
function splitLoopAtDuplicateIntersections(points: SecondariesPoint[]): SecondariesPoint[][] {
    const pair = findDuplicateIntersectionPair(points);
    if (!pair) return [points];

    const [i, j] = pair;
    const arcA = points.slice(i, j + 1);
    const arcB = [...points.slice(j), ...points.slice(0, i + 1)];
    return [
        ...splitLoopAtDuplicateIntersections(arcA),
        ...splitLoopAtDuplicateIntersections(arcB),
    ];
}

type CapTriangle = [[number, number, number], [number, number, number], [number, number, number]];

// Splits the loop wherever its flattened footprint would otherwise self-touch, then triangulates
// each resulting simple sub-loop separately and lifts every point to the same shared height for
// the given surface level (8 * surfaceLevel, matching get3DPoint in diagram.ts). surfaceLevel
// should be one past the highest level any knot currently occupies (see getSurfaceLevelsCount
// below) so the cap always sits above every knot.
export function getSecondaryCapTriangles(loop: Secondary, surfaceLevel: number): CapTriangle[] {
    const height = 8 * surfaceLevel;
    return splitLoopAtDuplicateIntersections(loop.points).flatMap((subLoopPoints) => {
        const flattened = subLoopPoints.map(projectSecondariesPoint);
        if (flattened.length < 3) return [];

        const cut = Earcut.triangulate(flattened.flatMap((p) => [p.x, p.y]), [], 2);
        const triangles: CapTriangle[] = [];
        for (let i = 0; i < cut.length; i += 3) {
            const [a, b, c] = cut.slice(i, i + 3);
            triangles.push([
                [flattened[a].x, height, flattened[a].y],
                [flattened[b].x, height, flattened[b].y],
                [flattened[c].x, height, flattened[c].y],
            ]);
        }
        return triangles;
    });
}
```

Needs `import { Earcut } from "three/src/extras/Earcut.js";` added to `secondaries.ts` (already
imported this way in `surfaces.ts`). No new type import needed - both new functions work directly
on `SecondariesPoint`.

## Surface-level count (`src/utils/diagram.ts`)

`get3DKnots` (`diagram.ts:208-220`) already computes `minimizeSurfaceLevels(diagram.surfaceLevels)`
internally but discards the count. Export a small function next to it so `KnotViewer.vue` can ask
for "one past the highest occupied level" without duplicating that call:

```ts
export function getSurfaceLevelsCount(diagram: Diagram): number {
    return minimizeSurfaceLevels(diagram.surfaceLevels).length;
}
```

(`minimizeSurfaceLevels` itself, `diagram.ts:184-195`, stays private - only the count is needed
outside this file.)

## New component: `src/components/SecondaryCap.vue`

Computes its own triangles internally from props (per the chosen design - the component owns the
calculation, not a triangle-list prop), following `KnotViewerKnot.vue`'s existing pattern of
looping `ViewerTriangle` over a computed triangle list:

```vue
<template>
	<ViewerTriangle
		v-for="triangle in triangles"
		:points="triangle"
		:key="triangle.flat().join('_')"
		:color="color"
	/>
</template>

<script setup lang="ts">
import { computed } from "vue";
import ViewerTriangle from "./ViewerTriangle.vue";
import type { Secondary } from "./types";
import { getSecondaryCapTriangles } from "../utils/secondaries";

const props = defineProps<{
	loop: Secondary;
	surfaceLevel: number;
	color?: string;
}>();

const triangles = computed(() => getSecondaryCapTriangles(props.loop, props.surfaceLevel));
</script>
```

Resolved: the cap reuses the loop's own magenta (`#ff00ff`), opaque, matching `KnotViewerKnot`'s
existing color for the loop. A semi-transparent material (so the cap doesn't visually block the
knots underneath) was considered but not built - `ViewerTriangle.vue` currently always renders
fully opaque (`MeshBasicMaterial` with no `transparent`/`opacity` set); revisit if opaque turns out
to obscure too much in practice.

## Wiring: `src/data/controls.ts`

Add a toggle alongside the existing two, same `useToggle` pattern, defaulting to `true` (per the
design discussion - unlike `showSurfacesIntersections`, which defaults `false` as a secondary debug
view, the cap is the main payoff of the Secondary tab):

```ts
const [showSecondaryCap, toggleShowSecondaryCap] = useToggle(true);
```

Return `showSecondaryCap`/`toggleShowSecondaryCap` alongside the others.

## Wiring: `src/components/ViewerControls.vue`

Add a checkbox, but - unlike the other two, which are always shown - only while the Secondary tab
is active:

```vue
<label v-if="controlsStore.isSecondaryActive">
	<input type="checkbox" id="toggle-secondary-cap" v-model="controlsStore.showSecondaryCap" />
	Show Secondary Cap
</label>
```

## Wiring: `src/components/KnotViewer.vue`

1. Import `getSurfaceLevelsCount` from `../utils/diagram` and `SecondaryCap` from
   `./SecondaryCap.vue`.
2. Add a computed next to `secondaryLoop` (`KnotViewer.vue:145-150`):

   ```ts
   const secondaryCapLevel = computed(() => getSurfaceLevelsCount(diagram.value));
   ```

3. In the template, next to the existing loop `KnotViewerKnot` (`KnotViewer.vue:19-24`), add:

   ```vue
   <SecondaryCap
   	v-if="controlsStore.isSecondaryActive && controlsStore.showSecondaryCap"
   	:loop="secondaryLoop"
   	:surfaceLevel="secondaryCapLevel"
   	:key="secondaryLoop.id"
   />
   ```

No `extend({...})` registration needed (unlike `ViewerLine`) - `SecondaryCap` is a plain wrapper
component like `KnotViewerKnot`, not a custom Tres primitive.

## Docs already updated

- `CONTEXT.md`: new "Secondary cap" glossary entry.
- `docs/adr/0004-secondary-cap-flat-plane-independent-triangulation.md`: the flat-plane /
  independent-triangulation decisions, and the duplicate-intersection split (superseding the
  original detect-and-warn plan once the actual self-touch cause was identified).

## Validation plan

No test suite exists in this repo (per `AGENTS.md`); validate manually via `yarn dev`:

1. Draw two or more overlapping knots with at least one real crossing, switch to the Secondary
   tab, and confirm a flat, filled surface appears above the knots (not draped/warped to follow the
   loop's own height changes).
2. Toggle "Show Secondary Cap" off/on and confirm only the cap disappears/reappears - the loop's
   own outline (drawn by the existing `KnotViewerKnot` instance) must stay visible throughout.
3. Switch back to the Drawing tab and confirm both the loop and its cap disappear, and that the
   "Show Secondary Cap" checkbox itself disappears from `ViewerControls`.
4. Construct a drawing with a drawn `Intersection` between two knots that don't actually pierce
   surfaces there (so the loop ends up containing both halves as ordinary points) and confirm the
   cap still renders as multiple correctly-shaped simple surfaces instead of one self-touching one
   - this is the case `findDuplicateIntersectionPair`/`splitLoopAtDuplicateIntersections` exist for.
5. Add/remove a crossing (changing the number of surface levels) and confirm the cap's height
   moves to stay above the new highest knot surface level, via `secondaryCapLevel`.
6. `yarn build` (runs `vue-tsc -b`) to confirm the `Secondary` type change doesn't leave any other
   stale `surfaceTriangles` references beyond the one fixed in `KnotViewerKnot.vue`.
