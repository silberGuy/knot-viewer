import type { Diagram, DiagramKnot, DrawingData } from "../components/types";
import { combineKnotPointsWithIntersections, computeIntersections } from "./drawing";
import { getSurfaceLevels } from "./surfaces";

function getDiagramKnots(drawingData: DrawingData): DiagramKnot[] {
    const intersections = computeIntersections(drawingData.knots, drawingData.interFlipIds);
    return drawingData.knots
        .filter((knot) => knot.points.length > 2)
        .map((knot, index) => ({
            knot,
            id: knot.id || (index + 1).toString(),
            points: combineKnotPointsWithIntersections(knot, intersections),
        }))
}

function knotsTopComparator(a: DiagramKnot, b: DiagramKnot): number {
    const topIntersA = a.points.filter(p => p.isTop).length;
    const topIntersB = b.points.filter(p => p.isTop).length;
    return topIntersA - topIntersB;
}

export function getDiagram(drawingData: DrawingData): Diagram {
    const diagramKnots = getDiagramKnots(drawingData);
    const diagramKnotsSorted = [...diagramKnots].sort(knotsTopComparator);
    const allKnotsPoints = diagramKnotsSorted.map(({ points }) => points).flat();
    const surfaceLevels = getSurfaceLevels(allKnotsPoints);
    return {
        knots: diagramKnotsSorted,
        surfaceLevels,
    }
}


// function get3DKnots(points: KnotDiagramPoint[]): Knot3DPoint[] {
//     const knot3DPoints: Knot3DPoint[] = points.map((point) => ({
//         id: point.id,
//     }));
//     return knot3DPoints;
// }