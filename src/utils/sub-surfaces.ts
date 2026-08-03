import { Ray, Vector3 } from "three";
import type { CrossingWalkDirection, CrossingWalkDirections, DiagramPoint, Knot3D, Point3D, SubSurface, SubSurfacesKnot, SubSurfacesPoint, Triangle3D } from "../components/types";
import { getSurfaceLevels } from "./surfaces";
import { getKnotTriangles } from "./diagram";

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

// Order-independent id for a crossing (same for both of its points) - used to key
// CrossingWalkDirections by crossing, not by point.
export function getCrossingId(point: SubSurfacesPoint): string | undefined {
    const twinPointId = point.surfaceIntersection?.twinPointId;
    if (!twinPointId) return undefined;
    return [point.id, twinPointId].sort().join("::");
}

// Seeds every crossing with DEFAULT_CROSSING_WALK_DIRECTION.
export function getDefaultCrossingWalkDirections(knots: Knot3D[]): CrossingWalkDirections {
    const knotsWithSubSurfacePoints = combineKnotsWithSurfaceIntersections(knots);
    const directions: CrossingWalkDirections = new Map();
    for (const knot of knotsWithSubSurfacePoints) {
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
    knot: SubSurfacesKnot;
    pointIndex: number;
    step: 1 | -1;
    justArrivedViaJump: boolean;
};

function currentPoint(state: WalkState): SubSurfacesPoint {
    return state.knot.points[state.pointIndex];
}

// Next state: resolves the current point's crossing direction if it has one (unless this
// is a jump landing), else just steps forward. undefined only on inconsistent data (twin
// knot not found) - the caller treats that as "stop".
function advance(
    state: WalkState,
    knotsWithSubSurfacePoints: SubSurfacesKnot[],
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
    const twinKnot = knotsWithSubSurfacePoints.find(k => k.points.some(p => p.id === twinPointId));
    if (!twinKnot) {
        console.error('Could not find twin knot for point', point);
        return undefined;
    }
    const twinPointIndex = twinKnot.points.findIndex(p => p.id === twinPointId);
    return { knot: twinKnot, pointIndex: twinPointIndex, step, justArrivedViaJump: true };
}

// Walks from `start` until it revisits a point (loop closes) or the data runs out.
function runWalk(
    start: WalkState,
    knotsWithSubSurfacePoints: SubSurfacesKnot[],
    crossingWalkDirections: CrossingWalkDirections,
): SubSurfacesPoint[] {
    const points: SubSurfacesPoint[] = [];
    const visitedIds = new Set<string>();

    let state: WalkState | undefined = start;
    while (state) {
        const point = currentPoint(state);
        if (!point || visitedIds.has(point.id)) break;
        points.push(point);
        visitedIds.add(point.id);
        state = advance(state, knotsWithSubSurfacePoints, crossingWalkDirections);
    }

    return points;
}

// Starting point is never user-facing (a closed loop has no beginning), so any crossing
// works as an anchor - the lowest crossing id, for a stable result. Starts on whichever of
// the anchor's two points (see getCrossingRole) its own resolved direction targets - a
// fixed choice, not "whichever knot happens to be found first" (see ADR 0003). Falls back
// to a fixed first point when there are no crossings to anchor on.
function getWalkStart(
    knotsWithSubSurfacePoints: SubSurfacesKnot[],
    crossingWalkDirections: CrossingWalkDirections,
): WalkState {
    const crossingIds = new Set<string>();
    for (const knot of knotsWithSubSurfacePoints) {
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

        for (const knot of knotsWithSubSurfacePoints) {
            const pointIndex = knot.points.findIndex(
                p => getCrossingId(p) === anchorId && getCrossingRole(p) === targetRole,
            );
            if (pointIndex === -1) continue;
            return { knot, pointIndex, step, justArrivedViaJump: false };
        }
    }

    return { knot: knotsWithSubSurfacePoints[0], pointIndex: 0, step: 1, justArrivedViaJump: false };
}

export function getSubSurfaceIntersectionsLoop(knots: Knot3D[], crossingWalkDirections: CrossingWalkDirections = new Map()): SubSurface {
    if (knots.length === 0) {
        return { id: 'sub-surface-empty', points: [], surfaceTriangles: [] };
    }

    const knotsWithSubSurfacePoints = combineKnotsWithSurfaceIntersections(knots);
    const start = getWalkStart(knotsWithSubSurfacePoints, crossingWalkDirections);
    const walkedPoints = runWalk(start, knotsWithSubSurfacePoints, crossingWalkDirections);

    const result: SubSurface = {
        id: `sub-surface-${knots.map(k => k.diagramKnot.id).join('_')}`,
        // Nudged slightly off of the knots' own lines so the overlay doesn't sit exactly
        // on top of them.
        points: walkedPoints.map(point => ({
            ...point,
            coords: [point.coords[0] + 1, point.coords[1] + 1, point.coords[2]] as [number, number, number],
        })),
        surfaceTriangles: [],
    };
    result.surfaceTriangles = getSubSurfaceTriangles(result);
    return result;
}

// Diagram points keep their 2D position; crossing points project from 3D (x/z -> x/y,
// mirroring get3DKnots in diagram.ts).
export function projectSubSurfacesPoint(point: SubSurfacesPoint): { x: number; y: number } {
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
function findRealIntersection(surfaceIntersection: NonNullable<SubSurfacesPoint["surfaceIntersection"]>) {
    const fromP1 = surfaceIntersection.lineP1.diagramPoint.intersection;
    if (fromP1 && !fromP1.isWithinKnot) return fromP1;
    const fromP2 = surfaceIntersection.lineP2.diagramPoint.intersection;
    if (fromP2 && !fromP2.isWithinKnot) return fromP2;
    return undefined;
}

// A crossing point's fixed lower/upper side, independent of walk position (see ADR 0003).
// Reuses the drawn over/under (topLineKnotId/bottomLineKnotId) at a real intersection;
// otherwise falls back to a fixed id tie-break (no user-facing arrow there anyway).
export function getCrossingRole(point: SubSurfacesPoint): "lower" | "upper" | undefined {
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

// One arrow per crossing in the loop that sits at a real 2D intersection, positioned at that
// intersection's own point (fixed, unlike either of the crossing's two SubSurfacesPoints), and
// carrying that intersection's own topLine/bottomLine geometry - CrossingWalkArrow.vue derives
// the arrival direction (see CONTEXT.md), which options to exclude, and the facing angle from
// these directly. Crossings not at a real intersection still resolve (via their default) but
// get no arrow.
export function getCrossingWalkArrows(
    loop: SubSurface,
    crossingWalkDirections: CrossingWalkDirections,
): CrossingWalkArrow[] {
    const arrows: CrossingWalkArrow[] = [];
    const seenCrossingIds = new Set<string>();

    for (const point of loop.points) {
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

    return arrows;
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


function getSubSurfaceTriangles(subSurfaceLoop: SubSurface): Triangle3D[] {
    let pointsForSurfaces = subSurfaceLoop.points.map((p) =>
        p.diagramPoint
            ? ({ ...p.diagramPoint, knotId: subSurfaceLoop.id } as DiagramPoint)
            : {
                ...p,
                knotId: subSurfaceLoop.id,
                x: p.coords[0],
                y: p.coords[2],
            }
    );
    pointsForSurfaces = pointsForSurfaces.map((point) => {
        if (
            point.intersection &&
            !pointsForSurfaces.some(
                (other) => other.id === point.intersectionParallelId
            )
        ) {
            const { intersection, isTop, intersectionParallelId, ...rest } = point;
            return rest;
        }
        return point;
    });
    pointsForSurfaces = pointsForSurfaces.map((p) => {
        if (!p.intersection) return p;
        return {
            ...p,
            intersection: {
                ...p.intersection,
                isWithinKnot: true,
            },
        };
    });
    const surfaceLevels = getSurfaceLevels(pointsForSurfaces);

    const triangles = getKnotTriangles(
        {
            points: pointsForSurfaces,
            id: subSurfaceLoop.id,
        },
        surfaceLevels
    );

    return triangles.map((t) => ({
        ...t,
        points: t.points.map((p) =>
            subSurfaceLoop.points.find((sp) => sp.id === p.id)
        ) as [Point3D, Point3D, Point3D],
    }));
}