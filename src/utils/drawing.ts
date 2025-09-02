import type { Coords2D, Intersection, Knot, Line, Point } from "../components/types";

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
        const p2 = knot.points[0];
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

export function combineKnotPointsWithIntersections(knot: Knot, intersections: Intersection[]) {
    const knotId = knot.id;
    const knotIntersections = intersections.filter(
        (inter) =>
            inter.topLineKnotId === knotId || inter.bottomLineKnotId === knotId
    );
    let points: (Coords2D & { id?: string, intersection?: Intersection, isTop?: boolean })[] = [...knot.points];
    if (knot.isClosed && points.length > 2) {
        points.push({ ...points[0] });
    }
    const getSpliceIndex = (line: Line) => {
        const p1Index = points.findIndex(p => p.id === line.p1.id);
        const p2Index = points.findIndex(p => p.id === line.p2.id);
        return Math.max(p1Index, p2Index);
    }
    for (let inter of knotIntersections) {
        if (inter.topLineKnotId === knotId) {
            const knotPointIndex = getSpliceIndex(inter.topLine)
            const interPoint = { ...inter.point, id: inter.id, intersection: inter, isTop: true };
            points.splice(knotPointIndex, 0, interPoint);
        }
        if (inter.bottomLineKnotId === knotId) {
            const knotPointIndex = getSpliceIndex(inter.bottomLine)
            const interPoint = { ...inter.point, id: inter.id, intersection: inter, isTop: false };
            points.splice(knotPointIndex, 0, interPoint);
        }
    }
    return points;
}

// export function getKnotPlaneData(knot: Knot, interFlipIds: Set<string>) {
//     if (knot.points.length < 3 || !knot.isClosed) return null;
//     const points = [...knot.points];
//     const intersections = computeIntersections([knot], interFlipIds);
// }
