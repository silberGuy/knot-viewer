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
point and, at each crossing between two knots' surfaces, either continuing straight or jumping
to the crossing's twin point. Currently the walk's start point and its turn choice at each
crossing are hardcoded (`getSubSurfaceIntersectionsLoop` always starts at the first knot's
first point, and always jumps to a twin when one exists). The **Subsurface tab** exists to
eventually make these two choices user-controlled by clicking on its board — the board now
*displays* the resulting loop, but clicking to redirect the walk isn't built yet.

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
