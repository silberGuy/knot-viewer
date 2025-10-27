<template>
	<div class="knot-viewer">
		<TresCanvas>
			<TresPerspectiveCamera
				:position="[5, 5, 10]"
				:fov="50"
				:near="0.1"
				:far="1000"
			/>
			<OrbitControls />
			<KnotViewerKnot
				v-for="knot in knots3D"
				:knot="knot"
				:key="knot.diagramKnot.id"
				:surfaceColor="knot.diagramKnot.knot.color"
				:showSurfaces="controlsStore.showSurfaces"
			/>
			<ViewerLine
				v-for="linePoints in surfaceIntersectionsLines"
				:key="linePoints.id"
				:points="linePoints.points"
				color="#00ff00"
				:width="6"
				noDepthTest
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
import {
	getKnotsSurfacesIntersections,
	getSurfaceIntersectionsPairs,
} from "../utils/sub-surfaces";
import ViewerLine from "./ViewerLine.vue";

const props = defineProps<{
	drawingData: DrawingData;
}>();

const controlsStore = useControlsStore();

const diagram = computed(() => getDiagram(props.drawingData));
const knots3D = computed(() => get3DKnots(diagram.value));
const surfaceIntersectionsLines = computed(() => {
	if (!controlsStore.showSurfacesIntersections) return [];
	const points = getKnotsSurfacesIntersections(knots3D.value);
	const pairs = getSurfaceIntersectionsPairs(points);
	return pairs.map(([p1, p2]) => ({
		id: p1.id + "_" + p2.id,
		points: [p1, p2],
	}));
});
</script>
