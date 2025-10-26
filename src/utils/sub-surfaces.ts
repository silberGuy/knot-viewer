import { Ray, Vector3 } from "three";
import type { Knot3D, Point3D, SubSurfacesKnot, Triangle3D } from "../components/types";

function getTriangleLineIntersection(triangle: Triangle3D, line: [Point3D, Point3D]) {
    const B = new Vector3(...triangle.points[0].coords)
    const A = new Vector3(...triangle.points[1].coords)
    const C = new Vector3(...triangle.points[2].coords)
    const P1 = new Vector3(...line[0].coords)
    const P2 = new Vector3(...line[1].coords)

    const dir = new Vector3().subVectors(P2, P1).normalize()
    const ray = new Ray(P1, dir)

    const intersection = ray.intersectTriangle(A, B, C, false, new Vector3())
    if (intersection) {
        return [intersection.x, intersection.y, intersection.z];
    }

    return null;
}

export function combineKnotPointsWithSurfaceIntersections(knot: Knot3D, allKnots: Knot3D[]): SubSurfacesKnot {
    const resultPoints = [...knot.points] as SubSurfacesKnot["points"];
    const otherKnots = allKnots.filter(k => k.diagramKnot.id !== knot.diagramKnot.id);

    const allTriangles = otherKnots.map(k => k.surfaceTriangles).flat();

    for (let i = 0; i < knot.points.length - 1; i++) {
        const p1 = knot.points[i];
        const p2 = knot.points[i + 1];

        for (const triangle of allTriangles) {
            const intersection = getTriangleLineIntersection(triangle, [p1, p2]);
            if (intersection) {
                if (intersection) {
                    const newPoint = {
                        id: `subsurface-inter-${p1.diagramPoint.id}-${p2.diagramPoint.id}-${triangle.id}`,
                        surfaceIntersection: {
                            triangle,
                        },
                        coords: intersection as [number, number, number],
                    }
                    const index = resultPoints.findIndex(p => p === p1) + 1;
                    resultPoints.splice(index, 0, newPoint);
                }
            }
        }
    }

    return {
        ...knot,
        points: resultPoints,
    };
}
