import type { Loop, Line, Point } from "../components/types";

function getLineId(prefix: string, p1: Point, p2: Point): string {
    return [prefix, p1.id, p2.id].join("-");
}

export function getLoopLines(loop: Loop): Line[] {
    if (loop.points.length < 2) return [];
    const linePoints: Line[] = [];
    for (let i = 0; i < loop.points.length - 1; i++) {
        const p1 = loop.points[i];
        const p2 = loop.points[i + 1];
        linePoints.push({ id: getLineId(loop.id, p1, p2), p1, p2, loopId: loop.id });
    }
    if (loop.isClosed && loop.points.length > 2) {
        // Close the loop
        const p1 = loop.points[loop.points.length - 1];
        const p2 = loop.points[0];
        linePoints.push({ id: getLineId(loop.id, p1, p2), p1, p2, loopId: loop.id });
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

export function computeIntersections(loops: Loop[], interFlipIds: Set<string>) {
    const intersections = [];
    const lines = loops
        .map((loop) =>
            getLoopLines({
                id: loop.id,
                points: loop.points,
                isClosed: loop.isClosed,
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
                    topLineLoopId: topLine.loopId,
                    bottomLineLoopId: bottomLine.loopId,
                    topLine,
                    bottomLine,
                    point: intersection,
                    topLinePoints: [topLine.p1, topLine.p2],
                    bottomLinePoints: [bottomLine.p1, bottomLine.p2],
                });
            }
        }
    }
    return intersections;
}
