<template>
	<div class="knot-viewer">
		<TresCanvas>
			<TresPerspectiveCamera
				:position="[80, 80, 160]"
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
				:color="linePoints.color"
				:width="6"
				noDepthTest
			/>
			<Grid
				:args="[10.5, 10.5]"
				cell-color="#82dbc5"
				:cell-size="8"
				:cell-thickness="1"
				section-color="#fbb03b"
				:section-size="8"
				:section-thickness="1.3"
				:infinite-grid="true"
				:fade-from="0"
				:fade-distance="150"
				:fade-strength="1"
			/>
		</TresCanvas>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DrawingData, SubSurfacesPoint } from "./types";
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
import tinycolor from "tinycolor2";

const props = defineProps<{
	drawingData: DrawingData;
}>();

const controlsStore = useControlsStore();

const diagram = computed(() => getDiagram(props.drawingData));
const knots3D = computed(() => get3DKnots(diagram.value));

function getKnotColor(knotId: string) {
	return (
		knots3D.value.find((knot) => knot.diagramKnot.id === knotId)?.diagramKnot
			.knot.color || "white"
	);
}

function getSurfaceIntersectionsColor(
	p1: SubSurfacesPoint,
	p2: SubSurfacesPoint
) {
	if (!p1.surfaceIntersection || !p2.surfaceIntersection) return "white";
	const knotsIds = [
		...new Set([
			p1.surfaceIntersection.triangle.knotId,
			p2.surfaceIntersection.triangle.knotId,
			p1.surfaceIntersection.twinPointKnotId!,
			p2.surfaceIntersection.twinPointKnotId!,
		]),
	];
	const color1 = getKnotColor(knotsIds[0]);
	const color2 = getKnotColor(knotsIds[1]);
	let color = tinycolor.mix(color1, color2, 50).saturate(50);

	if (!color.isLight()) {
		color = color.lighten(20);
	}

	return color.toHexString();
}

const surfaceIntersectionsLines = computed(() => {
	if (!controlsStore.showSurfacesIntersections) return [];
	const points = getKnotsSurfacesIntersections(knots3D.value);
	const pairs = getSurfaceIntersectionsPairs(points);
	return pairs.map(([p1, p2]) => ({
		id: p1.id + "_" + p2.id,
		points: [p1, p2],
		color: getSurfaceIntersectionsColor(p1, p2),
	}));
});
</script>
