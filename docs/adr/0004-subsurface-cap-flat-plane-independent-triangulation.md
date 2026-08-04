# Subsurface cap is a flat plane, triangulated independently of knot surface levels

To render the area the Subsurface loop encloses, we needed to turn its points into an actual
surface. An earlier attempt (`getSubSurfaceTriangles`, now deleted) reused the knot pipeline's own
surface-level machinery (`getSurfaceLevels` + `getKnotTriangles` from `surfaces.ts`/`diagram.ts`)
and mapped each resulting triangle vertex back to that point's own real 3D height, producing a
surface draped across whatever height each loop point already sat at. It was broken and unused —
wired up (`getSubSurfaceIntersectionsLoop` stored its result on `SubSurface.surfaceTriangles`) but
never rendered (`KnotViewer.vue` always passed `showSurfaces={false}` for that loop).

We rejected reusing that machinery going forward. It exists to resolve a *knot's own* over/under
crossings into multiple disconnected surface levels; the Subsurface loop is already a single
ordered closed loop by construction (`getSubSurfaceIntersectionsLoop`'s walk), so a plain Earcut
fan over its points is the right fit, not the multi-level walk. We also rejected draping the
surface across each point's real height, in favor of a genuinely flat cap: every point shares one
height, one surface level above the highest level any knot currently occupies. Flattening the
loop's points and triangulating them is deliberately a first, separate step from connecting the
cap back down to the loop's own points at their real height — that connection is future work, not
part of this change.

Because the loop's footprint, once flattened to the x/z plane, isn't guaranteed to be a simple
polygon, and Earcut doesn't validate that, we initially planned to detect self-intersection on the
flattened points and only warn rather than repair it - full repair (splitting into simple
sub-polygons at the self-intersection points) looked like a general polygon-regularization problem,
the kind of thing libraries like Turf.js's `unkink-polygon` exist for, and not worth hand-rolling
without first seeing how often it actually happens.

It happens every time a drawn 2D knot `Intersection` (`drawing.ts`) isn't also one of the loop's
own crossing points. A drawn `Intersection` produces two `DiagramPoint`s at the same 2D location,
one per knot, linked via `intersectionParallelId`. The subsurface walk only jumps between knots at
its own crossing points (`surfaceIntersection` - where the surfaces actually *pierce*); if the two
knots at a drawn intersection don't pierce there, the walk has no reason to jump, and can visit
both knots' copies of that same 2D location as separate ordinary loop points - which flatten to the
exact same (x, y). Confirmed against the domain model, this is the *only* source of a self-touching
flattened footprint, not one case among many.

That ruled out both the "just warn" plan and a general library: since both halves of the
duplicated location already exist as real points in the loop (no new geometry to compute or
insert), splitting is pure sequence-slicing - wherever the loop contains both halves of a drawn
`Intersection`, it splits into the two arcs between them, each still closed through the shared
coordinate, recursively for more than one such pair. Every resulting sub-loop is guaranteed simple
by construction, is triangulated separately, and no metadata is lost - nothing needed to be
reattached by coordinate-matching, because nothing was ever regenerated from scratch. This is
expected, ordinary behavior for a drawing with such intersections, not an error condition - no
warning is logged for it.

See `docs/specs/0002-subsurface-cap.md` for the concrete implementation plan.
