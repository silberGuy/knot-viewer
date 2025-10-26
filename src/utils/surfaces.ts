import { Earcut } from "three/src/extras/Earcut.js";
import type { DiagramTriangle, Intersection, KnotDiagramPoint, SurfaceLevel } from "../components/types";
import { Ray, Vector3 } from "three";

function getIntersectionOrientationSign(intersection: Intersection) {
    const v1x = intersection.topLine.p2.x - intersection.topLine.p1.x
    const v1y = intersection.topLine.p2.y - intersection.topLine.p1.y
    const v2x = intersection.bottomLine.p2.x - intersection.bottomLine.p1.x
    const v2y = intersection.bottomLine.p2.y - intersection.bottomLine.p1.y

    return Math.sign(v1x * v2y - v1y * v2x)
}

export function findPointSurfaceIndex(surfaces: KnotDiagramPoint[][], point: KnotDiagramPoint) {
    return surfaces.findIndex(s => s.some(sp => sp.id === point.id && sp.knotId === point.knotId));
}

export function getSurfaceLevels(points: KnotDiagramPoint[]) {
    if (new Set(points.map(p => p.id)).size < points.length) {
        throw new Error("points must have unique ids");
    }
    const surfaceLevels: SurfaceLevel[] = [];
    const visited = new Set<string>();

    const startPoint = points[0];
    if (!startPoint) return surfaceLevels;

    const passedIntersections = new Set<string>(); // loops that we saw but used their parallel to continue
    const walk = (point: KnotDiagramPoint) => {
        const index = points.findIndex(p => p.id === point.id);
        const nextPoint = points[index + 1] || points[0];
        if (nextPoint.knotId !== point.knotId) {
            return null;
        }
        if (point.intersection?.isWithinKnot) {
            const parallelIndex = points.findIndex(p => p.id === point.intersectionParallelId);
            if (passedIntersections.has(point.intersection.id)) {
                return nextPoint;
            }
            return points[parallelIndex + 1];
        }
        if (nextPoint.intersection) {
            const parallelIndex = points.findIndex(p => p.id === nextPoint.intersectionParallelId);
            const parallelPoint = points[parallelIndex];
            if (!parallelPoint) {
                console.warn(`could not find parallel point for intersection: ${nextPoint.id}`);
                return nextPoint
            };
            // These checks make sure top intersections are added to later loops than their bottom
            const useParallelPoint = (
                (nextPoint.isTop && !visited.has(nextPoint.intersectionParallelId!)) ||
                (!nextPoint.isTop && visited.has(nextPoint.id))
            )
            if (useParallelPoint) {
                passedIntersections.add(nextPoint.intersection.id);
                return parallelPoint.knotId === point.knotId ? parallelPoint : points[index + 2] || points[0];
            }
        };

        return nextPoint;
    }

    const findLoop = (currentPoint: KnotDiagramPoint, loop: KnotDiagramPoint[]) => {
        loop.push(currentPoint);
        visited.add(currentPoint.id);

        const nextPoint = walk(currentPoint);
        if (nextPoint && !visited.has(nextPoint.id)) {
            findLoop(nextPoint, loop);
        }
    };

    while (visited.size < points.length) {
        for (const point of points) {
            if (!visited.has(point.id)) {
                if (point.isTop && !visited.has(point.intersectionParallelId!)) {
                    continue; // top intersections are added to loops after their bottom
                }
                const loop: KnotDiagramPoint[] = [];
                findLoop(point, loop);
                if (loop.length > 0) {
                    const interBottoms = loop.filter(p => p.intersection && !p.isTop && !p.intersection.isWithinKnot);
                    if (surfaceLevels.length === 0 && interBottoms.length > 0) {
                        surfaceLevels.push(interBottoms);
                        surfaceLevels.push(loop.filter(p => !interBottoms.includes(p)));
                    } else {
                        surfaceLevels.push(loop);
                    }
                }
            }
        }
    }

    if (surfaceLevels[0].every(p => p.intersection && !p.isTop)) {
        if (surfaceLevels[0][0].knotId === surfaceLevels[1][0].knotId) {
            for (const point of [...surfaceLevels[0]]) {
                const pointIndex = points.findIndex(p => p.id === point.id);
                const prevPoint = points[pointIndex - 1];
                if (surfaceLevels[1].includes(prevPoint)) {
                    surfaceLevels[1].splice(surfaceLevels[1].indexOf(prevPoint) + 1, 0, point);
                    surfaceLevels[0].splice(surfaceLevels[0].indexOf(point), 1);
                }
            }
        }
    }

    return surfaceLevels.filter(level => level.length > 0);
}

