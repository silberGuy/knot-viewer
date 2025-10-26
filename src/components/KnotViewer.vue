<template>
	<div class="knot-viewer">
		<TresCanvas>
			<OrbitControls />
			<KnotViewerKnot
				v-for="knot in knots3D"
				:knot3D="knot"
				:key="knot.diagramKnot.id"
				:knot-id="knot.diagramKnot.id"
				:points="knot.diagramKnot.points"
				:allSurfaceLevels="diagram.surfaceLevels"
				:surfaceColor="knot.diagramKnot.knot.color"
				:showSurfaces="controlsStore.showSurfaces"
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
import KnotViewerKnot from "./KnotViewerKnot.vue";
import { useControlsStore } from "../data/controls";
import { get3DKnots, getDiagram } from "../utils/diagram";

const props = defineProps<{
	drawingData: DrawingData;
}>();

const controlsStore = useControlsStore();

const diagram = computed(() => getDiagram(props.drawingData));
const knots3D = computed(() => get3DKnots(diagram.value));
</script>
