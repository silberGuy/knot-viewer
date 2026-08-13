# Wall/knot intersection test guards against near-parallel segments

`getTrianglesIntersectionSegment` (ADR 0008) finds a shared segment by testing each triangle's
edges against the other's plane via `Ray.intersectTriangle`. That math divides by how steeply the
tested segment crosses the plane; wall triangles are built to share a vertex or full edge with the
knot triangle they're tested against, so some of their edges are, by construction, nearly parallel
to that plane - exactly the case where the division is numerically unstable and can return a
wildly displaced point instead of correctly finding none. This showed up as a spurious "Secondary
intersection" line sitting near a loop edge: intermittent, sensitive to tiny cap-shift/level-height
changes, and visibly tilted rather than coincident with the true edge.

Fix: `getRawTriangleLineIntersection` now checks the angle between the segment and the target
triangle's plane before trusting `Ray.intersectTriangle`'s result, treating anything under ~0.1°
as no intersection. This is also the semantically correct call - a segment lying almost in a
triangle's plane has no well-defined single crossing point to report.
