# Knotter

Lets a user draw one or more knots as a 2D diagram with over/under crossings, then renders
the corresponding 3D triangulated surface(s). See [AGENTS.md](./AGENTS.md) for the pipeline
that turns a drawing into 3D geometry (`Knot` → `Diagram` → `Knot3D` → `SubsurfaceLoop`).

## Language

**Board**:
A 2D component the user views or interacts with to work on the drawing. Each board shows the
same underlying knots, but different boards allow different operations on them — some let the
user edit points and crossings, others show them read-only as a base for a different kind of
control.
_Avoid_: canvas, drawing area (when referring to the component, not the literal drawing surface)

**Viewer**:
The 3D rendered result of the drawing. There is exactly one viewer (`KnotViewer`); "viewer" is
reserved for the 3D output, never for a 2D board.
_Avoid_: canvas, renderer

**Editing mode / tab**:
One of the app's board tabs, each presenting a different board for a different purpose. The
first two: the **Drawing** tab (fully editable — add/move/remove points, flip crossings) and
the **Subsurface** tab (read-only for the knots/crossings themselves; shows the same knots and
crossings as a static base, with the current **Subsurface loop** drawn on top). Tab activation
is the single source of truth for whether the Subsurface loop is shown — there's no separate
visibility toggle; switching to the Subsurface tab shows the loop in both the Viewer and the
Subsurface board, switching away hides it in both.
_Avoid_: view, panel (these are UI mechanics, not the domain concept — the concept is *which
board is showing and what it's for*)

**Subsurface walk**:
The graph-walk that produces a `SubsurfaceLoop` (see [AGENTS.md](./AGENTS.md)) — starting at a
point and, at each **crossing point**, resolving that crossing's **crossing walk direction** to
decide whether to continue straight or jump to the crossing's twin point. Because the resulting
loop is closed, the walk's own starting point isn't meaningful on its own by default — any
crossing point can seed it (picked deterministically), since every crossing point already
resolves to a direction one way or another. The user can override this by clicking any of a
knot's own points on the **Subsurface board** (heading forward from there, per **Going forward
on a knot**) — since the walk is a deterministic graph-walk, this matters most when a drawing's
crossings resolve into more than one disjoint loop, letting the user reach one the default
anchor wouldn't otherwise show. Persists across tab switches and through Save/Load, same as
**crossing walk direction** overrides — only cleared if a drawing edit removes the point it
refers to, falling back to the default anchor.

**Going forward on a knot**:
Stepping from one point to the next in a knot's own points array, wrapping at the end for a
closed knot — the same order the points were originally listed/drawn in. *Backward* is the same
step in reverse (to the previous point). This is the primitive both a **crossing walk direction**
and an **arrival direction** build their own forward/backward on, and it's also why a knot's own
line (`Line.p1`/`p2`, see `drawing.ts`) always has `p1` before `p2` in this same order — lines are
built directly from consecutive knot points.

**Crossing walk direction**:
The choice of which way the **Subsurface walk** continues from a **crossing point**. Every
crossing has two points, one on each of the two knots involved, and each is assigned a fixed
"lower" or "upper" role from the crossing's own data (reusing the drawing's existing over/under
choice where the crossing sits at a real 2D intersection) — unlike the walk's own position, this
role never changes depending on which side the walk happens to arrive from. A direction names
which role's knot the walk should continue on: stay if it's already there, or cross to the other
point if it isn't, then forward or backward from there — four possible directions, of which three
are ever offered at once when the crossing has an **arrival direction** to retrace, since the
fourth would exactly retrace it. Shown as a clickable arrow on the **Subsurface board**, next to
every crossing point that sits at a real 2D intersection between the two knots involved — not
only ones the currently displayed loop happens to pass through; a crossing outside the current
loop has no arrival to retrace, so its arrow offers all four directions and is drawn grey to mark
it as outside the loop, rather than the usual color. (A knot's surface also grows small bridging
triangles around every 2D intersection to cover the height change between over/under levels, and
one of those triangles' own far edges can independently produce a second, nearby crossing point
that isn't at the 2D intersection at all; that one is still walked (using its default direction)
but never gets its own arrow.) Clicking an arrow cycles to the next alternative. Every crossing
point has a crossing walk direction at all times, defaulting to "cross to the upper knot, then
forward" until the user overrides it by clicking. Overrides persist across tab switches and
through Save/Load; only a drawing edit that removes a given crossing clears its override, since
the knots — and therefore the crossings — can't change while the Subsurface tab is showing.

**Arrival direction**:
The role and forward/backward step describing which line the **Subsurface walk** was actually
travelling along, and which way, in the step immediately before it reached a given crossing point
— backward-looking, in contrast to a **crossing walk direction**, which is forward-looking (it
names where the walk goes *next*, and can name either knot regardless of which one the walk
actually arrived on). Same shape as a crossing walk direction, but a different value in general —
used only to identify the one of the crossing's four possible crossing walk directions that would
exactly retrace the arrival, so the arrow never offers it. Doesn't exist for a crossing the
current loop never reaches — there's nothing to have arrived from, so nothing is excluded.

