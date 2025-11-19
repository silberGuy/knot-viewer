import { Ray, Vector3 } from "three";
import type { Knot3D, Point3D, SubSurface, SubSurfacesKnot, SubSurfacesPoint, Triangle3D } from "../components/types";

function arePointsClose(a: { coords: [number, number, number] }, b: { coords: [number, number, number] }, epsilon = 0.01) {
    const v = new Vector3(...a.coords);
    return v.distanceTo(new Vector3(...b.coords)) < epsilon;
}

type CompPoint = { coords: [number, number, number] };
function isPointBetweenPoints(point: CompPoint, p1: CompPoint, p2: CompPoint, epsilon = 0.01) {
    const vPoint = new Vector3(...point.coords);
    const v1 = new Vector3(...p1.coords);
    const v2 = new Vector3(...p2.coords);

    const d1 = vPoint.distanceTo(v1);
    const d2 = vPoint.distanceTo(v2);
    const dTotal = v1.distanceTo(v2);

    return Math.abs((d1 + d2) - dTotal) < epsilon;
}

function getTriangleLineIntersection(triangle: Triangle3D, line: [Point3D, Point3D]) {
    const B = new Vector3(...triangle.points[0].coords)
    const A = new Vector3(...triangle.points[1].coords)
    const C = new Vector3(...triangle.points[2].coords)
    const P1 = new Vector3(...line[0].coords)
    const P2 = new Vector3(...line[1].coords)

    const lineDir = new Vector3().subVectors(P2, P1)
    const ray = new Ray(P1, lineDir)

    const intersection = ray.intersectTriangle(A, B, C, false, new Vector3())
    if (!intersection) return null;

    const t = intersection.clone().sub(P1).dot(lineDir) / lineDir.lengthSq()
    if (t < 0 || t > 1) return null;

    return [intersection.x, intersection.y, intersection.z];
}

function deduplicatePoints(points: SubSurfacesPoint[], epsilon = 0.01) {
    const unique: SubSurfacesPoint[] = [];

    for (const p of points) {
        const v = new Vector3(...p.coords);
        const isClose = unique.some(u => v.distanceTo(new Vector3(...u.coords)) < epsilon);
        if (!isClose) unique.push(p);
    }

    return unique;
}

function getPointsIndexesDistanceInKnot(pointA: Point3D, pointB: Point3D, knot: Knot3D) {
    const indexA = knot.points.findIndex(p => p.id === pointA.id);
    const indexB = knot.points.findIndex(p => p.id === pointB.id);
    if (indexA === -1 || indexB === -1) return Infinity;

    return (indexA - indexB) % knot.points.length;
}

function getTrianglesIntersectionsAsymmetric(triangle1: Triangle3D, triangle2: Triangle3D, knots: Knot3D[]): SubSurfacesPoint[] {
    const intersections: SubSurfacesPoint[] = [];

    const edges1 = [
        [triangle1.points[0], triangle1.points[1]],
        [triangle1.points[1], triangle1.points[2]],
        [triangle1.points[2], triangle1.points[0]],
    ] as [Point3D, Point3D][];

    const triangle1Knot = knots.find(k => k.diagramKnot.id === triangle1.knotId);
    edges1.sort((a, b) => {
        return Math.abs(getPointsIndexesDistanceInKnot(a[0], a[1], triangle1Knot!)) - Math.abs(getPointsIndexesDistanceInKnot(b[0], b[1], triangle1Knot!));
    })

    for (const [p1, p2] of edges1) {
        const intersection = getTriangleLineIntersection(triangle2, [p1, p2]);
        if (intersection) {
            const sortedByKnotPoints = [p1, p2].sort((a, b) => getPointsIndexesDistanceInKnot(a, b, triangle1Knot!));
            const newPoint = {
                id: `subsurface-inter-${p1.diagramPoint.id}-${p2.diagramPoint.id}-${triangle2.id}`,
                surfaceIntersection: {
                    triangle: triangle1,
                    otherTriangle: triangle2,
                    lineP1: sortedByKnotPoints[0],
                    lineP2: sortedByKnotPoints[1],
                },
                coords: intersection as [number, number, number],
            }
            intersections.push(newPoint);
        }
    }

    // often the triangle edge is the intersection, causing duplicate points
    return deduplicatePoints(intersections);
}

function getTrianglesIntersections(triangle1: Triangle3D, triangle2: Triangle3D, knots: Knot3D[]): SubSurfacesPoint[] {
    const points1 = getTrianglesIntersectionsAsymmetric(triangle1, triangle2, knots);
    const points2 = getTrianglesIntersectionsAsymmetric(triangle2, triangle1, knots);
    const points = [...points1, ...points2];
    if (points.length < 2) return [];

    if (points.length !== 2) {
        console.warn(points1, points2);
        console.error(`Triangles intersections should result in 0 or 2 intersection points, found: ${points.length}`);
    }

    points[0].surfaceIntersection!.twinPointId = points[1].id;
    points[0].surfaceIntersection!.twinPointKnotId = points[1].surfaceIntersection?.triangle.knotId;
    points[1].surfaceIntersection!.twinPointId = points[0].id;
    points[1].surfaceIntersection!.twinPointKnotId = points[0].surfaceIntersection?.triangle.knotId;

    return points;
}

