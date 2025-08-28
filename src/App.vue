<template>
	<div class="svg-wrapper">
		<svg @click="addPoint($event)">
			<DrawingLoop
				v-for="loop in loops"
				:key="loop.id"
				:id="loop.id"
				:points="loop.points"
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
import type { Loop } from "./components/types";
import DrawingIntersection from "./components/DrawingIntersection.vue";
import DrawingLoop from "./components/DrawingLoop.vue";
import { getIntersection, getLoopLines } from "./utils/drawing";

const loops = ref<Loop[]>([{ id: "1", points: [], isClosed: false }]);
const interFlipIds = ref(new Set<string>());

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

const linesIntersections = computed(() => {
	const intersections = [];
	const lines = loops.value
		.map((loop) =>
			getLoopLines({
				id: loop.id,
				points: loop.points,
				isClosed: loop.isClosed,
			})
		)
		.flat();
	for (let i = 0; i < lines.length; i++) {
		for (let j = i + 1; j < lines.length; j++) {
			const linei = lines[i];
			const linej = lines[j];
			const intersection = getIntersection(linei, linej);
			if (intersection) {
				const id = `inter-${linei.id}-${linej.id}`;
				const topLine = interFlipIds.value.has(id) ? linej : linei;
				const bottomLine = interFlipIds.value.has(id) ? linei : linej;
				intersections.push({
					id,
					topLine,
					bottomLine,
					point: intersection,
				});
			}
		}
	}
	return intersections;
});

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
.svg-wrapper {
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

.point {
	cursor: pointer;
}
</style>
