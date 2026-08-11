<template>
	<ViewerLine
		:points="knot.points"
		:color="lineColor"
		:pointsColor="pointsColor"
		:width="lineWidth"
		:closed="isClosed"
	/>
	<ViewerTriangle
		v-for="triangle in triangles3D"
		:points="triangle"
		:key="triangle.flat().join('_')"
		:color="surfaceColor"
	/>
	<!-- <ViewerLine
		v-for="triangle in knot.surfaceTriangles"
		:key="
			triangle.id +
			triangle.points
				.map((p) => p.coords)
				.flat()
				.join('_')
		"
		:points="triangle.points"
		color="#777777"
		pointsColor="#666666"
	/> -->
</template>

<script setup lang="ts">
import { computed } from "vue";
import ViewerTriangle from "./ViewerTriangle.vue";
import type { Knot3D, SubsurfaceLoop, SubSurfacesKnot } from "./types";
import tinycolor from "tinycolor2";
import ViewerLine from "./ViewerLine.vue";

const props = defineProps<{
	knot: Knot3D | SubSurfacesKnot | SubsurfaceLoop;
	surfaceColor?: string;
	showSurfaces: boolean;
	lineWidth?: number;
}>();

const lineColor = computed(() => {
	if (props.showSurfaces)
		return tinycolor(props.surfaceColor).lighten(20).toString();
	return props.surfaceColor || "0x123456";
});

const pointsColor = computed(() => {
	if (props.showSurfaces) return 0xdddddd;
	return tinycolor(props.surfaceColor).lighten(20).toString();
});

// Only a SubsurfaceLoop needs ViewerLine to add its own closing
// segment: its walk has no notion of a duplicate closing point, unlike Knot3D/
// SubSurfacesKnot, whose point lists already end with one for a closed knot
// (combineKnotPointsWithIntersections in drawing.ts) - asking ViewerLine to close those
// too would draw a second, redundant closing segment on top of that existing one.
const isClosed = computed(() => !("diagramKnot" in props.knot));

const triangles3D = computed(() => {
	if (!props.showSurfaces || !("surfaceTriangles" in props.knot)) return [];
	return props.knot.surfaceTriangles.map(
		(triangle) =>
			triangle.points.map((point) => point.coords) as [
				[number, number, number],
				[number, number, number],
				[number, number, number]
			]
	);
});
</script>
