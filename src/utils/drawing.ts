import type { Coords2D, DiagramKnot, DrawingData, Intersection, Knot, DiagramPoint, Line, Point } from "../components/types";

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

function getIntersection(line1: Line, line2: Line) {
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

export function combineKnotPointsWithIntersections(knot: Knot, intersections: Intersection[]): DiagramPoint[] {
    const knotId = knot.id;
    const knotIntersections = intersections.filter(
        (inter) =>
            inter.topLineKnotId === knotId || inter.bottomLineKnotId === knotId
    );
    let points: DiagramPoint[] = [...knot.points];
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
            const beforePoint: DiagramPoint = {
                id: `pre-${points[i].id}`,
                x: (points[i].x + prevPoint.x) / 2,
                y: (points[i].y + prevPoint.y) / 2,
                isIntersectionSep: true,
                knotId: knot.id,
            }
            const afterPoint: DiagramPoint = {
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
