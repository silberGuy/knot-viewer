export type Coords2D = { x: number; y: number };
export type Point = Coords2D & { id: string, knotId: string };
export type Line = { id: string; p1: Point; p2: Point, knotId: string };
export type Knot = { id: string; points: Point[]; isClosed: boolean; color?: string; };
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

// Note: Diagram means that it is in 2D but after calculating intersections and adding extra points
export type KnotDiagramPoint = Coords2D & {
    id: string;
    knotId: string;
    intersection?: Intersection;
    intersectionParallelId?: string;
    isTop?: boolean;
    isIntersectionSep?: boolean;
}

export type DiagramTriangle = [KnotDiagramPoint, KnotDiagramPoint, KnotDiagramPoint];

export type DiagramKnot = {
    id: string;
    knot: Knot;
    points: KnotDiagramPoint[];
    surfaceTriangles: DiagramTriangle[];
}

export type SurfaceLevel = KnotDiagramPoint[];

export type Diagram = {
    knots: DiagramKnot[];
    surfaceLevels: SurfaceLevel[];
}

export type Knot3DPoint = {
    diagramPoint: KnotDiagramPoint;
    coords: [number, number, number];
}

export type Knot3D = {
    diagramKnot: DiagramKnot;
    points: Knot3DPoint[];
    surfaceTriangles: [Knot3DPoint, Knot3DPoint, Knot3DPoint][];
}