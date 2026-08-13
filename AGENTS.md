# Agent notes for `knotter`

This project lets a user draw a knot (or several) as a 2D diagram with
over/under crossings, then renders the corresponding 3D triangulated
surface(s) using TresJS/Three.js. It's a Vue 3 + TypeScript + Vite app.

Read this before making changes — the pipeline is a chain of pure
transforms across three coordinate spaces, and it's easy to break an
earlier stage while only looking at a later one.

## Pipeline / terminology

Data flows one-way through three stages, each with its own file and its
own point/knot/triangle types in [src/components/types.ts](src/components/types.ts):

1. **Drawing** (`Knot`, `Point`, `Line`, `DrawingData`) — raw 2D points the
   user places by clicking on [DrawingBoard.vue](src/components/DrawingBoard.vue). A `Knot` is an
   ordered polyline, optionally closed. Logic in [src/utils/drawing.ts](src/utils/drawing.ts):
   `getKnotLines` turns points into segments, `computeIntersections` does
   pairwise segment-intersection math to find every crossing between all
   lines (including different knots), and `combineKnotPointsWithIntersections`
   splices extra points into a knot's point list around each crossing it
   participates in (a "pre", the crossing point itself tagged `isTop` or
   not, and a "post" point). The user can click a crossing to flip which
   line is "top" (`interFlipIds` in `DrawingData`); this is the only
   place over/under is decided.
2. **Diagram** (`DiagramPoint`, `DiagramKnot`, `DiagramTriangle`, `Diagram`)
   — still 2D coordinates, but now each knot's point list includes the
   intersection-derived points from step 1, and each point may carry an
   `intersection` reference. Built by `getDiagram` in [src/utils/diagram.ts](src/utils/diagram.ts).
   `getDiagram` also computes **surface levels** here (see below) and
   the surface triangulation (`DiagramTriangle`) — both still 2D — before
   anything is lifted into 3D.
3. **3D knots** (`Point3D`, `Triangle3D`, `Knot3D`) — `get3DKnots` in
   diagram.ts takes the already-triangulated `Diagram` and assigns each
   point a 3rd coordinate. The x/z plane coords are untouched from the
   Diagram stage; only the y coordinate is synthesized from the point's
   **surface level** index (`8 * surfaceIndex`, see [src/utils/surfaces.ts](src/utils/surfaces.ts)).
   In other words: **the triangulation is computed in 2D and reused
   as-is in 3D** — 3D-ness is just a height (y value) bolted onto 2D
   triangles, not a separate triangulation pass.

There is also a `src/utils/secondaries.ts` module that builds on top of
`Knot3D`s (intersections between different knots' 3D surfaces). It's
under active development and still being figured out, so it's
deliberately left out of this doc for now — read the file directly if
you need to touch it, don't assume anything about it from here.

**"Surface level"**: a `SurfaceLevel` (`DiagramPoint[]`) is one loop
produced by `getSurfaceLevels` in surfaces.ts. It's a graph-walk over a
knot's point list that, at each crossing, decides whether to continue
straight or hop to the crossing's "parallel" point (the same crossing's
other point on the other line) — the walk direction is what encodes
over/under into disconnected loops. Each loop later becomes one height
layer in 3D and one Earcut-triangulated fan. This concept sits *inside*
the Diagram stage, not the 3D stage — despite the two-tier meaning
"surface" ends up with in the UI (2D surface levels vs. 3D-looking
rendered mesh). The vertical gap between levels is user-adjustable (viewer's
"Surface Level Height" control, `controlsStore.surfaceLevelHeight`, defaulting to
`DEFAULT_SURFACE_LEVEL_HEIGHT` in diagram.ts) and threaded as an explicit parameter through the
3D-lifting functions rather than read from the store directly, keeping them pure.

## Code conventions actually used here

- Vue 3 `<script setup>` with the Composition API everywhere;
  `defineModel` for two-way bound props (see [DrawingBoard.vue](src/components/DrawingBoard.vue),
  [DrawingKnot.vue](src/components/DrawingKnot.vue)) instead of manual `props`/`emit('update:x')` pairs.
- All shared types live in [src/components/types.ts](src/components/types.ts), imported with
  `import type { ... }`. Add new cross-stage types there, not inline.
- Pipeline functions are plain, side-effect-free functions in `src/utils/`
  (not composables, not store actions) that take one stage's data and
  return the next stage's data — `drawing.ts` → `diagram.ts` (which also
  calls into `surfaces.ts`). Keep new geometry logic in this style
  rather than putting it in components.
- Global UI toggles go through the Pinia store in [src/data/controls.ts](src/data/controls.ts)
  (`useControlsStore`), not local component state, since both the topbar
  and the viewer need to read them.
- IDs are strings built by string interpolation/joins (e.g.
  `inter-${line1.id}-${line2.id}`, `tri-${p1.id}-${p2.id}-${p3.id}`) and
  are treated as stable identity for equality checks throughout the
  pipeline (`findIndex(p => p.id === ...)` everywhere) — coordinates are
  not used for identity. When generating new points/triangles, follow
  the existing ID-construction convention so downstream `id`-based
  lookups keep working.
- No test suite exists in this repo currently; validate changes by
  running `yarn dev` and visually checking the drawing board + 3D
  viewer (toggle "Show Surfaces" in the topbar to exercise the
  triangulation stage).
- `yarn build` runs `vue-tsc -b` first — treat type errors from this as
  build-breaking, not advisory.
- `yarn find-deadcode` runs `knip` to catch unused exports/files.
