export type Coords2D = { x: number; y: number };
export type Point = Coords2D & { id: string, knotId: string };
export type Line = { id: string; p1: Point; p2: Point, knotId: string };
export type Knot = { id: string; points: Point[]; isClosed: boolean; color?: string; };
export type DrawingData = { knots: Knot[]; interFlipIds: Set<string>; };
type IntersectionPoint = Coords2D & {
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
export type DiagramPoint = Coords2D & {
    id: string;
    knotId: string;
    intersection?: Intersection;
    intersectionParallelId?: string;
    isTop?: boolean;
    isIntersectionSep?: boolean;
}

export type DiagramTriangle = {
    id: string;
    knotId: string;
    points: [DiagramPoint, DiagramPoint, DiagramPoint]
};

export type DiagramKnot = {
    id: string;
    knot: Knot;
    points: DiagramPoint[];
    surfaceTriangles: DiagramTriangle[];
}

export type SurfaceLevel = DiagramPoint[];

export type Diagram = {
    knots: DiagramKnot[];
    surfaceLevels: SurfaceLevel[];
}

export type Point3D = {
    id: string;
    diagramPoint: DiagramPoint;
    coords: [number, number, number];
}

export type Triangle3D = Omit<DiagramTriangle, 'points'> & {
    points: [Point3D, Point3D, Point3D];
}

export type Knot3D = {
    diagramKnot: DiagramKnot;
    points: Point3D[];
    surfaceTriangles: Triangle3D[];
}


type SubSurfacesPoint = {
    id: string;
    coords: [number, number, number];
    surfaceIntersection?: {
        triangle: Triangle3D;
    };
}

export type SubSurfacesKnot = Omit<Knot3D, 'points'> & {
    points: SubSurfacesPoint[];
}
