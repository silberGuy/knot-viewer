import { Earcut } from "three/src/extras/Earcut.js";
import type { Coords2D, Intersection, Knot, KnotDiagramPoint, Line, Point } from "../components/types";

const CLOSING_POINT_ID = 'closing-point';

function createClosingPoint<T extends Point>(points: T[], knotId: string): T {
    return { ...points[0], id: `${knotId}-${CLOSING_POINT_ID}`, knotId }
}

function isStartingPoint(point: Point) {
    return point.id.endsWith('-0');
}

function isClosingPoint(point: Point) {
    return point.id.endsWith(CLOSING_POINT_ID);
}

function getLineId(prefix: string, p1: Point, p2: Point): string {
    return [prefix, p1.id, p2.id].join("-");
}

export function getKnotLines(knot: Knot): Line[] {
    if (knot.points.length < 2) return [];
    const linePoints: Line[] = [];
    for (let i = 0; i < knot.points.length - 1; i++) {
        const p1 = knot.points[i];
        const p2 = knot.points[i + 1];
        linePoints.push({ id: getLineId(knot.id, p1, p2), p1, p2, knotId: knot.id });
    }
    if (knot.isClosed && knot.points.length > 2) {
        // Close the knot
        const p1 = knot.points[knot.points.length - 1];
        const p2 = createClosingPoint(knot.points, knot.id);
        linePoints.push({ id: getLineId(knot.id, p1, p2), p1, p2, knotId: knot.id });
    }
    return linePoints;
}

export function getIntersection(line1: Line, line2: Line) {
    // Check if the lines share an endpoint (i.e., are adjacent edges)
    if (
        line1.p1 === line2.p1 ||
        line1.p1 === line2.p2 ||
        line1.p2 === line2.p1 ||
        line1.p2 === line2.p2
    ) {
        return null;
    }

    const denominator =
        (line1.p1.x - line1.p2.x) * (line2.p1.y - line2.p2.y) -
        (line1.p1.y - line1.p2.y) * (line2.p1.x - line2.p2.x);
    if (denominator === 0) {
        // Lines are parallel
        return null;
    }
    const ua =
        ((line1.p1.x - line2.p1.x) * (line2.p1.y - line2.p2.y) -
            (line1.p1.y - line2.p1.y) * (line2.p1.x - line2.p2.x)) /
        denominator;
    const ub =
        ((line1.p1.x - line2.p1.x) * (line1.p1.y - line1.p2.y) -
            (line1.p1.y - line2.p1.y) * (line1.p1.x - line1.p2.x)) /
        denominator;
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
        // Intersection is outside the line segments
        return null;
    }
    // Calculate the intersection point
    const intersection = {
        x: line1.p1.x + ua * (line1.p2.x - line1.p1.x),
        y: line1.p1.y + ua * (line1.p2.y - line1.p1.y),
        linesRatios: {
            [line1.id]: ua,
            [line2.id]: ub
        }
    };
    return intersection;
}

export function computeIntersections(knots: Knot[], interFlipIds: Set<string>) {
    const intersections: Intersection[] = [];
    const lines = knots
        .map((knot) =>
            getKnotLines({
                id: knot.id,
                points: knot.points,
                isClosed: knot.isClosed,
            })
        )
        .flat();
    for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j < lines.length; j++) {
            const linei = lines[i];
            const linej = lines[j];
            if (isStartingPoint(linei.p1) && isClosingPoint(linej.p2)) continue;
            const id = `inter-${linei.id}-${linej.id}`;
            const intersection = getIntersection(linei, linej);
            const isFlipped = interFlipIds.has(id);
            if (intersection) {
                const topLine = isFlipped ? linei : linej;
                const bottomLine = isFlipped ? linej : linei;
                intersections.push({
                    id,
                    topLineKnotId: topLine.knotId,
                    bottomLineKnotId: bottomLine.knotId,
                    topLine,
                    bottomLine,
                    point: intersection,
                    isFlipped,
                    isWithinKnot: topLine.knotId === bottomLine.knotId,
                });
            }
        }
    }
    return intersections;
}

export function getSvgCoords(event: MouseEvent, svg: SVGSVGElement): Coords2D | null {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
        const { x, y } = point.matrixTransform(ctm.inverse());
        return { x, y };
    }
    return null;
}

