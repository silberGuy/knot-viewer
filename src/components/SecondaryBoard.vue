<template>
	<div class="drawing-board">
		<p v-if="!hasEnoughPointsForSecondary" class="board-empty-message">
			No knots are given
		</p>
		<template v-else>
			<svg>
				<line
					v-for="segment in loopSegments"
					:key="segment.id"
					class="secondary-loop-line"
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
							@click.stop="secondaryWalkStore.setStartPoint(point.id)"
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
					:walk-points="secondaryLoop.points"
					:knots="knotsWithSecondaryPoints"
					@select="
						(direction) =>
							secondaryWalkStore.setDirection(arrow.crossingId, direction)
					"
				/>
				<circle
					v-if="projectedLoopPoints.length > 0"
					class="secondary-loop-start-marker"
					:cx="projectedLoopPoints[0].x"
					:cy="projectedLoopPoints[0].y"
					r="10"
				/>
			</svg>
			<p v-if="isLoopUnclosed" class="loop-unclosed-message">
				Secondary loop is not closed
			</p>
		</template>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import type { DrawingData, Knot, SecondariesPoint } from "./types.ts";
import KnotIntersections from "./KnotIntersections.vue";
import KnotShape from "./KnotShape.vue";
import CrossingWalkArrow from "./CrossingWalkArrow.vue";
import { getDiagram, get3DKnots } from "../utils/diagram.ts";
import {
	combineKnotsWithSurfaceIntersections,
	getCrossingWalkArrows,
	getSecondaryIntersectionsLoop,
	projectSecondariesPoint,
} from "../utils/secondary-surfaces.ts";
import { useSecondaryWalkStore } from "../data/secondary-walk.ts";

const props = defineProps<{
	knots: Knot[];
	interFlipIds: Set<string>;
}>();

const secondaryWalkStore = useSecondaryWalkStore();

// Matches the App.vue tab-disable threshold - fewer than 3 points can't form
// a meaningful secondary loop.
const hasEnoughPointsForSecondary = computed(
	() => props.knots.reduce((count, knot) => count + knot.points.length, 0) >= 3,
);

// Same (uncentered) coordinate space this board already renders in, so the
// projected loop lines up with the knots' own lines drawn above. Guarded:
// getDiagram/get3DKnots assume enough points to work out surface levels from.
const knots3D = computed(() => {
	if (!hasEnoughPointsForSecondary.value) return [];
	const drawingData: DrawingData = {
		knots: props.knots,
		interFlipIds: props.interFlipIds,
	};
	return get3DKnots(getDiagram(drawingData));
});

// The knots (and therefore the crossings) are static for as long as this board is showing, so
// pruning once on mount - which only happens when the Secondary tab is switched into, since
// App.vue toggles this board with v-if/v-else - is enough; there's no later point where the set
// of crossings could change under it. Prune rather than reset: overrides now persist across tab
// switches, this only clears ones a Drawing-tab edit actually invalidated.
onMounted(() => {
	secondaryWalkStore.pruneStale(knots3D.value);
});

const secondaryLoop = computed(() =>
	getSecondaryIntersectionsLoop(
		knots3D.value,
		secondaryWalkStore.crossingWalkDirections,
		secondaryWalkStore.selectedStartPointId,
	),
);

const isLoopUnclosed = computed(
	() =>
		secondaryLoop.value.points.length > 0 && !secondaryLoop.value.isClosed,
);

// Each knot's own point list (including injected crossing points), so
// CrossingWalkArrow can look up a crossing's arrival direction (see
// CONTEXT.md) by comparing the walk's previous point against a knot's own
// forward/backward neighbor indices.
const knotsWithSecondaryPoints = computed(() =>
	combineKnotsWithSurfaceIntersections(knots3D.value),
);

type ProjectedLoopPoint = { x: number; y: number; source: SecondariesPoint };

const projectedLoopPoints = computed<ProjectedLoopPoint[]>(() =>
	secondaryLoop.value.points.map((point) => ({
		...projectSecondariesPoint(point),
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
		knotsWithSecondaryPoints.value,
		secondaryWalkStore.crossingWalkDirections,
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

.secondary-loop-line {
	stroke: #ff00ff88;
	stroke-width: 8;
}

.normal-point {
	cursor: pointer;
}

.secondary-loop-start-marker {
	fill: none;
	stroke: #00aaff;
	stroke-width: 3;
	pointer-events: none;
}

.board-empty-message {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	color: #888;
}

.loop-unclosed-message {
	position: absolute;
	bottom: 2em;
	left: 50%;
	transform: translateX(-50%);
	margin: 0;
	font-size: 0.85em;
	background: #b42309;
	padding: 0.5em 1em;
	border-radius: 4px;
	pointer-events: none;
}
</style>
