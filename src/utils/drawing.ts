import type { Coords2D, Intersection, Knot, KnotDiagramPoint, Line, Point } from "../components/types";

const CLOSING_POINT_ID = 'closing-point';

function createClosingPoint<T extends Point>(points: T[]): T {
    return { ...points[0], id: CLOSING_POINT_ID }
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
        const p2 = createClosingPoint(knot.points);
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
            if (i === 0 && linej.p2.id === CLOSING_POINT_ID) continue;
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
        points.push(createClosingPoint(points));
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
            const interPoint = { ...inter.point, id: topId, intersectionParallelId: bottomId, intersection: inter, isTop: true };
            points.splice(knotPointIndex, 0, interPoint);
        }
        if (inter.bottomLineKnotId === knotId) {
            const knotPointIndex = getSpliceIndex(inter, false);
            const interPoint = { ...inter.point, id: bottomId, intersectionParallelId: topId, intersection: inter, isTop: false };
            points.splice(knotPointIndex, 0, interPoint);
        }
    }
    return points;
}

function getNextPointForSurfaceLoops(points: KnotDiagramPoint[], point: KnotDiagramPoint): KnotDiagramPoint | null {
    const index = points.findIndex(p => p.id === point.id);
    if (!point.intersection) return points[index + 1] || points[0];
    if (point.intersection.topLine.id === point.intersection.bottomLine.id) return points[index + 1] || points[0];

    // It's an intersection point
    const parallelIndex = points.findIndex(p => p.id === point.intersectionParallelId);
    if (parallelIndex === -1) {
        throw new Error(`cannot find parallel for ${point.intersection.id}`)
    };
    return points[parallelIndex + 1];
}

export function getSurfaceLoopsForKnot(points: KnotDiagramPoint[]) {
    const surfaceLoops: KnotDiagramPoint[][] = [];
    const visited = new Set<string>();

    const startPoint = points[0];
    if (!startPoint) return surfaceLoops;

    const findLoop = (currentPoint: KnotDiagramPoint, loop: KnotDiagramPoint[]) => {
        loop.push(currentPoint);
        visited.add(currentPoint.id);

        const nextPoint = getNextPointForSurfaceLoops(points, currentPoint);
        if (nextPoint && !visited.has(nextPoint.id)) {
            findLoop(nextPoint, loop);
        }
    };

    for (const point of points) {
        if (!visited.has(point.id)) {
            const loop: KnotDiagramPoint[] = [];
            findLoop(point, loop);
            if (loop.length > 0) {
                surfaceLoops.push(loop);
            }
        }
    }

    return surfaceLoops;
}

export function getLoopSurfaceTriangles(points: [number, number, number][]) {
    if (points.length < 3) return [];
    const triangles = [];
    let index1 = 0;
    let index2 = points.length - 2;
    let advanceIndex1 = true;
    while (index1 !== index2) {
        triangles.push([
            points[index1],
            points[index2],
            points[advanceIndex1 ? index1 + 1 : index2 - 1],
            points[index1],
        ]);
        if (advanceIndex1) index1++;
        else index2--;
    }
    return triangles;
}