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
				v-for="(triangle, index) in surfacesTriangles"
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
	getSurfaceLoopsForKnot,
} from "../utils/drawing";
import ViewerTriangle from "./ViewerTriangle.vue";

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
	point: KnotDiagramPoint,
	points: KnotDiagramPoint[],
	surfaces: KnotDiagramPoint[][]
): [number, number, number] {
	let surfaceIndex = findPointSurfaceIndex(surfaces, point);
	// TODO: scale and center according to all points in all knots
	return [point.x / 400, 0.25 * surfaceIndex, point.y / 400];
}

function getKnot3DPoints(knot: Knot) {
	if (!knot) return [];
	const points = combineKnotPointsWithIntersections(knot, intersections.value);
	const surfaces = getSurfaceLoopsForKnot(points);
	return points.map((point) => get3DCoords(point, points, surfaces));
}

function getKnotSurfaceTriangles(knot: Knot) {
	const knotPoints = combineKnotPointsWithIntersections(
		knot,
		intersections.value
	);
	const surfacesLoops = getSurfaceLoopsForKnot(knotPoints);
	const surfaceTriangles = surfacesLoops
		.map((loop) =>
			getLoopSurfaceTriangles(loop, (p) =>
				get3DCoords(p, knotPoints, surfacesLoops)
			)
		)
		.flat();

	const interTriangles = getKnotIntersectionTriangles(knotPoints, (p) =>
		get3DCoords(p, knotPoints, surfacesLoops)
	);
	return [...surfaceTriangles, ...interTriangles];
}

const surfacesTriangles = computed(() => {
	return knotsToRender.value
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
