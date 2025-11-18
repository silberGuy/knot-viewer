import type { Coords2D, Intersection, Knot, DiagramPoint, Line, Point } from "../components/types";

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
    let resultPoints: DiagramPoint[] = [];

    const pointsToAdd = knotIntersections.map(inter => {
        const topId = `${inter.id}-top`;
        const bottomId = inter.id;

        const thisIntersectionPoints: { lineStartId: string; points: DiagramPoint[] }[] = [];
        if (inter.topLineKnotId === knotId) {
            const line = inter.topLine;
            thisIntersectionPoints.push({
                lineStartId: line.p1.id,
                points: [
                    { id: `pre-${topId}`, x: (inter.point.x + line.p1.x) / 2, y: (inter.point.y + line.p1.y) / 2, isIntersectionSep: true, knotId },
                    { ...inter.point, id: topId, intersectionParallelId: bottomId, intersection: inter, isTop: true, knotId },
                    { id: `post-${topId}`, x: (inter.point.x + line.p2.x) / 2, y: (inter.point.y + line.p2.y) / 2, isIntersectionSep: true, knotId },
                ]
            })
        }
        if (inter.bottomLineKnotId === knotId) {
            const line = inter.bottomLine;
            thisIntersectionPoints.push({
                lineStartId: line.p1.id,
                points: [
                    { id: `pre-${bottomId}`, x: (inter.point.x + line.p1.x) / 2, y: (inter.point.y + line.p1.y) / 2, isIntersectionSep: true, knotId },
                    { ...inter.point, id: bottomId, intersectionParallelId: topId, intersection: inter, isTop: false, knotId },
                    { id: `post-${bottomId}`, x: (inter.point.x + line.p2.x) / 2, y: (inter.point.y + line.p2.y) / 2, isIntersectionSep: true, knotId },
                ]
            })
        }
        return thisIntersectionPoints;
    }).flat();

    for (let i = 0; i < knot.points.length; i++) {
        const point = knot.points[i];
        resultPoints.push(point);

        const pointsAfterPoint = pointsToAdd.filter(({ lineStartId }) => lineStartId === point.id).map(({ points }) => points).flat().sort((a, b) => {
            const aDist = Math.hypot(a.x - point.x, a.y - point.y);
            const bDist = Math.hypot(b.x - point.x, b.y - point.y);
            return aDist - bDist;
        });
        resultPoints.push(...pointsAfterPoint);
    }

    if (knot.isClosed && resultPoints.length > 2) {
        resultPoints.push(createClosingPoint(resultPoints, knot.id));
    }

    return resultPoints;
}
