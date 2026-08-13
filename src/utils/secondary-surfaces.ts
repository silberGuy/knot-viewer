import { Ray, Vector3 } from "three";
import { Earcut } from "three/src/extras/Earcut.js";
import type { Coords2D, CrossingWalkDirection, CrossingWalkDirections, Knot3D, Point3D, SecondaryLoop, SecondaryTriangle, SecondariesKnot, SecondariesPoint, Triangle3D } from "../components/types";
import { isClosingPoint } from "./drawing";

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

// A segment nearly parallel to a triangle's plane has no well-defined single crossing point -
// the ray-triangle math divides by how steeply the segment crosses the plane, which is
// numerically unstable near-parallel and can return a wildly displaced point instead of
// correctly finding nothing. Wall triangles are built to share a vertex or edge with the knot
// triangle they're tested against (ADR 0008), which routinely puts some of their edges close to
// lying in that triangle's plane, so this guard matters here in practice, not just in theory.
const PARALLEL_EPSILON = Math.sin(0.1 * Math.PI / 180);

// Where does the (bounded) segment p1->p2 cross triangle's plane, within the triangle itself?
// Generic over bare coordinate triples so it isn't tied to knots or any particular surface (ADR
// 0008) - getTriangleLineIntersection below is the Point3D/Triangle3D-typed wrapper other code
// here needs for knot-walk bookkeeping.
function getRawTriangleLineIntersection(
    triangle: SecondaryTriangle,
    p1: [number, number, number],
    p2: [number, number, number],
): [number, number, number] | null {
    const [A, B, C] = triangle.map((c) => new Vector3(...c));
    const P1 = new Vector3(...p1);
    const P2 = new Vector3(...p2);
    const lineDir = new Vector3().subVectors(P2, P1);

    const normal = new Vector3().subVectors(B, A).cross(new Vector3().subVectors(C, A)).normalize();
    const dirNormalized = lineDir.clone().normalize();
    if (Math.abs(dirNormalized.dot(normal)) < PARALLEL_EPSILON) return null;

    const ray = new Ray(P1, lineDir);

    const intersection = ray.intersectTriangle(A, B, C, false, new Vector3());
    if (!intersection) return null;

    const t = intersection.clone().sub(P1).dot(lineDir) / lineDir.lengthSq();
    if (t < 0 || t > 1) return null;

    return [intersection.x, intersection.y, intersection.z];
}

function getTriangleLineIntersection(triangle: Triangle3D, line: [Point3D, Point3D]) {
    const triangleCoords = triangle.points.map((p) => p.coords) as SecondaryTriangle;
    return getRawTriangleLineIntersection(triangleCoords, line[0].coords, line[1].coords);
}

