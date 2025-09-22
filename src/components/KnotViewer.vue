<template>
	<div class="knot-viewer">
		<TresCanvas>
			<OrbitControls />
			<Line2
				v-for="knot in knotsToRender"
				:points="knot.points3D"
				:key="knot.points3D.flat().join('_')"
				:lineWidth="3"
			/>
			<template v-for="knot in knotsToRender">
				<!-- <Sphere v-for="point in knot.points3D" /> -->
				<Sphere
					v-for="(point, index) in knot.points3D"
					:args="[0.02, 0.02, 0.02]"
					:position="point"
					:color="
						Math.floor((255 * index) / (knot.points3D.length - 1)) * 0x10101
					"
				/>
			</template>
			<ViewerTriangle
				v-for="triangle in surfacesTriangles"
				:points="triangle"
				:key="triangle.flat().join('_')"
				:color="0xffaa00"
			/>
			<!-- <Line2
				v-if="surfaces.length > 0"
				v-for="loop in surfaces"
				:key="JSON.stringify(loop)"
				:points="loop"
				:lineWidth="3"
			/> -->
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
import type { DrawingData, Knot, KnotDiagramPoint } from "./types";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls, Grid, Line2, Sphere } from "@tresjs/cientos";
import {
	combineKnotPointsWithIntersections,
	computeIntersections,
	findPointSurfaceIndex,
	getKnotIntersectionTriangles,
	getLoopSurfaceTriangles,
	getSurfaceLoops,
} from "../utils/drawing";
import ViewerTriangle from "./ViewerTriangle.vue";

const props = defineProps<{
	drawingData: DrawingData;
}>();

const filteredKnots = computed(() =>
	props.drawingData.knots
		.filter((knot) => knot.points.length > 2)
		.map((knot, index) => ({
			knot,
			id: knot.id || (index + 1).toString(),
			points: combineKnotPointsWithIntersections(knot, intersections.value),
		}))
);

const surfaces = computed(() => {
	const allKnotsPoints = filteredKnots.value.map(({ points }) => points).flat();
	const surfaces = getSurfaceLoops(allKnotsPoints);
	return surfaces;
});

const knotsToRender = computed(() => {
	return filteredKnots.value.map((knot) => ({
		...knot,
		points3D: getKnot3DPoints(knot.knot),
	}));
});

const intersections = computed(() =>
	computeIntersections(props.drawingData.knots, props.drawingData.interFlipIds)
);

function get3DCoords(point: KnotDiagramPoint): [number, number, number] {
	let surfaceIndex = findPointSurfaceIndex(surfaces.value, point);
	// TODO: scale and center according to all points in all knots
	if (surfaceIndex === -1)
		console.warn("could not find surface for point", point);
	return [point.x / 300, 0.25 * surfaceIndex, point.y / 300];
}

function getKnot3DPoints(knot: Knot) {
	if (!knot) return [];
	const points = combineKnotPointsWithIntersections(knot, intersections.value);
	return points.map((point) => get3DCoords(point));
}

function getKnotSurfaceTriangles(_knot: Knot) {
	const knotPoints = filteredKnots.value
		.map(({ knot }) =>
			combineKnotPointsWithIntersections(knot, intersections.value)
		)
		.flat();
	const surfacesLoops = getSurfaceLoops(knotPoints);
	const surfaceTriangles = surfacesLoops
		.map((loop) => getLoopSurfaceTriangles(loop, (p) => get3DCoords(p)))
		.flat();

	const interTriangles = getKnotIntersectionTriangles(
		knotPoints,
		(p) => get3DCoords(p),
		surfaces.value
	);

	const intersectionsNotWithin = knotPoints.filter(
		(point) => point.intersection && !point.intersection.isWithinKnot
	);
	const extraTriangles = intersectionsNotWithin
		.map((inter) => {
			const pointIndex = knotPoints.findIndex((p) => p.id === inter.id);
			const interSurfaceIndex = findPointSurfaceIndex(surfaces.value, inter);
			const prevPoint = knotPoints[pointIndex - 1];
			const nextPoint = knotPoints[pointIndex + 1];
			const prevSurfaceIndex = findPointSurfaceIndex(surfaces.value, prevPoint);
			const nextSurfaceIndex = findPointSurfaceIndex(surfaces.value, nextPoint);
			if (
				interSurfaceIndex !== prevSurfaceIndex ||
				interSurfaceIndex !== nextSurfaceIndex
			) {
				return [
					get3DCoords(knotPoints[pointIndex - 1]),
					get3DCoords(inter),
					get3DCoords(knotPoints[pointIndex + 1]),
				];
			}
		})
		.filter((t): t is [number, number, number][] => !!t);

	return [...surfaceTriangles, ...interTriangles, ...extraTriangles];
}

const surfacesTriangles = computed(() => {
	return filteredKnots.value
		.map(({ knot }) => getKnotSurfaceTriangles(knot))
		.flat();
});

// const intersectionTriangles = computed(() => {
// 	const knotPoints = combineKnotPointsWithIntersections(
// 		knot,
// 		intersections.value
// 	);
// 	return getKnotIntersectionTriangles()
// })
</script>
