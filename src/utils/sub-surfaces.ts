import { Ray, Vector3 } from "three";
import type { Knot3D, Point3D, SubSurfacesKnot, SubSurfacesPoint, Triangle3D } from "../components/types";

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

function getTrianglesIntersectionsAsymmetric(triangle1: Triangle3D, triangle2: Triangle3D): SubSurfacesPoint[] {
    const intersections: SubSurfacesPoint[] = [];

    const edges1 = [
        [triangle1.points[0], triangle1.points[1]],
        [triangle1.points[1], triangle1.points[2]],
        [triangle1.points[2], triangle1.points[0]],
    ] as [Point3D, Point3D][];

    for (const [p1, p2] of edges1) {
        const intersection = getTriangleLineIntersection(triangle2, [p1, p2]);
        if (intersection) {
            const newPoint = {
                id: `subsurface-inter-${p1.diagramPoint.id}-${p2.diagramPoint.id}-${triangle2.id}`,
                surfaceIntersection: {
                    triangle: triangle2,
                    lineP1: p1,
                    lineP2: p2,
                },
                coords: intersection as [number, number, number],
            }
            intersections.push(newPoint);
        }
    }

    // NOTE: when the triangles intersect exactly at a vertex, we get duplicate points
    while (intersections.length > 1 && new Vector3(...intersections[0].coords).distanceToSquared(new Vector3(...intersections[1].coords)) < 0.001) {
        intersections.pop();
    }

    return intersections;
}

function getTrianglesIntersections(triangle1: Triangle3D, triangle2: Triangle3D): SubSurfacesPoint[] {
    const points1 = getTrianglesIntersectionsAsymmetric(triangle1, triangle2);
    const points2 = getTrianglesIntersectionsAsymmetric(triangle2, triangle1);
    const points = [...points1, ...points2];
    if (points.length < 2) return [];

    if (points.length !== 2) {
        console.warn(points1, points2);
        throw new Error(`Triangles intersections should result in 0 or 2 intersection points, found: ${points.length}`);
    }

    points[0].surfaceIntersection!.twinPointKnotId = points1.includes(points[0]) ? triangle2.knotId : triangle1.knotId;
    points[0].surfaceIntersection!.twinPointId = points[1].id;
    points[1].surfaceIntersection!.twinPointKnotId = points1.includes(points[1]) ? triangle1.knotId : triangle2.knotId;
    points[1].surfaceIntersection!.twinPointId = points[0].id;

    return points;
}

function injectSubSurfaceIntersectionsIntoKnot(knot: Knot3D, pointsToAdd: SubSurfacesPoint[]): SubSurfacesKnot {
    const resultPoints: SubSurfacesPoint[] = [];

    for (let i = 0; i < knot.points.length; i++) {
        const point = knot.points[i];
        const nextPoint = knot.points[i + 1];

        resultPoints.push(point);
        const intersectionsBetweenPoints = pointsToAdd.filter(p => {
            const linePoints = [p.surfaceIntersection?.lineP1.id, p.surfaceIntersection?.lineP2.id];
            return nextPoint && linePoints.includes(point.id) && linePoints.includes(nextPoint.id);
        })
            .sort((a, b) => {
                const aDist = new Vector3(...a.coords).distanceToSquared(new Vector3(...point.coords));
                const bDist = new Vector3(...b.coords).distanceToSquared(new Vector3(...point.coords));
                return aDist - bDist;
            });
        resultPoints.push(...intersectionsBetweenPoints);
    }
    return {
        ...knot,
        points: resultPoints,
    };
}

export function getKnotsSurfacesIntersections(knots: Knot3D[]): SubSurfacesPoint[] {
    const intersections = [] as SubSurfacesKnot["points"];

    const allTriangles = knots.map(k => k.surfaceTriangles).flat();

    for (let i = 0; i < allTriangles.length - 1; i++) {
        for (let j = i + 1; j < allTriangles.length; j++) {
            const triangle1 = allTriangles[i];
            const triangle2 = allTriangles[j];
            if (triangle1.knotId === triangle2.knotId) continue;
            intersections.push(...getTrianglesIntersections(triangle1, triangle2));
        }
    }

    return intersections;
}

export function combineKnotsWithSurfaceIntersections(knots: Knot3D[]): SubSurfacesKnot[] {
    const pointsToAdd = getKnotsSurfacesIntersections(knots);
    const knotsWithSubSurfacePoints = knots.map(knot => injectSubSurfaceIntersectionsIntoKnot(knot, pointsToAdd));
    return knotsWithSubSurfacePoints;
}

export function getSubSurfaceIntersectionsLoop(knots: Knot3D[]): Omit<SubSurfacesKnot, 'diagramKnot'> {
    const knotsWithSubSurfacePoints = combineKnotsWithSurfaceIntersections(knots);

    const newKnotPoints: SubSurfacesPoint[] = [];
    const visitedPointIds: Set<string> = new Set();
    const walk = (currentKnot: SubSurfacesKnot, currentPointIndex: number) => {
        const currentPoint = currentKnot.points[currentPointIndex % currentKnot.points.length];
        if (!currentPoint || visitedPointIds.has(currentPoint.id)) {
            return;
        }
        newKnotPoints.push(currentPoint);
        visitedPointIds.add(currentPoint.id);

        if (currentPoint.surfaceIntersection?.twinPointKnotId && currentPoint.surfaceIntersection?.twinPointId) {
            const twinKnot = knotsWithSubSurfacePoints.find(k => k.diagramKnot.id === currentPoint.surfaceIntersection!.twinPointKnotId)!;
            const twinPointIndex = twinKnot.points.findIndex(p => p.id === currentPoint.surfaceIntersection!.twinPointId);
            if (twinPointIndex === -1) {
                console.log('KNOT', twinKnot);
                console.log('point', currentPoint);
            }

            walk(twinKnot, twinPointIndex);
        } else {
            walk(currentKnot, currentPointIndex + 1);
        }
    }

    walk(knotsWithSubSurfacePoints[0], 0);

    return {
        points: newKnotPoints,
        surfaceTriangles: []
    };
}

export function getSurfaceIntersectionsPairs(intersections: SubSurfacesPoint[]): [SubSurfacesPoint, SubSurfacesPoint][] {
    const pairs: [SubSurfacesPoint, SubSurfacesPoint][] = [];
    const visitedIds = new Set<string>();

    for (const point of intersections) {
        if (visitedIds.has(point.id)) continue;
        if (point.surfaceIntersection?.twinPointId) {
            const twinPoint = intersections.find(p => p.id === point.surfaceIntersection!.twinPointId);
            if (twinPoint) {
                pairs.push([point, twinPoint]);
                visitedIds.add(point.id);
                visitedIds.add(twinPoint.id);
            }
        }
    }
    return pairs;
}
