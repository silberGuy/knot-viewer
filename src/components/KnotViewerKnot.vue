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
import type { KnotDiagramPoint } from "./types";
import tinycolor from "tinycolor2";
import {
	getKnotIntersectionTriangles,
	getSurfaceLevelTriangles,
	findPointSurfaceIndex,
	getIntersectionsNotInKnotTriangles,
} from "../utils/surfaces";

const props = defineProps<{
	knotId: string;
	points: KnotDiagramPoint[];
	allSurfaceLevels: KnotDiagramPoint[][];
	surfaceColor?: string;
	showSurfaces: boolean;
}>();

const points3D = computed(() => {
	return props.points.map((point) => get3DCoords(point));
});

const lineColor = computed(() => {
	if (props.showSurfaces) return 0xffffff;
	return props.surfaceColor || "0x123456";
});

const pointsColor = computed(() => {
	if (props.showSurfaces) return 0xdddddd;
	return tinycolor(props.surfaceColor).lighten(20).toString();
});

function get3DCoords(point: KnotDiagramPoint): [number, number, number] {
	let surfaceIndex = findPointSurfaceIndex(props.allSurfaceLevels, point);
	// TODO: scale and center according to all points in all knots
	if (surfaceIndex === -1)
		console.warn("could not find surface for point", point);
	return [point.x / 300, 0.25 * surfaceIndex, point.y / 300];
}

const surfaceTriangles = computed(() => {
	if (!props.showSurfaces) return [];
	const surfacesLevels = props.allSurfaceLevels.filter(
		(surface) => surface[0] && surface[0].knotId === props.knotId
	);
	const surfaceTriangles = surfacesLevels
		.map((level) => getSurfaceLevelTriangles(level))
		.flat();

	const interTriangles = getKnotIntersectionTriangles(
		props.points,
		surfacesLevels
	);

	const extraTriangles = getIntersectionsNotInKnotTriangles(
		props.points,
		surfacesLevels
	);

	return [...surfaceTriangles, ...interTriangles, ...extraTriangles];
});

const triangles3D = computed(() => {
	return surfaceTriangles.value.map((triangle) =>
		triangle.map((point) => get3DCoords(point))
	);
});
</script>
