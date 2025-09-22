<template>
	<div class="knot-viewer">
		<TresCanvas>
			<OrbitControls />
			<KnotViewerKnot
				v-for="knot in filteredKnots"
				:key="knot.id"
				:points="knot.points"
				:allSurfaceLoops="surfaces"
			/>
			<Grid
				:args="[10.5, 10.5]"
				cell-color="#82dbc5"
				:cell-size="0.6"
				:cell-thickness="0.5"
				section-color="#fbb03b"
				:section-size="2"
				:section-thickness="1.3"
				:infinite-grid="true"
				:fade-from="0"
				:fade-distance="12"
				:fade-strength="1"
			/>
		</TresCanvas>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DrawingData } from "./types";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls, Grid } from "@tresjs/cientos";
import {
	combineKnotPointsWithIntersections,
	computeIntersections,
	getSurfaceLoops,
} from "../utils/drawing";
import KnotViewerKnot from "./KnotViewerKnot.vue";

const props = defineProps<{
	drawingData: DrawingData;
}>();

const filteredKnots = computed(() =>
	props.drawingData.knots
		.filter((knot) => knot.points.length > 2)
		.map((knot, index) => ({
			knot,
			id: knot.id || (index + 1).toString(),
			points: combineKnotPointsWithIntersections(knot, intersections.value),
		}))
);

const surfaces = computed(() => {
	const allKnotsPoints = filteredKnots.value.map(({ points }) => points).flat();
	const surfaces = getSurfaceLoops(allKnotsPoints);
	return surfaces;
});

const intersections = computed(() =>
	computeIntersections(props.drawingData.knots, props.drawingData.interFlipIds)
);
</script>
