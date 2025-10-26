<template>
	<Line2
		:points="points3D"
		:key="points3D.flat().join('_')"
		:lineWidth="4"
		:color="lineColor"
	/>
	<Sphere
		v-for="point in points3D"
		:args="[0.02, 0.02, 0.02]"
		:position="point"
		:color="pointsColor"
	/>
	<ViewerTriangle
		v-for="triangle in triangles3D"
		:points="triangle"
		:key="triangle.flat().join('_')"
		:color="surfaceColor"
	/>
</template>

<script setup lang="ts">
import { computed } from "vue";
import ViewerTriangle from "./ViewerTriangle.vue";
import { Line2, Sphere } from "@tresjs/cientos";
import type { Knot3D } from "./types";
import tinycolor from "tinycolor2";

const props = defineProps<{
	knot3D: Knot3D;
	surfaceColor?: string;
	showSurfaces: boolean;
}>();

const points3D = computed(() => {
	return props.knot3D.points.map((point) => point.coords);
});

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
	return props.knot3D.surfaceTriangles.map(
		(triangle) =>
			triangle.points.map((point) => point.coords) as [
				[number, number, number],
				[number, number, number],
				[number, number, number]
			]
	);
});
</script>
