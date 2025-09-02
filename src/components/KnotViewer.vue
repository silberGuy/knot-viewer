<template>
	<div class="knot-viewer">
		<TresCanvas>
			<OrbitControls />
			<!-- <CatmullRomCurve3
				v-for="(knot, index) in knotsToRender"
				:points="knot.points"
				:key="`${index}_${knot.points.length}_${knot.isClosed}`"
				:segments="knot.points.length"
				:lineWidth="2"
			/> -->
			<Line2
				v-for="(knot, index) in knotsToRender"
				:points="knot.points"
				:key="`${index}_${knot.points.length}_${knot.isClosed}`"
				:lineWidth="3"
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
import type { DrawingData, Knot } from "./types";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls, Grid, Line2 } from "@tresjs/cientos";
import {
	combineKnotPointsWithIntersections,
	computeIntersections,
} from "../utils/drawing";

const props = defineProps<{
	drawingData: DrawingData;
}>();

const filteredKnots = computed(() =>
	props.drawingData.knots.filter((knot) => knot.points.length > 2)
);

const knotsToRender = computed(() => {
	return filteredKnots.value.map((knot, index) => ({
		...knot,
		id: knot.id || (index + 1).toString(),
		points: getKnot3DPoints(knot),
	}));
});

const intersections = computed(() =>
	computeIntersections(props.drawingData.knots, props.drawingData.interFlipIds)
);

function getKnot3DPoints(knot: Knot) {
	// TODO: scale and center according to all points in all knots
	if (!knot) return [];
	const points = combineKnotPointsWithIntersections(knot, intersections.value);
	return points.map(({ x, y, intersection, isTop }) => {
		let z = 0.5;
		if (intersection) {
			z = isTop ? 0.75 : 0.25;
		}
		return [x / 400, z, y / 400];
	});
}
</script>
