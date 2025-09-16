<template>
	<div class="knot-viewer">
		<TresCanvas>
			<OrbitControls />
			<!-- <CatmullRomCurve3
				v-for="(knot, index) in knotsToRender"
				:points="knot.points"
				:key="`${index}_${knot.points.length}_${knot.isClosed}`"
				:segments="knot.points.length"
				:lineWidth="2"
			/> -->
			<!-- <Line2
				v-for="knot in knotsToRender"
				:points="knot.points3D"
				:key="knot.points3D.flat().join('_')"
				:lineWidth="3"
			/> -->
			<Line2
				v-for="(triangle, index) in surfacesTriangles"
				:points="triangle"
				:key="triangle.flat().join('_')"
				:color="0x223344 * 4 * index"
				:lineWidth="2"
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
import type { Coords2D, DrawingData, Knot } from "./types";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls, Grid, Line2 } from "@tresjs/cientos";
import {
	combineKnotPointsWithIntersections,
	computeIntersections,
	getLoopSurfaceTriangles,
	getSurfaceLoopsForKnot,
} from "../utils/drawing";

const props = defineProps<{
	drawingData: DrawingData;
}>();

const filteredKnots = computed(() =>
	props.drawingData.knots.filter((knot) => knot.points.length > 2)
);

const knotsToRender = computed(() => {
	return filteredKnots.value.map((knot, index) => ({
		knot,
		id: knot.id || (index + 1).toString(),
		points3D: getKnot3DPoints(knot),
	}));
});

const intersections = computed(() =>
	computeIntersections(props.drawingData.knots, props.drawingData.interFlipIds)
);

function get3DCoords(
	point: Coords2D,
	surfaceIndex: number
): [number, number, number] {
	// TODO: scale and center according to all points in all knots
	return [point.x / 400, 0.25 * surfaceIndex, point.y / 400];
}

function getKnot3DPoints(knot: Knot) {
	if (!knot) return [];
	const points = combineKnotPointsWithIntersections(knot, intersections.value);
	const surfaces = getSurfaceLoopsForKnot(points);
	return points.map((point) => {
		const { id, intersection, intersectionParallelId, isTop } = point;
		let surfaceIndex = surfaces.findIndex((s) => s.some((sp) => sp.id === id));
		if (intersection) {
			const interSurfaces = [
				surfaces.findIndex((s) => s.some((sp) => sp.id === id)),
				surfaces.findIndex((s) =>
					s.some((sp) => sp.id === intersectionParallelId)
				),
			];
			surfaceIndex = isTop
				? Math.max(...interSurfaces)
				: Math.min(...interSurfaces);
		}
		return get3DCoords(point, surfaceIndex);
	});
}

// const surfaces = computed(() => {
// 	if (filteredKnots.value.length === 0) return [];

// 	const knotPoints = combineKnotPointsWithIntersections(
// 		filteredKnots.value[0],
// 		intersections.value
// 	);
// 	const surfaceLoops = getSurfaceLoopsForKnot(knotPoints);
// 	return surfaceLoops.map((loop, loopIndex) => {
// 		const closedLoop = [...loop, loop[0]];
// 		return closedLoop.map((point) => {
// 			const z = 0.1 * loopIndex;
// 			const coords = [point.x / 400, z, point.y / 400];
// 			return coords as [number, number, number];
// 		});
// 	});
// });

function getKnotSurfaceTriangles(knot: Knot) {
	const knotPoints = combineKnotPointsWithIntersections(
		knot,
		intersections.value
	);
	const surfacesLoops = getSurfaceLoopsForKnot(knotPoints);
	return surfacesLoops
		.map((loop, loopIndex) => {
			const points3D = loop.map((p) => get3DCoords(p, loopIndex));
			return getLoopSurfaceTriangles(points3D);
		})
		.flat();
}

const surfacesTriangles = computed(() => {
	return knotsToRender.value
		.map(({ knot }) => getKnotSurfaceTriangles(knot))
		.flat();
});
</script>
