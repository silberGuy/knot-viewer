# Cap shift computed on the raw loop, before the cap's self-touching split, and reused for the wall's top edge

**Cap shift** (CONTEXT.md) needs each point's actual neighbors in the loop's raw order, not
neighbors within whichever simple sub-loop the cap's self-touching split
(`splitLoopAtDuplicateIntersections`, ADR 0004) puts it in. We shift the raw, unsplit loop first,
then split and triangulate the *shifted* boundary as before — safe because the split matches
points by diagram identity (`intersectionParallelId`), not current coordinates.

The Subsurface wall (ADR 0005) already walks the raw loop independently of the cap's split. Its
top edge used to equal the cap's own unshifted flattened points, so we reuse the same shifted
boundary there too, keeping wall and cap coupled instead of letting them diverge. The wall's
bottom edge (the loop's real points) is untouched.

Rejected: shifting per split sub-loop. Internally consistent for the cap alone, but leaves no
non-arbitrary shifted position for the wall to use at each raw loop point.

A knot's own closing point (drawing.ts) duplicates that knot's first point, coincident with it -
harmless before this change (a zero-length edge), but shifted independently it visibly splits one
corner into two. Both cap and wall drop closing points before computing/using the shift.
