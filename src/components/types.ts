export type Coords2D = { x: number; y: number };
export type Point = Coords2D & { id: string };
export type Line = { id: string; p1: Point; p2: Point, knotId: string };
export type Knot = { id: string; points: Point[]; isClosed: boolean; };
export type DrawingData = { knots: Knot[]; interFlipIds: Set<string>; };
export type Intersection = {
    id: string;
    topLineKnotId: string;
    bottomLineKnotId: string;
    topLine: Line;
    bottomLine: Line;
    point: Coords2D;
}
export type KnotDiagramPoint = Coords2D & {
    id: string;
    intersection?: Intersection;
    isTop?: boolean;
}