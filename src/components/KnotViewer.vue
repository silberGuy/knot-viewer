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
			<Line2
				v-for="(knot, index) in knotsToRender"
				:points="knot.points"
				:key="`${index}_${knot.points.length}_${knot.isClosed}`"
				:lineWidth="3"
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
import type { Coords2D, Coords3D, DrawingData } from "./types";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls, Grid, CatmullRomCurve3, Line2 } from "@tresjs/cientos";
import { computeIntersections } from "../utils/drawing";
import { line } from "@tresjs/cientos/dist/core/abstractions/Lensflare/constants.js";

const props = defineProps<{
	drawingData: DrawingData;
}>();

const filteredKnots = computed(() =>
	props.drawingData.knots.filter((knot) => knot.points.length > 2)
);

const knotsToRender = computed(() => {
	return filteredKnots.value.map((knot, index) => ({
		...knot,
		id: knot.id || (index + 1).toString(),
		points: getKnot3DPoints(knot.id),
	}));
});

const intersections = computed(() =>
	computeIntersections(props.drawingData.knots, props.drawingData.interFlipIds)
);

function getKnot3DPoints(knotId: string) {
	// TODO: scale and center according to all points in all knots
	const index = filteredKnots.value.findIndex((l) => l.id === knotId);
	const knot = filteredKnots.value[index];
	if (!knot) return [];
	const z = getZForId(knot.id);
	const knotIntersections = intersections.value.filter(
		(inter) =>
			inter.topLineKnotId === knotId || inter.bottomLineKnotId === knotId
	);
	let points: (Coords2D & { z: number; id?: string })[] = knot.points.map(
		(p) => ({
			...p,
			z,
		})
	);
	if (knot.isClosed && points.length > 2) {
		points.push({ ...points[0] });
	}
	for (let inter of knotIntersections.reverse()) {
		const isTop = inter.topLineKnotId === knotId;
		const interLinePoints = isTop
			? inter.topLinePoints
			: inter.bottomLinePoints;
		const p1IndexInPoints = points.findIndex(
			(p) => p.id === interLinePoints[0].id
		);
		const p2IndexInPoints = points.findIndex(
			(p) => p.id === interLinePoints[1].id
		);
		const knotPointIndex = Math.min(p1IndexInPoints, p2IndexInPoints) + 1;
		let interZ =
			getZForId(isTop ? inter.bottomLineKnotId : inter.topLineKnotId) +
			(isTop ? 0.2 : -0.2);
		const interPoint = { ...inter.point, z: interZ };
		points = [
			...points.slice(0, knotPointIndex),
			interPoint,
			...points.slice(knotPointIndex, Infinity),
		];
	}
	return points.map(({ x, y, z }) => [x / 400, z, y / 400]);
}

function getZForId(knotId: string) {
	return 0.5;
	const index = knotsToRender.value.findIndex((l) => l.id === knotId);
	return (index + 1) * 0.3;
}
</script>
