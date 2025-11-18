<template>
	<ViewerLine
		:points="knot.points"
		:color="lineColor"
		:pointsColor="pointsColor"
		:width="lineWidth"
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
import type { Knot3D, SubSurface, SubSurfacesKnot } from "./types";
import tinycolor from "tinycolor2";
import ViewerLine from "./ViewerLine.vue";

const props = defineProps<{
	knot: Knot3D | SubSurfacesKnot | SubSurface;
	surfaceColor?: string;
	showSurfaces: boolean;
	lineWidth?: number;
}>();

const lineColor = computed(() => {
	if (props.showSurfaces) return 0xffffff;
	return props.surfaceColor || "0x123456";
});

const pointsColor = computed(() => {
	if (props.showSurfaces) return 0xdddddd;
	return tinycolor(props.surfaceColor).lighten(20).toString();
});

const triangles3D = computed(() => {
	if (!props.showSurfaces) return [];
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
