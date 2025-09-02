<template>
	<div class="drawing-board">
		<svg @click="addPoint" @mousedown.stop="onMouseDown">
			<DrawingLoop
				v-for="loop in loops"
				:key="loop.id"
				:id="loop.id"
				v-model:points="loop.points"
				v-model:isClosed="loop.isClosed"
				@update:isClosed="onLoopClose"
			/>
			<DrawingIntersection
				v-for="inter in linesIntersections"
				:topLine="inter.topLine"
				:intersectionPoint="inter.point"
				@click.stop="flipIntersection(inter.id)"
			/>
		</svg>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { Loop } from "./types.ts";
import DrawingIntersection from "./DrawingIntersection.vue";
import DrawingLoop from "./DrawingLoop.vue";
import { computeIntersections } from "../utils/drawing";

const loops = defineModel<Loop[]>("loops", {
	default: () => [{ id: "1", points: [], isClosed: false }],
});

const interFlipIds = defineModel<Set<string>>("interFlipIds", {
	default: () => new Set<string>(),
});

function addPoint(event: MouseEvent) {
	const svg = event.currentTarget as SVGSVGElement;
	const point = svg.createSVGPoint();
	point.x = event.clientX;
	point.y = event.clientY;
	const ctm = svg.getScreenCTM();
	if (ctm) {
		const { x, y } = point.matrixTransform(ctm.inverse());
		loops.value[0].points.push({
			id: loops.value[0].points.length.toString(),
			x,
			y,
		});
	}
}

const linesIntersections = computed(() =>
	computeIntersections(loops.value, interFlipIds.value)
);

function flipIntersection(intersectionId: string) {
	if (interFlipIds.value.has(intersectionId)) {
		interFlipIds.value.delete(intersectionId);
	} else {
		interFlipIds.value.add(intersectionId);
	}
}

function onLoopClose(closed: boolean) {
	if (closed) {
		loops.value.unshift({
			id: (loops.value.length + 1).toString(),
			points: [],
			isClosed: false,
		});
	}
}
</script>

<style scoped>
.drawing-board {
	position: relative;
	width: 100%;
	height: 100%;
}

svg {
	border: 1px solid #ccc;
	background-color: #f9f9f9;
	width: 100%;
	height: 100%;
}
</style>
