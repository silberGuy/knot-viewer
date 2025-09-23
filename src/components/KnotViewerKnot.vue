<template>
	<Line2 :points="points3D" :key="points3D.flat().join('_')" :lineWidth="3" />
	<Sphere
		v-for="(point, index) in points3D"
		:args="[0.02, 0.02, 0.02]"
		:position="point"
		:color="Math.floor((255 * index) / (points3D.length - 1)) * 0x10101"
	/>
	<ViewerTriangle
		v-for="triangle in surfaceTriangles"
		:points="triangle"
		:key="triangle.flat().join('_')"
		:color="surfaceColor"
	/>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
	findPointSurfaceIndex,
	getKnotIntersectionTriangles,
	getLoopSurfaceTriangles,
} from "../utils/drawing";
import ViewerTriangle from "./ViewerTriangle.vue";
import { Line2, Sphere } from "@tresjs/cientos";
import type { KnotDiagramPoint } from "./types";

const props = defineProps<{
	knotId: string;
	points: KnotDiagramPoint[];
	allSurfaceLoops: KnotDiagramPoint[][];
	surfaceColor?: number;
}>();

const points3D = computed(() => {
	return props.points.map((point) => get3DCoords(point));
});

function get3DCoords(point: KnotDiagramPoint): [number, number, number] {
	let surfaceIndex = findPointSurfaceIndex(props.allSurfaceLoops, point);
	// TODO: scale and center according to all points in all knots
	if (surfaceIndex === -1)
		console.warn("could not find surface for point", point);
	return [point.x / 300, 0.25 * surfaceIndex, point.y / 300];
}

const surfaceTriangles = computed(() => {
	const surfacesLoops = props.allSurfaceLoops.filter(
		(surface) => surface[0] && surface[0].knotId === props.knotId
	);
	const surfaceTriangles = surfacesLoops
		.map((loop) => getLoopSurfaceTriangles(loop, get3DCoords))
		.flat();

	const interTriangles = getKnotIntersectionTriangles(
		props.points,
		get3DCoords,
		surfacesLoops
	);

	const intersectionsNotWithin = props.points.filter(
		(point) => point.intersection && !point.intersection.isWithinKnot
	);
	const extraTriangles = intersectionsNotWithin
		.map((inter) => {
			const pointIndex = props.points.findIndex((p) => p.id === inter.id);
			const interSurfaceIndex = findPointSurfaceIndex(surfacesLoops, inter);
			const prevPoint = props.points[pointIndex - 1];
			const nextPoint = props.points[pointIndex + 1];
			const prevSurfaceIndex = findPointSurfaceIndex(surfacesLoops, prevPoint);
			const nextSurfaceIndex = findPointSurfaceIndex(surfacesLoops, nextPoint);
			if (
				interSurfaceIndex !== prevSurfaceIndex ||
				interSurfaceIndex !== nextSurfaceIndex
			) {
				return [
					get3DCoords(props.points[pointIndex - 1]),
					get3DCoords(inter),
					get3DCoords(props.points[pointIndex + 1]),
				];
			}
		})
		.filter((t): t is [number, number, number][] => !!t);

	return [...surfaceTriangles, ...interTriangles, ...extraTriangles];
});
</script>
