export type Coords2D = { x: number; y: number };
export type Point = Coords2D & { id: string, knotId: string };
export type Line = { id: string; p1: Point; p2: Point, knotId: string };
export type Knot = { id: string; points: Point[]; isClosed: boolean; };
export type DrawingData = { knots: Knot[]; interFlipIds: Set<string>; };
export type IntersectionPoint = Coords2D & {
    linesRatios: Record<string, number> // maps line id to point ratio in line
}
export type Intersection = {
    id: string;
    topLineKnotId: string;
    bottomLineKnotId: string;
    topLine: Line;
    bottomLine: Line;
    point: IntersectionPoint;
    isFlipped: boolean;
    isWithinKnot: boolean;
}
export type KnotDiagramPoint = Coords2D & {
    id: string;
    knotId: string;
    intersection?: Intersection;
    intersectionParallelId?: string;
    isTop?: boolean;
    isIntersectionSep?: boolean;
}