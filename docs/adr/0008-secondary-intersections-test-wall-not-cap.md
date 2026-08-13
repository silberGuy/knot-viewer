# Secondary intersections test the wall, not the cap, via a generic triangle check

The Secondary cap always sits above every knot's current height (ADR 0004), so it can never
intersect a knot's surface — only the wall can, and that's what the `secondaryIntersections`
toggle tests. The check is a new, generic triangle-vs-triangle function rather than an extension
of the existing knot-vs-knot `getTrianglesIntersections`, since that function is coupled to
`Knot3D` id/walk-injection concerns the wall doesn't have.
