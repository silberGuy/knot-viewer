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
			>
				<template #point="{ point }">
					<circle
						class="normal-point"
						:cx="point.x"
						:cy="point.y"
						r="6"
						:fill="knot.color || 'black'"
						@click.stop="subsurfaceWalkStore.setStartPoint(point.id)"
					/>
				</template>
			</KnotShape>
			<KnotIntersections
				:knots="knots"
				:interFlipIds="interFlipIds"
				:clickable="false"
			/>
			<CrossingWalkArrow
				v-for="arrow in crossingWalkArrows"
				:key="arrow.crossingId"
				:arrow="arrow"
				:walk-points="subSurfaceLoop.points"
				:knots="knotsWithSubSurfacePoints"
				@select="
					(direction) =>
						subsurfaceWalkStore.setDirection(arrow.crossingId, direction)
				"
			/>
			<circle
				v-if="projectedLoopPoints.length > 0"
				class="subsurface-loop-start-marker"
				:cx="projectedLoopPoints[0].x"
				:cy="projectedLoopPoints[0].y"
				r="10"
			/>
		</svg>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import type { DrawingData, Knot, SubSurfacesPoint } from "./types.ts";
import KnotIntersections from "./KnotIntersections.vue";
import KnotShape from "./KnotShape.vue";
import CrossingWalkArrow from "./CrossingWalkArrow.vue";
import { getDiagram, get3DKnots } from "../utils/diagram.ts";
import {
	combineKnotsWithSurfaceIntersections,
	getCrossingWalkArrows,
	getSubSurfaceIntersectionsLoop,
	projectSubSurfacesPoint,
} from "../utils/sub-surfaces.ts";
import { useSubsurfaceWalkStore } from "../data/subsurface-walk.ts";

const props = defineProps<{
	knots: Knot[];
	interFlipIds: Set<string>;
}>();

const subsurfaceWalkStore = useSubsurfaceWalkStore();

// Same (uncentered) coordinate space this board already renders in, so the
// projected loop lines up with the knots' own lines drawn above.
const knots3D = computed(() => {
	const drawingData: DrawingData = {
		knots: props.knots,
		interFlipIds: props.interFlipIds,
	};
	return get3DKnots(getDiagram(drawingData));
});

// The knots (and therefore the crossings) are static for as long as this
// board is showing, so seeding the crossingWalkDirection defaults once on
// mount - which only happens when the Subsurface tab is switched into,
// since App.vue toggles this board with v-if/v-else - is enough; there's no
// later point where the set of crossings could change under it.
onMounted(() => {
	subsurfaceWalkStore.reset(knots3D.value);
});

const subSurfaceLoop = computed(() =>
	getSubSurfaceIntersectionsLoop(
		knots3D.value,
		subsurfaceWalkStore.crossingWalkDirections,
		subsurfaceWalkStore.selectedStartPointId,
	),
);

// Each knot's own point list (including injected crossing points), so
// CrossingWalkArrow can look up a crossing's arrival direction (see
// CONTEXT.md) by comparing the walk's previous point against a knot's own
// forward/backward neighbor indices.
const knotsWithSubSurfacePoints = computed(() =>
	combineKnotsWithSurfaceIntersections(knots3D.value),
);

type ProjectedLoopPoint = { x: number; y: number; source: SubSurfacesPoint };

const projectedLoopPoints = computed<ProjectedLoopPoint[]>(() =>
	subSurfaceLoop.value.points.map((point) => ({
		...projectSubSurfacesPoint(point),
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
// It's a closed loop, so this also connects the last point back to the
// first - not just consecutive pairs.
const loopSegments = computed<LoopSegment[]>(() => {
	const points = projectedLoopPoints.value;
	if (points.length < 2) return [];
	const segments: LoopSegment[] = [];
	for (let i = 0; i < points.length; i++) {
		const from = points[i];
		const to = points[(i + 1) % points.length];
		segments.push({
			id: `${from.source.id}-${to.source.id}`,
			from,
			to,
		});
	}
	return segments;
});

// One arrow per real-intersection crossing across every knot - not just ones the currently
// displayed loop passes through (see getCrossingWalkArrows) - never two per crossing, even
// though a crossing is really a pair of points (the point and its twin on the other knot's
// surface): they're positioned at the same real 2D intersection either way. Rendering,
// off-loop styling, and direction-cycling live in CrossingWalkArrow.vue; this board just
// owns where the resulting override is stored.
const crossingWalkArrows = computed(() =>
	getCrossingWalkArrows(
		knotsWithSubSurfacePoints.value,
		subsurfaceWalkStore.crossingWalkDirections,
	),
);
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

.normal-point {
	cursor: pointer;
}

.subsurface-loop-start-marker {
	fill: none;
	stroke: #00aaff;
	stroke-width: 3;
	pointer-events: none;
}
</style>
