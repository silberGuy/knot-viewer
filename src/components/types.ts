export type Point = { id: string; x: number; y: number };
export type Line = { id: string; p1: Point; p2: Point, knotId: string };
export type Knot = { id: string; points: Point[]; isClosed: boolean; };
export type DrawingData = { knots: Knot[]; interFlipIds: Set<string>; };