export function combineKnotPointsWithIntersections(knot: Knot, intersections: Intersection[]): KnotDiagramPoint[] {
    const knotId = knot.id;
    const knotIntersections = intersections.filter(
        (inter) =>
            inter.topLineKnotId === knotId || inter.bottomLineKnotId === knotId
    );
    let points: KnotDiagramPoint[] = [...knot.points];
    if (knot.isClosed && points.length > 2) {
        points.push(createClosingPoint(points, knot.id));
    }

    const getSpliceIndex = (inter: Intersection, isTop: boolean): number => {
        const line = isTop ? inter.topLine : inter.bottomLine;
        const inLineRatio = inter.point.linesRatios[line.id];
        let currentIndex = points.findIndex(p => p.id === line.p2.id);

        const isIntersectionAfterPoint = (intersection?: Intersection) => {
            if (!intersection) return false;
            return intersection.point.linesRatios[line.id] > inLineRatio;
        }

        while (isIntersectionAfterPoint(points[currentIndex - 1].intersection)) {
            currentIndex--;
        }
        return currentIndex;
    };
    for (let inter of knotIntersections) {
        const topId = `${inter.id}-top`;
        const bottomId = inter.id;
        if (inter.topLineKnotId === knotId) {
            const knotPointIndex = getSpliceIndex(inter, true);
            const interPoint = { ...inter.point, id: topId, intersectionParallelId: bottomId, intersection: inter, isTop: true, knotId };
            points.splice(knotPointIndex, 0, interPoint);
        }
        if (inter.bottomLineKnotId === knotId) {
            const knotPointIndex = getSpliceIndex(inter, false);
            const interPoint = { ...inter.point, id: bottomId, intersectionParallelId: topId, intersection: inter, isTop: false, knotId };
            points.splice(knotPointIndex, 0, interPoint);
        }
    }

    // add a point before and after every intersection
    for (let i = points.length - 1; i >= 0; i--) {
        if (points[i].intersection) {
            const prevPoint = points[i - 1] || points[points.length - 1];
            const nextPoint = points[i + 1] || points[0];
            const beforePoint: KnotDiagramPoint = {
                id: `pre-${points[i].id}`,
                x: (points[i].x + prevPoint.x) / 2,
                y: (points[i].y + prevPoint.y) / 2,
                isIntersectionSep: true,
                knotId: knot.id,
            }
            const afterPoint: KnotDiagramPoint = {
                id: `post-${points[i].id}`,
                x: (points[i].x + nextPoint.x) / 2,
                y: (points[i].y + nextPoint.y) / 2,
                isIntersectionSep: true,
                knotId: knot.id,
            }
            points.splice(i + 1, 0, afterPoint);
            points.splice(i, 0, beforePoint);
        }
    }
    return points;
}

function getIntersectionOrientationSign(intersection: Intersection) {
    const v1x = intersection.topLine.p2.x - intersection.topLine.p1.x
    const v1y = intersection.topLine.p2.y - intersection.topLine.p1.y
    const v2x = intersection.bottomLine.p2.x - intersection.bottomLine.p1.x
    const v2y = intersection.bottomLine.p2.y - intersection.bottomLine.p1.y

    return Math.sign(v1x * v2y - v1y * v2x)
}

export function getSurfaceLoops(points: KnotDiagramPoint[]) {
    if (new Set(points.map(p => p.id)).size < points.length) {
        throw new Error("points must have unique ids");
    }
    const surfaceLoops: KnotDiagramPoint[][] = [];
    const visited = new Set<string>();

    const startPoint = points[0];
    if (!startPoint) return surfaceLoops;

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
                    if (interBottoms.length > 0) {
                        surfaceLoops.push(interBottoms);
                        surfaceLoops.push(loop.filter(p => !interBottoms.includes(p)));
                    } else {
                        surfaceLoops.push(loop);
                    }
                }
            }
        }
    }

    return surfaceLoops;
}

export function getLoopSurfaceTriangles(points: KnotDiagramPoint[], to3D: (p: KnotDiagramPoint, i: number) => [number, number, number]) {
    if (points.length < 3) return [];
    const filteredPoints = points;
    const points3D = filteredPoints.map(p => to3D(p, filteredPoints.indexOf(p)));
    const points2D = points3D.map(([x, _z, y]) => ([x, y]));
    const cut = Earcut.triangulate(points2D.flat(), [], 2);
    const triangles: [number, number, number][][] = [];
    for (let i = 0; i < cut.length; i += 3) {
        triangles.push([
            points3D[cut[i]],
            points3D[cut[i + 1]],
            points3D[cut[i + 2]],
            points3D[cut[i]],
        ]);
    }
    return triangles;
}

export function findPointSurfaceIndex(surfaces: KnotDiagramPoint[][], point: KnotDiagramPoint) {
    return surfaces.findIndex(s => s.some(sp => sp.id === point.id && sp.knotId === point.knotId));
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
            ]);
        }
    }
    return intersectionTriangles;
}
