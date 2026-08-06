# Cap shift splits on the shifted boundary's own self-intersections, not on diagram identity

**Cap shift** (CONTEXT.md) shifts every loop point using its own real (raw loop) neighbors - no
special-casing for self-touching. That part was never the problem.

The problem was reusing ADR 0004's `splitLoopAtDuplicateIntersections` (identity-based: reuse one
of a coincident pair to close each arc) on top of shifted points. That substitution is only valid
because the pair is *coincident* before any shift; once shifted, each half moves independently, so
closing an arc through the wrong half sends a triangle edge to the wrong (stale, unshifted-implied)
position instead of the other half's real, currently-shifted one.

Fix: after shifting, find where the shifted boundary's own edges actually intersect - a general,
purely geometric check (any two non-adjacent edges, including merely touching at an endpoint, not
just crossing through each other) - and insert *that* point to close each resulting simple
sub-boundary, instead of reusing an existing loop point. This is cap-only
(`getSubSurfaceCapTriangles`); the wall (ADR 0005) keeps walking the raw loop via each point's own
shifted position, never aware of the inserted point.

This supersedes ADR 0004's rationale for the cap specifically: it rejected a general
self-intersection solver because, at the time, identity-based slicing losslessly covered the only
known case (no new geometry to compute). Cap shift introduces genuine new geometry at that same
corner, so a real intersection has to be computed - there's no longer a free identity-based
shortcut available.

A knot's own closing point (drawing.ts) duplicates that knot's first point, coincident with it -
harmless before this change (a zero-length edge), but shifted independently it visibly splits one
corner into two. Both cap and wall drop closing points before computing/using the shift.
