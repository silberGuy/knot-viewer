<template>
	<div class="knot-viewer">
		<TresCanvas>
			<OrbitControls />
			<CatmullRomCurve3
				v-for="(loop, index) in loopsToRender"
				:points="getLoop3DPoints(loop.id)"
				:closed="true"
				:segments="loop.points.length"
				:key="`${index}_${loop.points.length}`"
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
import type { DrawingData, Loop } from "./types";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls, Grid, CatmullRomCurve3 } from "@tresjs/cientos";

const props = defineProps<{
	drawingData: DrawingData;
}>();

const loopsToRender = computed(() =>
	props.drawingData.loops.filter((loop) => loop.points.length > 2)
);

function getLoop3DPoints(loopId: string) {
	// TODO: scale and center according to all points in all loops
	const index = loopsToRender.value.findIndex((l) => l.id === loopId);
	const loop = loopsToRender.value[index];
	if (!loop) return [];
	const z = index ? index * 0.1 : 0;
	const points = loop.points.map((p) => [p.x / 400, z, p.y / 400]);
	return points;
}
</script>
