import type { Diagram, DiagramKnot, DiagramTriangle, DrawingData, Knot3D, Point3D, DiagramPoint, SurfaceLevel } from "../components/types";
import { combineKnotPointsWithIntersections, computeIntersections } from "./drawing";
import { findPointSurfaceIndex, getIntersectionsNotInKnotTriangles, getKnotIntersectionTriangles, getSurfaceLevels, getSurfaceLevelTriangles } from "./surfaces";

export const DEFAULT_SURFACE_LEVEL_HEIGHT = 16;

type NarrowDiagramKnot = Omit<DiagramKnot, 'surfaceTriangles'>;

function getDiagramKnots(drawingData: DrawingData): NarrowDiagramKnot[] {
    const intersections = computeIntersections(drawingData.knots, drawingData.interFlipIds);
    return drawingData.knots
        .filter((knot) => knot.points.length > 2)
        .map((knot, index) => ({
            knot,
            id: knot.id || (index + 1).toString(),
            points: combineKnotPointsWithIntersections(knot, intersections),
        }))
}

function getKnotTriangles(knot: Omit<NarrowDiagramKnot, 'knot'>, surfaceLevels: SurfaceLevel[]): DiagramTriangle[] {
    const surfacesLevels = surfaceLevels.filter(
        (surface) => surface[0] && surface[0].knotId === knot.id
    );
    const surfaceTriangles = surfacesLevels
        .map((level) => getSurfaceLevelTriangles(level))
        .flat();

    const interTriangles = getKnotIntersectionTriangles(
        knot.points,
        surfacesLevels
    );

    const extraTriangles = getIntersectionsNotInKnotTriangles(
        knot.points,
        surfacesLevels
    );

    return [...surfaceTriangles, ...interTriangles, ...extraTriangles];
}

function knotsTopComparator(a: NarrowDiagramKnot, b: NarrowDiagramKnot): number {
    const topIntersA = a.points.filter(p => p.isTop).length;
    const topIntersB = b.points.filter(p => p.isTop).length;
    return topIntersA - topIntersB;
}

export function getDiagram(drawingData: DrawingData): Diagram {
    const narrowKnots = getDiagramKnots(drawingData);
    const narrowKnotsSorted = [...narrowKnots].sort(knotsTopComparator);
    const allKnotsPoints = narrowKnotsSorted.map(({ points }) => points).flat();
    const surfaceLevels = getSurfaceLevels(allKnotsPoints);
    const knots = narrowKnotsSorted.map(knot => ({
        ...knot,
        surfaceTriangles: getKnotTriangles(knot, surfaceLevels)
    }));

    return {
        knots,
        surfaceLevels,
    }
}

function createOffsetDiagramPoint(
    fromPoint: DiagramPoint,
    toPoint: DiagramPoint,
    ratio: number,
    knotId: string,
    baseId: string
): DiagramPoint {
    return {
        id: `${baseId}-${ratio < 0.5 ? "after" : "before"}`,
        knotId,
        x: fromPoint.x + (toPoint.x - fromPoint.x) * ratio,
        y: fromPoint.y + (toPoint.y - fromPoint.y) * ratio,
        isIntersectionSep: true,
    };
}

function getIntersectionPointForKnot(
    knot: DiagramKnot,
    intersectionId: string
): DiagramPoint | undefined {
    return knot.points.find((point) => point.intersection?.id === intersectionId);
}

