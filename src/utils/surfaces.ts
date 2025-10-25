import { Earcut } from "three/src/extras/Earcut.js";
import type { Intersection, KnotDiagramPoint } from "../components/types";

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
    const surfaceLevels: KnotDiagramPoint[][] = [];
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

export function getSurfaceLevelTriangles(points: KnotDiagramPoint[], to3D: (p: KnotDiagramPoint, i: number) => [number, number, number]) {
    if (points.length < 3) return [];
    const filteredPoints = points;
    const points3D = filteredPoints.map(p => to3D(p, filteredPoints.indexOf(p)));
    const points2D = points3D.map(([x, _z, y]) => ([x, y]));
    const cut = Earcut.triangulate(points2D.flat(), [], 2);
    const triangles: [number, number, number][][] = [];
    for (let i = 0; i < cut.length; i += 3) {
        const [a, b, c] = cut.slice(i, i + 3).sort((x, y) => x - y);
        triangles.push([
            points3D[a],
            points3D[b],
            points3D[c],
            points3D[a],
        ]);
    }
    return triangles;
}

export function getKnotIntersectionTriangles(points: KnotDiagramPoint[], to3D: (p: KnotDiagramPoint, i: number) => [number, number, number], surfaces: KnotDiagramPoint[][]) {
    const visitedIntersections = new Set<string>();
    const intersectionTriangles: [number, number, number][][] = [];
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
            const renderPoints = [to3D(p1, i), to3D(p2, i + dir), to3D(p3, p1ParallelIndex), to3D(p4, p1ParallelIndex + dir)];
            intersectionTriangles.push([
                renderPoints[3], renderPoints[0], renderPoints[2],
            ]);
            intersectionTriangles.push([
                renderPoints[1], renderPoints[0], renderPoints[2],
            ].reverse());
        }
    }
    return intersectionTriangles;
}