**Subsurface loop**:
The `SubsurfaceLoop` a subsurface walk produces — an ordered sequence of points that alternates
between points inherited from a knot's diagram and **crossing points**. Shown in the Viewer
(3D) and, as an overlay on top of the knots' own lines, in the Subsurface board (2D) — the same
loop, projected. Carries its own `isClosed`: true only when the walk's last step lands back on
its own start point: false either if the walk runs out of data (an open, undrawn-shut knot) or
if it closes into a smaller loop that doesn't reach back to the start. The Subsurface board
surfaces `isClosed === false` to the user directly, since an unclosed loop can't produce a valid
Subsurface surface.
_Avoid_: subsurface, loop (on their own, ambiguous with the walk or with a knot's own polyline)

**Crossing point**:
A point in a subsurface loop with no origin in any knot's 2D diagram — its coordinates are
interpolated in 3D, along an existing knot edge, at the point where that edge pierces another
knot's surface triangle. Distinguished from an ordinary loop point, which is inherited from a
knot's diagram and keeps that diagram point's identity. For the Subsurface board's 2D overlay,
a crossing point's 3D coordinates are projected to a 2D position the same way any 3D point is
(see [AGENTS.md](./AGENTS.md)) — but the point's origin is 3D, not 2D.

**Zigzag**:
A short run of **Subsurface loop** points produced wherever a knot's own bridging triangle (built by
`getIntersectionsNotInKnotTriangles` in `surfaces.ts` around a real 2D `Intersection`, to cover the
height change between over/under levels) crosses the other knot's surface twice near that same
intersection instead of once: one **crossing point** lands almost exactly on the intersection itself
and doesn't change the walk's knot (its resolved direction already matches the knot it's on, so the
walk just passes through), the other is the bridging triangle's far edge meeting the other knot's
surface and *is* where the walk actually jumps knots. Both, plus the ordinary diagram point at the
intersection itself, sit on that knot's own straight line (see "Going forward on a knot"), and the
jump point's twin lands almost exactly on top of it once the walk crosses over. This is correct,
expected loop geometry, not a walk defect - only the **Subsurface cap**, **Subsurface wall**, and
**Cap shift**, which build flat/derived geometry from these near-duplicate, near-collinear points,
need to account for it.
_Avoid_: treating a zigzag as something the walk itself should eliminate or dedupe.

**Subsurface surface**:
The surface built from a Subsurface loop's own points, shown only in the Viewer (there is no 2D
equivalent on the Subsurface board). Rendered by `SubSurfaceSurface.vue`, separate from the loop's
own line/point rendering, and hidden/shown by its own toggle (only offered while the Subsurface
tab is active, alongside the loop it's built from). Made of two pieces, both driven by the same
`color`/`visible` props: the **Subsurface cap** and the **Subsurface wall**.
_Avoid_: subsurface surface used loosely for the cap alone — the cap is one piece of this, not a
synonym for it

**Subsurface cap**:
A flat, triangulated piece of the **Subsurface surface**, built by flattening every one of a
Subsurface loop's own points to its x/z position (the same projection a crossing point already
uses). Wherever the loop contains both halves of a drawn knot **Intersection** (see `AGENTS.md`)
without that being one of the loop's own **crossing points**, the two halves flatten to the same
coordinate and the loop splits there into the two arcs between them — expected, ordinary behavior,
not an error — so each resulting simple sub-loop can be triangulated on its own with a single
Earcut fan (see ADR 0004). Every point of every triangulation is then lifted to one shared height —
one **surface level** (see [AGENTS.md](./AGENTS.md)) above the highest level any knot currently
occupies. Unlike the loop itself, the cap does not keep each point's own real height, and it is not
connected down to the loop's real points — both are deliberate (see ADR 0004; the connection is the
**Subsurface wall**). Rendered by its own component (`SubSurfaceCap.vue`), used by
`SubSurfaceSurface.vue`.
_Avoid_: cap surface (ambiguous with the loop or a knot's own surface)

**Subsurface wall**:
The piece of the **Subsurface surface** connecting the **Subsurface cap** down to the loop's own
points at their real height. For every pair of adjacent Subsurface loop points (wrapping the last
point back to the first, since the walk is a closed ring), a rectangle spans from their flattened,
cap-height positions down to their real coords, split into two triangles. Walks the loop's raw
point order directly, unlike the cap, which first splits the loop wherever its flattened footprint
self-touches — that split exists only so Earcut gets a simple polygon to triangulate an *area*, and
a wall rectangle, being local to one pair of points, has no such requirement (see ADR 0005).
Rendered by its own component (`SubSurfaceWall.vue`), used by `SubSurfaceSurface.vue`.
_Avoid_: wall surface (ambiguous with the cap or a knot's own surface)

**Subsurface intersection**:
A point where the **Subsurface wall**'s triangles cross a knot's own 3D surface. The cap is
excluded (see ADR 0008) — it always sits above every knot's height, so it can never intersect one.
Shown only in the Viewer, toggled independently of the knot-vs-knot surface intersections.
_Avoid_: surface intersection (that's knot-vs-knot; this is wall-vs-knot)

**Cap shift**:
A live offset (`capShiftDistance`) on the **Subsurface cap**'s boundary, coupled to the
**Subsurface wall**'s top edge — the wall's bottom edge and the knots' own points are untouched.
For each loop point, its two adjacent lines are each shifted `capShiftDistance` along their own
right-hand normal (negative shifts the other way) and re-intersected as infinite lines to give
the point its new position; parallel adjacent lines fall back to a plain translation. For
rendering, the cap then splits wherever its own shifted boundary self-intersects, inserting a
fresh point there (ADR 0007) - the wall never sees these inserted points.
_Avoid_: cap offset, cap inset/outset (implies a uniformly inward/outward move, which a concave
cap under shift doesn't guarantee)