export function buildSecondaryLoopFromDiagramKnots(
    diagramKnots: DiagramKnot[]
): DiagramPoint[] {
    if (diagramKnots.length === 0) return [];

    const loopPoints: DiagramPoint[] = [];
    const processedIntersections = new Set<string>();
    const startKnot = diagramKnots[0];
    const startPoint = startKnot.points[0];
    const startState = `${startKnot.id}:0`;

    if (!startPoint) return [];

    const addLoopPoint = (point: DiagramPoint) => {
        if (loopPoints.some((existingPoint) => existingPoint.id === point.id)) {
            return;
        }

        loopPoints.push({ ...point });
    };

    let currentKnot = startKnot;
    let currentIndex = 0;

    while (true) {
        const currentPoint = currentKnot.points[currentIndex];
        if (!currentPoint) break;

        addLoopPoint(currentPoint);

        const stateKey = `${currentKnot.id}:${currentIndex}`;
        if (stateKey === startState && loopPoints.length > 1) {
            break;
        }

        const intersection = currentPoint.intersection;
        if (intersection && !processedIntersections.has(intersection.id)) {
            const previousIndex =
                (currentIndex - 1 + currentKnot.points.length) % currentKnot.points.length;
            const previousPoint = currentKnot.points[previousIndex];
            const nextIndex = (currentIndex + 1) % currentKnot.points.length;
            const nextPoint = currentKnot.points[nextIndex];

            if (previousPoint && nextPoint) {
                addLoopPoint(
                    createOffsetDiagramPoint(
                        previousPoint,
                        currentPoint,
                        0.9,
                        currentKnot.id,
                        currentPoint.id
                    )
                );
            }

            const otherKnotId =
                intersection.topLineKnotId === currentKnot.id
                    ? intersection.bottomLineKnotId
                    : intersection.topLineKnotId;
            const otherKnot = diagramKnots.find((knot) => knot.id === otherKnotId);
            const otherPointIndex = otherKnot
                ? getIntersectionPointForKnot(otherKnot, intersection.id)?.
                    id
                : undefined;
            const otherPoint = otherPointIndex
                ? otherKnot?.points.find((point) => point.id === otherPointIndex)
                : undefined;

            if (otherKnot && otherPoint) {
                const otherNextIndex = (otherKnot.points.indexOf(otherPoint) + 1) % otherKnot.points.length;
                const otherNextPoint = otherKnot.points[otherNextIndex];

                if (otherNextPoint) {
                    addLoopPoint(
                        createOffsetDiagramPoint(
                            otherPoint,
                            otherNextPoint,
                            0.1,
                            otherKnot.id,
                            currentPoint.id
                        )
                    );
                }

                processedIntersections.add(intersection.id);
                currentKnot = otherKnot;
                currentIndex = otherNextIndex;
                continue;
            }
        }

        currentIndex = (currentIndex + 1) % currentKnot.points.length;
        if (currentIndex === 0 && currentKnot.id === startKnot.id) {
            break;
        }
    }

    return loopPoints;
}

function minimizeSurfaceLevels(surfaceLevels: SurfaceLevel[]): SurfaceLevel[] {
    const isAllTop = (level: SurfaceLevel) => level.every(p => p.intersection && p.isTop);
    const minimizeSurfaceLevels = surfaceLevels.reduce((acc, level) => {
        if (isAllTop(level) && acc.length > 0 && isAllTop(acc[acc.length - 1])) {
            acc[acc.length - 1].push(...level);
        } else {
            acc.push(level);
        }
        return acc;
    }, [] as SurfaceLevel[]);
    return minimizeSurfaceLevels;
}

export function getSurfaceLevelsCount(diagram: Diagram): number {
    return minimizeSurfaceLevels(diagram.surfaceLevels).length;
}

export function getCoordsAtSurfaceLevel(x: number, y: number, surfaceLevel: number, surfaceLevelHeight: number): [number, number, number] {
    return [x, surfaceLevelHeight * surfaceLevel, y];
}

function get3DPoint(point: DiagramPoint, surfaceLevels: SurfaceLevel[], surfaceLevelHeight: number): Point3D {
    let surfaceIndex = findPointSurfaceIndex(surfaceLevels, point);
    if (surfaceIndex === -1)
        console.warn("could not find surface for point", point);

    return {
        id: point.id,
        diagramPoint: point,
        coords: getCoordsAtSurfaceLevel(point.x, point.y, surfaceIndex, surfaceLevelHeight)
    };
}

export function get3DKnots(diagram: Diagram, surfaceLevelHeight: number = DEFAULT_SURFACE_LEVEL_HEIGHT): Knot3D[] {
    const surfaceLevels = minimizeSurfaceLevels(diagram.surfaceLevels);
    return diagram.knots.map(knot => ({
        diagramKnot: knot,
        points: knot.points.map(point => get3DPoint(point, surfaceLevels, surfaceLevelHeight)),
        surfaceTriangles: knot.surfaceTriangles.map(
            triangle => ({
                ...triangle,
                points: triangle.points.map(point => get3DPoint(point, surfaceLevels, surfaceLevelHeight)) as [Point3D, Point3D, Point3D]
            })
        ),
    }));
}
