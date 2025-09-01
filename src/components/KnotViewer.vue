<template>
	<div class="knot-viewer">
		<TresCanvas>
			<OrbitControls />
			<CatmullRomCurve3
				v-for="(loop, index) in loopsToRender"
				:points="getLoop3DPoints(loop.id)"
				:key="`${index}_${loop.points.length}_${loop.isClosed}`"
				:segments="loop.points.length * 4"
			/>
			<!-- <Line2
				v-for="(loop, index) in loopsToRender"
				:points="getLoop3DPoints(loop.id)"
				:key="`${index}_${loop.points.length}_${loop.isClosed}`"
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
import type { DrawingData } from "./types";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls, Grid, CatmullRomCurve3, Line2 } from "@tresjs/cientos";
import { computeIntersections } from "../utils/drawing";

const props = defineProps<{
	drawingData: DrawingData;
}>();

const loopsToRender = computed(() =>
	props.drawingData.loops.filter((loop) => loop.points.length > 2)
);

const intersections = computed(() =>
	computeIntersections(props.drawingData.loops, props.drawingData.interFlipIds)
);

function getLoop3DPoints(loopId: string) {
	// TODO: scale and center according to all points in all loops
	const index = loopsToRender.value.findIndex((l) => l.id === loopId);
	const loop = loopsToRender.value[index];
	if (!loop) return [];
	const z = getZForId(loop.id);
	const loopIntersections = intersections.value.filter(
		(inter) =>
			inter.topLineLoopId === loopId || inter.bottomLineLoopId === loopId
	);
	let points: { x: number; y: number; z: number; id?: string }[] =
		loop.points.map((p) => ({
			...p,
			z,
		}));
	if (loop.isClosed && points.length > 2) {
		points.push({ ...points[0] });
	}
	for (let inter of loopIntersections.reverse()) {
		const isTop = inter.topLineLoopId === loopId;
		const interLinePoints = isTop
			? inter.topLinePoints
			: inter.bottomLinePoints;
		const p1IndexInPoints = points.findIndex(
			(p) => p.id === interLinePoints[0].id
		);
		const p2IndexInPoints = points.findIndex(
			(p) => p.id === interLinePoints[1].id
		);
		const loopPointIndex = Math.min(p1IndexInPoints, p2IndexInPoints) + 1;
		let interZ =
			getZForId(isTop ? inter.bottomLineLoopId : inter.topLineLoopId) +
			(isTop ? 0.2 : -0.2);
		const interPoint = { ...inter.point, z: interZ };
		points = [
			...points.slice(0, loopPointIndex),
			interPoint,
			...points.slice(loopPointIndex, Infinity),
		];
	}
	return points.map(({ x, y, z }) => [x / 400, z, y / 400]);
}

function getZForId(loopId: string) {
	return 0.5;
	const index = loopsToRender.value.findIndex((l) => l.id === loopId);
	return (index + 1) * 0.3;
}
</script>