function deduplicatePoints(points: SecondariesPoint[], epsilon = 0.01) {
    const unique: SecondariesPoint[] = [];

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

function getTrianglesIntersectionsAsymmetric(triangle1: Triangle3D, triangle2: Triangle3D, knots: Knot3D[]): SecondariesPoint[] {
    const intersections: SecondariesPoint[] = [];

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
                id: `secondary-inter-${p1.diagramPoint.id}-${p2.diagramPoint.id}-${triangle2.id}`,
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

function getTrianglesIntersections(triangle1: Triangle3D, triangle2: Triangle3D, knots: Knot3D[]): SecondariesPoint[] {
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

function injectSecondaryIntersectionsIntoKnot(knot: Knot3D, pointsToAdd: SecondariesPoint[]): SecondariesKnot {
    const resultPoints: SecondariesPoint[] = [];
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

export function getKnotsSurfacesIntersections(knots: Knot3D[]): SecondariesPoint[] {
    const intersections = new Set<SecondariesPoint>();

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

export function combineKnotsWithSurfaceIntersections(knots: Knot3D[]): SecondariesKnot[] {
    const pointsToAdd = getKnotsSurfacesIntersections(knots);
    const knotsWithSecondaryPoints = knots.map(knot => injectSecondaryIntersectionsIntoKnot(knot, pointsToAdd));
    return knotsWithSecondaryPoints;
}

// Order-independent id for a crossing (same for both of its points) - used to key
// CrossingWalkDirections by crossing, not by point.
export function getCrossingId(point: SecondariesPoint): string | undefined {
    const twinPointId = point.surfaceIntersection?.twinPointId;
    if (!twinPointId) return undefined;
    return [point.id, twinPointId].sort().join("::");
}

// Seeds every crossing with DEFAULT_CROSSING_WALK_DIRECTION.
export function getDefaultCrossingWalkDirections(knots: Knot3D[]): CrossingWalkDirections {
    const knotsWithSecondaryPoints = combineKnotsWithSurfaceIntersections(knots);
    const directions: CrossingWalkDirections = new Map();
    for (const knot of knotsWithSecondaryPoints) {
        for (const point of knot.points) {
            const crossingId = getCrossingId(point);
            if (crossingId && !directions.has(crossingId)) {
                directions.set(crossingId, DEFAULT_CROSSING_WALK_DIRECTION);
            }
        }
    }
    return directions;
}

function stepIndex(index: number, direction: 1 | -1, length: number) {
    return (index + direction + length) % length;
}

export function directionToStep(direction: CrossingWalkDirection): 1 | -1 {
    return direction === "lowerBackward" || direction === "upperBackward" ? -1 : 1;
}

export function directionToRole(direction: CrossingWalkDirection): "lower" | "upper" {
    return direction === "lowerForward" || direction === "lowerBackward" ? "lower" : "upper";
}

// The constructor counterpart to directionToRole/directionToStep - builds a direction from
// its parts instead of decomposing an existing one.
export function directionFromRoleAndStep(role: "lower" | "upper", step: 1 | -1): CrossingWalkDirection {
    if (role === "lower") return step === 1 ? "lowerForward" : "lowerBackward";
    return step === 1 ? "upperForward" : "upperBackward";
}

// Arbitrary but fixed default (see ADR 0003); user-overridable per crossing.
const DEFAULT_CROSSING_WALK_DIRECTION: CrossingWalkDirection = "upperForward";

// ---- The walk itself -------------------------------------------------------------------
// An explicit state machine: advance() = next step, runWalk() = stop condition,
// getWalkStart() = origin.

// Current point (knot + index) and step direction. justArrivedViaJump is true for exactly
// one state - right after landing on a twin - so that landing point doesn't re-resolve the
// same crossing and jump straight back where it came from.
type WalkState = {
    knot: SecondariesKnot;
    pointIndex: number;
    step: 1 | -1;
    justArrivedViaJump: boolean;
};

function currentPoint(state: WalkState): SecondariesPoint {
    return state.knot.points[state.pointIndex];
}

// Next state: resolves the current point's crossing direction if it has one (unless this
// is a jump landing), else just steps forward. undefined only on inconsistent data (twin
// knot not found) - the caller treats that as "stop".
function advance(
    state: WalkState,
    knotsWithSecondaryPoints: SecondariesKnot[],
    crossingWalkDirections: CrossingWalkDirections,
): WalkState | undefined {
    const point = currentPoint(state);
    const crossingId = state.justArrivedViaJump ? undefined : getCrossingId(point);

    if (!crossingId) {
        return {
            ...state,
            pointIndex: stepIndex(state.pointIndex, state.step, state.knot.points.length),
            justArrivedViaJump: false,
        };
    }

    const direction = crossingWalkDirections.get(crossingId) ?? DEFAULT_CROSSING_WALK_DIRECTION;
    const step = directionToStep(direction);

    if (directionToRole(direction) === getCrossingRole(point)) {
        return {
            knot: state.knot,
            pointIndex: stepIndex(state.pointIndex, step, state.knot.points.length),
            step,
            justArrivedViaJump: false,
        };
    }

    const twinPointId = point.surfaceIntersection!.twinPointId!;
    const twinKnot = knotsWithSecondaryPoints.find(k => k.points.some(p => p.id === twinPointId));
    if (!twinKnot) {
        console.error('Could not find twin knot for point', point);
        return undefined;
    }
    const twinPointIndex = twinKnot.points.findIndex(p => p.id === twinPointId);
    return { knot: twinKnot, pointIndex: twinPointIndex, step, justArrivedViaJump: true };
}

// Walks from `start` until it revisits a point or the data runs out. isClosed is true only if
// the point it revisits is its own start point - not just any already-visited point (see
// CONTEXT.md's "Secondary loop").
function runWalk(
    start: WalkState,
    knotsWithSecondaryPoints: SecondariesKnot[],
    crossingWalkDirections: CrossingWalkDirections,
): { points: SecondariesPoint[]; isClosed: boolean } {
    const points: SecondariesPoint[] = [];
    const visitedIds = new Set<string>();

    let state: WalkState | undefined = start;
    while (state) {
        const point = currentPoint(state);
        if (!point || visitedIds.has(point.id)) {
            return { points, isClosed: point?.id === points[0]?.id };
        }
        points.push(point);
        visitedIds.add(point.id);
        state = advance(state, knotsWithSecondaryPoints, crossingWalkDirections);
    }

    return { points, isClosed: false };
}

// Starting point is never user-facing (a closed loop has no beginning) *unless* the user
// explicitly picked one by clicking a point on the Secondary board (selectedStartPointId,
// found forward from - see "Going forward on a knot"). Absent that, any crossing works as an
// anchor - the lowest crossing id, for a stable result. Starts on whichever of the anchor's
// two points (see getCrossingRole) its own resolved direction targets - a fixed choice, not
// "whichever knot happens to be found first" (see ADR 0003). Falls back to a fixed first
// point when there are no crossings to anchor on either.
function getWalkStart(
    knotsWithSecondaryPoints: SecondariesKnot[],
    crossingWalkDirections: CrossingWalkDirections,
    selectedStartPointId?: string,
): WalkState {
    if (selectedStartPointId) {
        for (const knot of knotsWithSecondaryPoints) {
            const pointIndex = knot.points.findIndex(p => p.id === selectedStartPointId);
            if (pointIndex !== -1) return { knot, pointIndex, step: 1, justArrivedViaJump: false };
        }
    }

    const crossingIds = new Set<string>();
    for (const knot of knotsWithSecondaryPoints) {
        for (const point of knot.points) {
            const crossingId = getCrossingId(point);
            if (crossingId) crossingIds.add(crossingId);
        }
    }

    if (crossingIds.size > 0) {
        const anchorId = [...crossingIds].sort()[0];
        const direction = crossingWalkDirections.get(anchorId) ?? DEFAULT_CROSSING_WALK_DIRECTION;
        const step = directionToStep(direction);
        const targetRole = directionToRole(direction);

        for (const knot of knotsWithSecondaryPoints) {
            const pointIndex = knot.points.findIndex(
                p => getCrossingId(p) === anchorId && getCrossingRole(p) === targetRole,
            );
            if (pointIndex === -1) continue;
            return { knot, pointIndex, step, justArrivedViaJump: false };
        }
    }

    return { knot: knotsWithSecondaryPoints[0], pointIndex: 0, step: 1, justArrivedViaJump: false };
}

export function getSecondaryIntersectionsLoop(
    knots: Knot3D[],
    crossingWalkDirections: CrossingWalkDirections = new Map(),
    selectedStartPointId?: string,
): SecondaryLoop {
    if (knots.length === 0) {
        return { id: 'secondary-empty', points: [], isClosed: true };
    }

    const knotsWithSecondaryPoints = combineKnotsWithSurfaceIntersections(knots);
    const start = getWalkStart(knotsWithSecondaryPoints, crossingWalkDirections, selectedStartPointId);
    const { points: walkedPoints, isClosed } = runWalk(start, knotsWithSecondaryPoints, crossingWalkDirections);

    return {
        id: `secondary-${knots.map(k => k.diagramKnot.id).join('_')}`,
        isClosed,
        // Nudged slightly off of the knots' own lines so the overlay doesn't sit exactly
        // on top of them.
        points: walkedPoints.map(point => ({
            ...point,
            coords: [point.coords[0], point.coords[1] + 1.5, point.coords[2]] as [number, number, number],
        })),
    };
}

// Diagram points keep their 2D position; crossing points project from 3D (x/z -> x/y,
// mirroring get3DKnots in diagram.ts).
export function projectSecondariesPoint(point: SecondariesPoint): { x: number; y: number } {
    return point.diagramPoint
        ? { x: point.diagramPoint.x, y: point.diagramPoint.y }
        : { x: point.coords[0], y: point.coords[2] };
}

type ArrowLine = { p1: { x: number; y: number }; p2: { x: number; y: number } };

export type CrossingWalkArrow = {
    crossingId: string;
    // Intersection.point - not a loop point's projected position (see getCrossingWalkArrows).
    position: { x: number; y: number };
    currentDirection: CrossingWalkDirection;
    // The knot lines the crossing's "lower"/"upper" role options point along (see
    // CrossingWalkArrow.vue) - p1 is always the forward end (see "Going forward on a knot"
    // in CONTEXT.md).
    topLine: ArrowLine;
    bottomLine: ArrowLine;
};

export const ALL_DIRECTIONS: CrossingWalkDirection[] = ["lowerForward", "lowerBackward", "upperForward", "upperBackward"];

// The real 2D Intersection this crossing's edge touches, if any - some crossings come from
// a bridging triangle's far edge instead (see CONTEXT.md's "Crossing point") and have none.
// isWithinKnot excluded: that's a knot's own self-crossing, not a between-knot one.
function findRealIntersection(surfaceIntersection: NonNullable<SecondariesPoint["surfaceIntersection"]>) {
    const fromP1 = surfaceIntersection.lineP1.diagramPoint.intersection;
    if (fromP1 && !fromP1.isWithinKnot) return fromP1;
    const fromP2 = surfaceIntersection.lineP2.diagramPoint.intersection;
    if (fromP2 && !fromP2.isWithinKnot) return fromP2;
    return undefined;
}

// A crossing point's fixed lower/upper side, independent of walk position (see ADR 0003).
// Reuses the drawn over/under (topLineKnotId/bottomLineKnotId) at a real intersection;
// otherwise falls back to a fixed id tie-break (no user-facing arrow there anyway).
export function getCrossingRole(point: SecondariesPoint): "lower" | "upper" | undefined {
    const surfaceIntersection = point.surfaceIntersection;
    const twinPointId = surfaceIntersection?.twinPointId;
    if (!surfaceIntersection || !twinPointId) return undefined;

    const realIntersection = findRealIntersection(surfaceIntersection);
    if (realIntersection) {
        if (surfaceIntersection.triangle.knotId === realIntersection.bottomLineKnotId) return "lower";
        if (surfaceIntersection.triangle.knotId === realIntersection.topLineKnotId) return "upper";
    }

    return point.id < twinPointId ? "lower" : "upper";
}

// One arrow per crossing across every knot that sits at a real 2D intersection - not just
// ones the currently displayed loop happens to pass through (CrossingWalkArrow.vue tells the
// two apart via its own walkPoints lookup, and styles off-loop ones differently) - positioned
// at that intersection's own point (fixed, unlike either of the crossing's two
// SecondariesPoints), and carrying that intersection's own topLine/bottomLine geometry -
// CrossingWalkArrow.vue derives the arrival direction (see CONTEXT.md), which options to
// exclude, and the facing angle from these directly. Crossings not at a real intersection
// still resolve (via their default) but get no arrow.
export function getCrossingWalkArrows(
    knotsWithSecondaryPoints: SecondariesKnot[],
    crossingWalkDirections: CrossingWalkDirections,
): CrossingWalkArrow[] {
    const arrows: CrossingWalkArrow[] = [];
    const seenCrossingIds = new Set<string>();

    for (const knot of knotsWithSecondaryPoints) {
        for (const point of knot.points) {
            const crossingId = getCrossingId(point);
            if (!crossingId || seenCrossingIds.has(crossingId)) continue;
            seenCrossingIds.add(crossingId);
            const realIntersection = point.surfaceIntersection && findRealIntersection(point.surfaceIntersection);
            if (!realIntersection) continue;

            arrows.push({
                crossingId,
                position: { x: realIntersection.point.x, y: realIntersection.point.y },
                currentDirection: crossingWalkDirections.get(crossingId) ?? DEFAULT_CROSSING_WALK_DIRECTION,
                topLine: {
                    p1: { x: realIntersection.topLine.p1.x, y: realIntersection.topLine.p1.y },
                    p2: { x: realIntersection.topLine.p2.x, y: realIntersection.topLine.p2.y },
                },
                bottomLine: {
                    p1: { x: realIntersection.bottomLine.p1.x, y: realIntersection.bottomLine.p1.y },
                    p2: { x: realIntersection.bottomLine.p2.x, y: realIntersection.bottomLine.p2.y },
                },
            });
        }
    }

    return arrows;
}

export function getSurfaceIntersectionsPairs(intersections: SecondariesPoint[]): [SecondariesPoint, SecondariesPoint][] {
    const pairs: [SecondariesPoint, SecondariesPoint][] = [];
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


// Segment (not infinite-line) intersection, inclusive of the two segments merely touching at an
// endpoint - a cap boundary counts as self-intersecting either way (CONTEXT.md's "Cap shift"): two
// loop points sharing a coordinate is as much a self-intersection as two shifted lines truly
// crossing through each other. Null for parallel lines or a crossing outside either segment.
function segmentIntersection(a1: Coords2D, a2: Coords2D, b1: Coords2D, b2: Coords2D): Coords2D | null {
    const denominator = (a1.x - a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x - b2.x);
    if (denominator === 0) return null;
    const ua = ((a1.x - b1.x) * (b1.y - b2.y) - (a1.y - b1.y) * (b1.x - b2.x)) / denominator;
    const ub = ((a1.x - b1.x) * (a1.y - a2.y) - (a1.y - b1.y) * (a1.x - a2.x)) / denominator;
    const epsilon = 1e-9;
    if (ua < -epsilon || ua > 1 + epsilon || ub < -epsilon || ub > 1 + epsilon) return null;
    return { x: a1.x + ua * (a2.x - a1.x), y: a1.y + ua * (a2.y - a1.y) };
}

// The first pair of non-adjacent edges in `boundary` (a closed, ordered ring) that intersect, if
// any - adjacent edges share a real vertex by construction, not a self-intersection.
function findBoundarySelfIntersection(boundary: Coords2D[]): { edgeA: number; edgeB: number; point: Coords2D } | undefined {
    const n = boundary.length;
    for (let edgeA = 0; edgeA < n; edgeA++) {
        for (let edgeB = edgeA + 1; edgeB < n; edgeB++) {
            if (edgeB === edgeA + 1 || (edgeA === 0 && edgeB === n - 1)) continue;
            const point = segmentIntersection(boundary[edgeA], boundary[(edgeA + 1) % n], boundary[edgeB], boundary[(edgeB + 1) % n]);
            if (point) return { edgeA, edgeB, point };
        }
    }
    return undefined;
}

// Splits `boundary` wherever it self-intersects (see findBoundarySelfIntersection), inserting the
// found point to close each resulting simple sub-boundary - cap rendering only (ADR 0007); the
// wall is never aware of these inserted points. Recurses for more than one self-intersection.
function splitSelfIntersectingBoundary(boundary: Coords2D[]): Coords2D[][] {
    const hit = findBoundarySelfIntersection(boundary);
    if (!hit) return [boundary];

    const { edgeA, edgeB, point } = hit;
    const arcA = [point, ...boundary.slice(edgeA + 1, edgeB + 1)];
    const arcB = [point, ...boundary.slice(edgeB + 1), ...boundary.slice(0, edgeA + 1)];
    return [
        ...splitSelfIntersectingBoundary(arcA),
        ...splitSelfIntersectingBoundary(arcB),
    ];
}

// Right-hand normal of `from -> to`, in this plane's own coordinates (see projectSecondariesPoint).
function getRightNormal(from: Coords2D, to: Coords2D): Coords2D {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    return length === 0 ? { x: 0, y: 0 } : { x: dy / length, y: -dx / length };
}

function translateBy(point: Coords2D, normal: Coords2D, distance: number): Coords2D {
    return { x: point.x + normal.x * distance, y: point.y + normal.y * distance };
}

// Unlike drawing.ts's getIntersection, unbounded - cap shift's miter corners routinely fall
// outside either original segment. Null for parallel lines.
function intersectInfiniteLines(a1: Coords2D, a2: Coords2D, b1: Coords2D, b2: Coords2D): Coords2D | null {
    const denominator = (a1.x - a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x - b2.x);
    if (denominator === 0) return null;
    const ua = ((a1.x - b1.x) * (b1.y - b2.y) - (a1.y - b1.y) * (b1.x - b2.x)) / denominator;
    return { x: a1.x + ua * (a2.x - a1.x), y: a1.y + ua * (a2.y - a1.y) };
}

// Cap shift (CONTEXT.md, ADR 0007): moves `curr` to where its two adjacent lines, each shifted
// `distance` along its own right normal, now cross. Falls back to a plain translation when the
// two lines are parallel (e.g. collinear neighbors) and so never cross.
function shiftCapPoint(prev: Coords2D, curr: Coords2D, next: Coords2D, distance: number): Coords2D {
    const normalIn = getRightNormal(prev, curr);
    const normalOut = getRightNormal(curr, next);
    const cross = normalIn.x * normalOut.y - normalIn.y * normalOut.x;
    if (Math.abs(cross) < 1e-6) return translateBy(curr, normalIn, distance);

    const inA = translateBy(prev, normalIn, distance);
    const inB = translateBy(curr, normalIn, distance);
    const outA = translateBy(curr, normalOut, distance);
    const outB = translateBy(next, normalOut, distance);
    return intersectInfiniteLines(inA, inB, outA, outB)!;
}

// A knot's own closing point (drawing.ts's isClosingPoint) always duplicates that knot's first
// point in this walk, coincident with it - not a genuine extra corner - so cap/wall geometry
// drops it rather than treating it as a second corner right on top of the first.
function getCapLoopPoints(loop: SecondaryLoop): SecondariesPoint[] {
    return loop.points.filter((point) => !isClosingPoint(point));
}

// How far apart to nudge a Zigzag's coincident pair (see nudgeZigzagBoundary below). Tune here.
const ZIGZAG_NUDGE_DISTANCE = 10;

// Coordinate-coincidence epsilon for matching a Zigzag's pair - bigger than float noise, smaller
// than any real geometry (matches arePointsClose/isPointBetweenPoints's 0.01 elsewhere in this file).
const ZIGZAG_MATCH_EPSILON = 0.01;

function coordsDistance(a: Coords2D, b: Coords2D): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

// `index`'s two boundary neighbors, split into whichever continues along its own knot's line
// ("outward" - the nudge direction) and whichever is itself a Crossing point, i.e. part of the
// short run between the ordinary Intersection point and the Crossing point coincident with it
// ("cluster").
function getZigzagNeighbors(points: SecondariesPoint[], index: number) {
    const n = points.length;
    const nextIndex = (index + 1) % n;
    const prevIndex = (index - 1 + n) % n;
    return points[nextIndex].diagramPoint
        ? { outwardIndex: nextIndex, clusterPoint: points[prevIndex] }
        : { outwardIndex: prevIndex, clusterPoint: points[nextIndex] };
}

function normalize(v: Coords2D): Coords2D {
    const length = Math.hypot(v.x, v.y);
    return length === 0 ? { x: 0, y: 0 } : { x: v.x / length, y: v.y / length };
}

// Separates an ordinary diagram Intersection point from the Crossing point landing on top of it (a
// Zigzag, CONTEXT.md) - left coincident, they break the cap's triangulation, the wall's intersection
// tests, and cap shift. Moves the "lower" role's point toward its own knot's line, "upper" the same
// distance opposite - either point can end up playing either role (see getCrossingRole). Runs before
// cap shift, which then treats the result as ordinary input. Skips within-knot self-crossings (a
// Zigzag only happens between two different knots) and plain un-pierced duplicates (ADR 0004 - no
// Crossing point to find there, so this simply won't match).
function nudgeZigzagBoundary(points: SecondariesPoint[], flattened: Coords2D[]): Coords2D[] {
    const nudged = [...flattened];

    for (let i = 0; i < points.length; i++) {
        const diagramPoint = points[i].diagramPoint;
        const intersection = diagramPoint?.intersection;
        if (!diagramPoint || !intersection || intersection.isWithinKnot) continue;

        const j = points.findIndex((p, index) =>
            index !== i && !p.diagramPoint && coordsDistance(flattened[index], flattened[i]) < ZIGZAG_MATCH_EPSILON,
        );
        if (j === -1) continue;

        const [lowerIndex, upperIndex] = diagramPoint.knotId === intersection.bottomLineKnotId ? [i, j] : [j, i];
        const { outwardIndex, clusterPoint } = getZigzagNeighbors(points, lowerIndex);
        // The Crossing point coincident with lowerIndex should itself be a cluster neighbor (that's
        // exactly how this pair was found) - if neither of lowerIndex's own boundary neighbors is a
        // Crossing point, something else is going on; leave it alone rather than guess a direction.
        if (clusterPoint.diagramPoint) continue;

        const direction = normalize({
            x: flattened[outwardIndex].x - flattened[lowerIndex].x,
            y: flattened[outwardIndex].y - flattened[lowerIndex].y,
        });

        nudged[lowerIndex] = translateBy(flattened[lowerIndex], direction, ZIGZAG_NUDGE_DISTANCE);
        nudged[upperIndex] = translateBy(flattened[upperIndex], direction, -ZIGZAG_NUDGE_DISTANCE);
    }

    return nudged;
}

// The cap's boundary shifted by `distance` (CONTEXT.md's "Cap shift"), keyed by point id so both
// getSecondaryCapTriangles and getSecondaryWallTriangles (both walking the raw loop) can look up
// their own points' shifted position - each point using its own real (raw loop) neighbors. Any
// self-touching this produces or resolves is handled separately, by getSecondaryCapTriangles
// alone (ADR 0007) - shifting itself doesn't need to know about it. Zigzags (CONTEXT.md) are
// separated first (nudgeZigzagBoundary), before shifting ever sees the boundary.
export function getShiftedCapBoundary(loop: SecondaryLoop, distance: number): Map<string, Coords2D> {
    const points = getCapLoopPoints(loop);
    const flattened = nudgeZigzagBoundary(points, points.map(projectSecondariesPoint));
    const shifted = new Map<string, Coords2D>();
    for (let i = 0; i < points.length; i++) {
        if (points.length < 3) {
            shifted.set(points[i].id, flattened[i]);
            continue;
        }
        const prev = flattened[(i - 1 + points.length) % points.length];
        const next = flattened[(i + 1) % points.length];
        shifted.set(points[i].id, shiftCapPoint(prev, flattened[i], next, distance));
    }
    return shifted;
}

// Triangulates the cap: looks up each loop point's shifted position, splits wherever the
// *shifted* boundary self-intersects (splitSelfIntersectingBoundary - ADR 0007), then triangulates
// each resulting simple sub-boundary and lifts every point to one shared height for the given
// surface level (surfaceLevelHeight * surfaceLevel, same surfaceLevelHeight get3DPoint in
// diagram.ts uses). surfaceLevel should be one past the highest level any knot currently occupies
// (see getSurfaceLevelsCount in diagram.ts) so the cap always sits above every knot.
export function getSecondaryCapTriangles(loop: SecondaryLoop, surfaceLevel: number, shiftedBoundary: Map<string, Coords2D>, surfaceLevelHeight: number): SecondaryTriangle[] {
    const height = surfaceLevelHeight * surfaceLevel;
    const boundary = getCapLoopPoints(loop).map((point) => shiftedBoundary.get(point.id)!);
    return splitSelfIntersectingBoundary(boundary).flatMap((subBoundary) => {
        if (subBoundary.length < 3) return [];

        const cut = Earcut.triangulate(subBoundary.flatMap((p) => [p.x, p.y]), [], 2);
        const triangles: SecondaryTriangle[] = [];
        for (let i = 0; i < cut.length; i += 3) {
            const [a, b, c] = cut.slice(i, i + 3);
            triangles.push([
                [subBoundary[a].x, height, subBoundary[a].y],
                [subBoundary[b].x, height, subBoundary[b].y],
                [subBoundary[c].x, height, subBoundary[c].y],
            ]);
        }
        return triangles;
    });
}

function getRawTrianglesIntersectionAsymmetric(triangleA: SecondaryTriangle, triangleB: SecondaryTriangle): [number, number, number][] {
    const edges: [[number, number, number], [number, number, number]][] = [
        [triangleA[0], triangleA[1]],
        [triangleA[1], triangleA[2]],
        [triangleA[2], triangleA[0]],
    ];
    return edges
        .map(([p1, p2]) => getRawTriangleLineIntersection(triangleB, p1, p2))
        .filter((p): p is [number, number, number] => p !== null);
}

// A pair of triangles from any two triangle soups generally intersects along one segment (both
// triangles being convex and planar) - this returns that segment, or null if they don't cross.
// Deliberately generic over bare coordinates (see ADR 0008) so it isn't tied to knots, the wall,
// or any other specific surface - the cap could use this too once more than one Secondary
// surface exists to test it against.
function getTrianglesIntersectionSegment(triangleA: SecondaryTriangle, triangleB: SecondaryTriangle): [[number, number, number], [number, number, number]] | null {
    const points = [
        ...getRawTrianglesIntersectionAsymmetric(triangleA, triangleB),
        ...getRawTrianglesIntersectionAsymmetric(triangleB, triangleA),
    ];
    const unique = deduplicatePoints(points.map((coords, i) => ({ id: `${i}`, coords })));
    if (unique.length < 2) return null;
    return [unique[0].coords, unique[1].coords];
}

// One wall rectangle (as its two triangles) plus the loop edge it's built on - loopA/loopB are
// exactly the bottom edge shared by both triangles, kept alongside them for
// getSecondaryWallIntersections below, which needs that edge to recognize its own degenerate hits.
type WallSegment = {
    triangles: [SecondaryTriangle, SecondaryTriangle];
    loopA: [number, number, number];
    loopB: [number, number, number];
};

// For every pair of adjacent loop points (wrapping last back to first, since the walk is a closed
// ring), a rectangle spans from their flattened, shared-height cap positions down to their real
// coords. Deliberately walks the raw loop, not the cap's own self-intersection split (ADR 0005/0007)
// - that split exists only so Earcut gets a simple polygon; a wall rectangle is local to one pair
// of points and has no such requirement. Top edge uses the same shiftedBoundary as the cap; bottom
// edge (real coords) is never shifted.
function getSecondaryWallSegments(loop: SecondaryLoop, surfaceLevel: number, shiftedBoundary: Map<string, Coords2D>, surfaceLevelHeight: number): WallSegment[] {
    const height = surfaceLevelHeight * surfaceLevel;
    const points = getCapLoopPoints(loop);
    if (points.length < 3) return [];

    const segments: WallSegment[] = [];
    for (let i = 0; i < points.length; i++) {
        const next = (i + 1) % points.length;
        const capA = shiftedBoundary.get(points[i].id)!;
        const capB = shiftedBoundary.get(points[next].id)!;
        const a: [number, number, number] = [capA.x, height, capA.y];
        const b: [number, number, number] = [capB.x, height, capB.y];
        const loopA = points[i].coords;
        const loopB = points[next].coords;

        segments.push({ triangles: [[a, b, loopB], [a, loopB, loopA]], loopA, loopB });
    }
    return segments;
}

export function getSecondaryWallTriangles(loop: SecondaryLoop, surfaceLevel: number, shiftedBoundary: Map<string, Coords2D>, surfaceLevelHeight: number): SecondaryTriangle[] {
    return getSecondaryWallSegments(loop, surfaceLevel, shiftedBoundary, surfaceLevelHeight).flatMap((segment) => segment.triangles);
}

// Wall triangles vs a target triangle soup (typically one knot's surfaceTriangles), skipping hits
// that just retrace a wall segment's own bottom edge (CONTEXT.md's "Secondary intersection").
// That edge is guaranteed to coincide with a real knot edge - either directly (an ordinary,
// non-crossing loop segment IS two adjacent points of one knot's own diagram) or via a crossing
// point (interpolated exactly onto another knot's surface) - so any result confined to that edge
// is the wall meeting its own origin, not a real piercing through a surface's interior.
export function getSecondaryWallIntersections(
    loop: SecondaryLoop,
    surfaceLevel: number,
    shiftedBoundary: Map<string, Coords2D>,
    targetTriangles: SecondaryTriangle[],
    surfaceLevelHeight: number,
): [[number, number, number], [number, number, number]][] {
    const wallSegments = getSecondaryWallSegments(loop, surfaceLevel, shiftedBoundary, surfaceLevelHeight);
    const results: [[number, number, number], [number, number, number]][] = [];

    for (const { triangles, loopA, loopB } of wallSegments) {
        for (const wallTriangle of triangles) {
            for (const targetTriangle of targetTriangles) {
                const segment = getTrianglesIntersectionSegment(wallTriangle, targetTriangle);
                if (!segment) continue;

                const [p1, p2] = segment;
                const isOwnEdge = [p1, p2].every((p) =>
                    isPointBetweenPoints({ coords: p }, { coords: loopA }, { coords: loopB }),
                );
                if (isOwnEdge) continue;

                results.push(segment);
            }
        }
    }

    return results;
}