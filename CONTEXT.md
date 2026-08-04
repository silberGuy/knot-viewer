# Knotter

Lets a user draw one or more knots as a 2D diagram with over/under crossings, then renders
the corresponding 3D triangulated surface(s). See [AGENTS.md](./AGENTS.md) for the pipeline
that turns a drawing into 3D geometry (`Knot` → `Diagram` → `Knot3D` → `SubSurface`).

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
The graph-walk that produces a `SubSurface` (see [AGENTS.md](./AGENTS.md)) — starting at a
point and, at each **crossing point**, resolving that crossing's **crossing walk direction** to
decide whether to continue straight or jump to the crossing's twin point. Because the resulting
loop is closed, the walk's own starting point isn't meaningful on its own by default — any
crossing point can seed it (picked deterministically), since every crossing point already
resolves to a direction one way or another. The user can override this by clicking any of a
knot's own points on the **Subsurface board** (heading forward from there, per **Going forward
on a knot**) — since the walk is a deterministic graph-walk, this matters most when a drawing's
crossings resolve into more than one disjoint loop, letting the user reach one the default
anchor wouldn't otherwise show. Resets to the default anchor each time the Subsurface tab is
activated, same as **crossing walk direction** overrides.

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
forward" until the user overrides it by clicking. All crossing walk directions reset to their
defaults each time the Subsurface tab is activated, since the knots — and therefore the
crossings — can't change while that tab is showing.

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
The `SubSurface` a subsurface walk produces — an ordered sequence of points that alternates
between points inherited from a knot's diagram and **crossing points**. Shown in the Viewer
(3D) and, as an overlay on top of the knots' own lines, in the Subsurface board (2D) — the same
loop, projected.
_Avoid_: subsurface, loop (on their own, ambiguous with the walk or with a knot's own polyline)

**Crossing point**:
A point in a subsurface loop with no origin in any knot's 2D diagram — its coordinates are
interpolated in 3D, along an existing knot edge, at the point where that edge pierces another
knot's surface triangle. Distinguished from an ordinary loop point, which is inherited from a
knot's diagram and keeps that diagram point's identity. For the Subsurface board's 2D overlay,
a crossing point's 3D coordinates are projected to a 2D position the same way any 3D point is
(see [AGENTS.md](./AGENTS.md)) — but the point's origin is 3D, not 2D.

**Subsurface surface**:
The surface built from a Subsurface loop's own points, shown only in the Viewer (there is no 2D
equivalent on the Subsurface board). Rendered by `SubSurfaceSurface.vue`, separate from the loop's
own line/point rendering, and hidden/shown by its own toggle (only offered while the Subsurface
tab is active, alongside the loop it's built from). Currently contains only the **Subsurface cap**;
the pieces connecting that cap down to the loop's own points are future work, to be added inside
this same component (see ADR 0004).
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
connected down to the loop's real points — both are deliberate, and the latter is future work (see
ADR 0004). Rendered by its own component (`SubSurfaceCap.vue`), used by `SubSurfaceSurface.vue`.
_Avoid_: cap surface (ambiguous with the loop or a knot's own surface)