export function getSurfaceLevelTriangles(points: KnotDiagramPoint[]) {
    if (points.length < 3) return [];
    const filteredPoints = points;
    const points2D = filteredPoints.map((p) => ([p.x, p.y]));
    const cut = Earcut.triangulate(points2D.flat(), [], 2);
    const triangles: DiagramTriangle[] = [];
    for (let i = 0; i < cut.length; i += 3) {
        const [a, b, c] = cut.slice(i, i + 3).sort((x, y) => x - y);
        triangles.push([
            filteredPoints[a],
            filteredPoints[b],
            filteredPoints[c],
        ]);
    }
    return triangles;
}

export function getKnotIntersectionTriangles(points: KnotDiagramPoint[], surfaces: KnotDiagramPoint[][]) {
    const visitedIntersections = new Set<string>();
    const intersectionTriangles: DiagramTriangle[] = [];
    const getSurfaceIndex = findPointSurfaceIndex.bind(null, surfaces);

    // TODO: skip intersections of different knots

    for (let i = 0; i < points.length - 1; i++) {
        const point = points[i];
        if (point.intersection?.isWithinKnot && !visitedIntersections.has(point.intersection.id)) {
            const p1 = point;
            const p1ParallelIndex = points.findIndex(p => p.id === p1.intersectionParallelId)!
            let dir = getIntersectionOrientationSign(point.intersection);
            let p2 = points[i + dir];
            if (getSurfaceIndex(p1) === getSurfaceIndex(p2)) {
                dir = -dir;
                p2 = points[i + dir];
            }
            const p3 = points[p1ParallelIndex];
            const p4 = points[p1ParallelIndex + dir];
            visitedIntersections.add(p1.id);
            visitedIntersections.add(p3.id);
            if (!p2 || !p4) throw new Error(`could not calculate loop for intersection: ${point.intersection.id}`);
            intersectionTriangles.push([p4, p1, p3]);
            intersectionTriangles.push([p3, p1, p2]);
        }
    }
    return intersectionTriangles;
}

export function getIntersectionsNotInKnotTriangles(points: KnotDiagramPoint[], surfacesLevels: KnotDiagramPoint[][]) {
    const intersectionsNotWithin = points.filter(
        (point) => point.intersection && !point.intersection.isWithinKnot
    );
    return intersectionsNotWithin
        .map((inter) => {
            const pointIndex = points.findIndex((p) => p.id === inter.id);
            const interSurfaceIndex = findPointSurfaceIndex(surfacesLevels, inter);
            const prevPoint = points[pointIndex - 1];
            const nextPoint = points[pointIndex + 1];
            const prevSurfaceIndex = findPointSurfaceIndex(surfacesLevels, prevPoint);
            const nextSurfaceIndex = findPointSurfaceIndex(surfacesLevels, nextPoint);
            if (
                interSurfaceIndex !== prevSurfaceIndex ||
                interSurfaceIndex !== nextSurfaceIndex
            ) {
                return [
                    points[pointIndex - 1],
                    inter,
                    points[pointIndex + 1],
                ];
            }
        })
        .filter((t): t is DiagramTriangle => !!t);
}

type Point3D = [number, number, number];
type T2Points = [Point3D, Point3D];
type T3Points = [Point3D, Point3D, Point3D];
export function getTriangleLineIntersection(triangle: T3Points, line: T2Points) {
    const B = new Vector3(...triangle[0])
    const A = new Vector3(...triangle[1])
    const C = new Vector3(...triangle[2])
    const P1 = new Vector3(...line[0])
    const P2 = new Vector3(...line[1])

    const dir = new Vector3().subVectors(P2, P1).normalize()
    const ray = new Ray(P1, dir)

    const intersection = ray.intersectTriangle(A, B, C, false, new Vector3())
    if (intersection) {
        return [intersection.x, intersection.y, intersection.z];
    }

    return null;
}
