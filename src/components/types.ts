export type Point = { id: string; x: number; y: number };
export type Line = { id: string; p1: Point; p2: Point };
export type Loop = { id: string; points: Point[]; isClosed: boolean; };
export type DrawingData = { loops: Loop[]; interFlipIds: Set<string>; };