function injectSubSurfaceIntersectionsIntoKnot(knot: Knot3D, pointsToAdd: SubSurfacesPoint[]): SubSurfacesKnot {
    const resultPoints: SubSurfacesPoint[] = [];
    const knotIntersections = pointsToAdd.filter(p => {
        return p.surfaceIntersection?.triangle.knotId === knot.diagramKnot.id;
    });

    // When intersection is exactly on a knot point, it will be added twice, so we track added points
    const addedPointIds = new Set<string>();

    for (let i = 0; i < knot.points.length; i++) {
        const point = knot.points[i];
        const nextPoint = knot.points[(i + 1) % knot.points.length];

        resultPoints.push(point);
        // THE PROBLEM IS HERE: (
        const intersectionsBetweenPoints = knotIntersections.filter(p => isPointBetweenPoints(p, point, nextPoint) && !addedPointIds.has(p.id))
            //  {
            //     const linePoints = [p.surfaceIntersection?.lineP1.id, p.surfaceIntersection?.lineP2.id];
            //     return nextPoint && linePoints.includes(point.id) && linePoints.includes(nextPoint.id);
            // })
            .sort((a, b) => {
                const aDist = new Vector3(...a.coords).distanceToSquared(new Vector3(...point.coords));
                const bDist = new Vector3(...b.coords).distanceToSquared(new Vector3(...point.coords));
                return aDist - bDist;
            });
        resultPoints.push(...intersectionsBetweenPoints);
        intersectionsBetweenPoints.forEach(p => addedPointIds.add(p.id));
    }
    return {
        ...knot,
        points: resultPoints,
    };
}

export function getKnotsSurfacesIntersections(knots: Knot3D[]): SubSurfacesPoint[] {
    const intersections = new Set<SubSurfacesPoint>();

    const allTriangles = knots.map(k => k.surfaceTriangles).flat();

    for (let i = 0; i < allTriangles.length - 1; i++) {
        for (let j = i + 1; j < allTriangles.length; j++) {
            const triangle1 = allTriangles[i];
            const triangle2 = allTriangles[j];
            if (triangle1.knotId === triangle2.knotId) continue;
            getTrianglesIntersections(triangle1, triangle2, knots).forEach(p => intersections.add(p));
        }
    }

    let changed = true;
    while (changed) {
        changed = false;
        for (const intersection1 of intersections) {
            const intersectionTwin = Array.from(intersections).find(p => p.id === intersection1.surfaceIntersection?.twinPointId);
            if (!intersectionTwin) {
                console.warn('Could not find twin for intersection point', intersection1);
                continue;
            }
            for (const otherIntersection of intersections) {
                if (intersection1 === otherIntersection) continue;
                if (intersectionTwin.id === otherIntersection.id) continue;
                if (arePointsClose(intersectionTwin, otherIntersection)) {
                    intersection1.surfaceIntersection!.twinPointId = otherIntersection.surfaceIntersection?.twinPointId;
                    intersection1.surfaceIntersection!.twinPointKnotId = otherIntersection.surfaceIntersection?.twinPointKnotId;
                    otherIntersection.surfaceIntersection!.twinPointId = intersection1.id;
                    otherIntersection.surfaceIntersection!.twinPointKnotId = intersection1.surfaceIntersection?.triangle.knotId;
                    intersections.delete(intersectionTwin);
                    intersections.delete(otherIntersection);
                    changed = true;
                }
            }
        }
    }

    return Array.from(intersections);
}

export function combineKnotsWithSurfaceIntersections(knots: Knot3D[]): SubSurfacesKnot[] {
    const pointsToAdd = getKnotsSurfacesIntersections(knots);
    const knotsWithSubSurfacePoints = knots.map(knot => injectSubSurfaceIntersectionsIntoKnot(knot, pointsToAdd));
    return knotsWithSubSurfacePoints;
}

export function getSubSurfaceIntersectionsLoop(knots: Knot3D[]): SubSurface {
    const knotsWithSubSurfacePoints = combineKnotsWithSurfaceIntersections(knots);

    const newKnotPoints: SubSurfacesPoint[] = [];
    const visitedPointIds: Set<string> = new Set();
    const walk = (currentKnot: SubSurfacesKnot, currentPointIndex: number, justJumpedTwin = false) => {
        const currentPoint = currentKnot.points[currentPointIndex % currentKnot.points.length];
        if (!currentPoint || visitedPointIds.has(currentPoint.id)) {
            return;
        }
        newKnotPoints.push({ ...currentPoint, coords: [currentPoint.coords[0] + 1, currentPoint.coords[1] + 1, currentPoint.coords[2]] as [number, number, number] });
        visitedPointIds.add(currentPoint.id);

        const twinPointId = currentPoint.surfaceIntersection?.twinPointId;
        if (twinPointId && !justJumpedTwin) {
            const twinKnot = knotsWithSubSurfacePoints.find(k => k.points.some(p => p.id === twinPointId));
            if (!twinKnot) {
                console.error('Could not find twin knot for point', currentPoint);
                return;
            }
            const twinPointIndex = twinKnot.points.findIndex(p => p.id === twinPointId);
            if (twinPointIndex === -1) {
                console.log('KNOT', twinKnot);
                console.log('point', currentPoint);
            }

            walk(twinKnot, twinPointIndex, true);
            return;
        }
        walk(currentKnot, (currentPointIndex + 1) % currentKnot.points.length);
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
