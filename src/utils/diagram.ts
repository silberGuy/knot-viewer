import type { Diagram, DiagramKnot, DiagramTriangle, DrawingData, Knot3D, Point3D, DiagramPoint, SurfaceLevel } from "../components/types";
import { combineKnotPointsWithIntersections, computeIntersections } from "./drawing";
import { findPointSurfaceIndex, getIntersectionsNotInKnotTriangles, getKnotIntersectionTriangles, getSurfaceLevels, getSurfaceLevelTriangles } from "./surfaces";

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

function getKnotTriangles(knot: NarrowDiagramKnot, surfaceLevels: SurfaceLevel[]): DiagramTriangle[] {
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

function get3DPoint(point: DiagramPoint, surfaceLevels: SurfaceLevel[]): Point3D {
    let surfaceIndex = findPointSurfaceIndex(surfaceLevels, point);
    // TODO: scale and center according to all points in all knots
    if (surfaceIndex === -1)
        console.warn("could not find surface for point", point);
    return {
        id: point.id,
        diagramPoint: point,
        coords: [point.x / 300, 0.25 * surfaceIndex, point.y / 300]
    };
}

export function get3DKnots(diagram: Diagram): Knot3D[] {
    const surfaceLevels = minimizeSurfaceLevels(diagram.surfaceLevels);
    return diagram.knots.map(knot => ({
        diagramKnot: knot,
        points: knot.points.map(point => get3DPoint(point, surfaceLevels)),
        surfaceTriangles: knot.surfaceTriangles.map(
            triangle => ({
                ...triangle,
                points: triangle.points.map(point => get3DPoint(point, surfaceLevels)) as [Point3D, Point3D, Point3D]
            })
        ),
    }));
}
