<template>
	<div class="drawing-board">
		<svg>
			<line
				v-for="segment in loopSegments"
				:key="segment.id"
				class="subsurface-loop-line"
				:x1="segment.from.x"
				:y1="segment.from.y"
				:x2="segment.to.x"
				:y2="segment.to.y"
			/>
			<KnotShape
				v-for="knot in knots"
				:key="knot.id"
				:id="knot.id"
				:points="knot.points"
				:isClosed="knot.isClosed"
				:color="knot.color"
			/>
			<KnotIntersections
				:knots="knots"
				:interFlipIds="interFlipIds"
				:clickable="false"
			/>
		</svg>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DrawingData, Knot, SubSurfacesPoint } from "./types.ts";
import KnotIntersections from "./KnotIntersections.vue";
import KnotShape from "./KnotShape.vue";
import { getDiagram, get3DKnots } from "../utils/diagram.ts";
import { getSubSurfaceIntersectionsLoop } from "../utils/sub-surfaces.ts";

const props = defineProps<{
	knots: Knot[];
	interFlipIds: Set<string>;
}>();

// Same (uncentered) coordinate space this board already renders in, so the
// projected loop lines up with the knots' own lines drawn above.
const subSurfaceLoop = computed(() => {
	const drawingData: DrawingData = {
		knots: props.knots,
		interFlipIds: props.interFlipIds,
	};
	const knots3D = get3DKnots(getDiagram(drawingData));
	return getSubSurfaceIntersectionsLoop(knots3D);
});

type ProjectedLoopPoint = { x: number; y: number; source: SubSurfacesPoint };

// A loop point either keeps its original diagram position, or - for a
// crossing point with no diagram origin - is projected from its 3D
// coordinates the same way every 3D point is derived from 2D (see
// get3DKnots in diagram.ts): x/z plane -> x/y.
const projectedLoopPoints = computed<ProjectedLoopPoint[]>(() =>
	subSurfaceLoop.value.points.map((point) => ({
		x: point.diagramPoint ? point.diagramPoint.x : point.coords[0],
		y: point.diagramPoint ? point.diagramPoint.y : point.coords[2],
		source: point,
	})),
);

type LoopSegment = {
	id: string;
	from: ProjectedLoopPoint;
	to: ProjectedLoopPoint;
};

// Kept as discrete segments (rather than one <polyline>) so each segment
// carries its source points for future interactions (e.g. click to inspect).
const loopSegments = computed<LoopSegment[]>(() => {
	const points = projectedLoopPoints.value;
	const segments: LoopSegment[] = [];
	for (let i = 0; i < points.length - 1; i++) {
		segments.push({
			id: `${points[i].source.id}-${points[i + 1].source.id}`,
			from: points[i],
			to: points[i + 1],
		});
	}
	return segments;
});
</script>

<style scoped>
.drawing-board {
	position: relative;
	width: 100%;
	height: 100%;
}

svg {
	border: 1px solid #ccc;
	background-color: #f9f9f9;
	width: 100%;
	height: 100%;
}

.subsurface-loop-line {
	stroke: #ff00ff88;
	stroke-width: 8;
}
</style>
