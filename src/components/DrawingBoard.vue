<template>
	<div class="drawing-board">
		<svg @click.stop="onClick" @mousemove="onMouseMove">
			<DrawingKnot
				v-for="(knot, index) in knots"
				:key="knot.id"
				:id="knot.id"
				:color="knot.color"
				v-model:points="knot.points"
				v-model:isClosed="knot.isClosed"
				@update:isClosed="onKnotClose"
				@removeKnot="onRemoveKnot(index)"
			/>
			<DrawingIntersection
				v-for="inter in linesIntersections"
				:topLine="inter.topLine"
				:intersectionPoint="inter.point"
				:lineColor="
					knots.find((k) => k.id === inter.topLine.knotId)?.color || 'black'
				"
				@click.stop="flipIntersection(inter.id)"
			/>
		</svg>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { Knot, Coords2D } from "./types.ts";
import DrawingIntersection from "./DrawingIntersection.vue";
import DrawingKnot from "./DrawingKnot.vue";
import { computeIntersections, getSvgCoords } from "../utils/drawing";
import { useMousePressed, useThrottleFn } from "@vueuse/core";
import { knotsColors } from "../data/colors.ts";

const knots = defineModel<Knot[]>("knots", {
	default: () => [
		{ id: "1", points: [], isClosed: false, color: knotsColors[0] },
	],
});

const knotDrawn = ref(1);

const interFlipIds = defineModel<Set<string>>("interFlipIds", {
	default: () => new Set<string>(),
});

function onClick(event: MouseEvent) {
	const coords = getSvgCoords(event, event.currentTarget as SVGSVGElement);
	if (coords) {
		addPoint(coords);
	}
}

const { pressed } = useMousePressed();
function onMouseMove(event: MouseEvent) {
	if (!pressed.value) return;
	const coords = getSvgCoords(event, event.currentTarget as SVGSVGElement);
	if (!coords) return;
	const closestPointDistance = knots.value
		.map((k) => k.points)
		.flat()
		.reduce((prev, curr) => {
			const currDist = Math.hypot(curr.x - coords.x, curr.y - coords.y);
			return Math.min(prev, currDist);
		}, Infinity);
	if (closestPointDistance < 60) return;
	addPoint(coords);
}

const addPoint = useThrottleFn((coords: Coords2D) => {
	const knotId = knots.value[0].id;
	const pointIndex = knots.value[0].points.length.toString();
	knots.value[0].points.push({
		id: `${knotId}-${pointIndex}`,
		knotId,
		...coords,
	});
}, 100);

const linesIntersections = computed(() =>
	computeIntersections(knots.value, interFlipIds.value)
);

function flipIntersection(intersectionId: string) {
	if (interFlipIds.value.has(intersectionId)) {
		interFlipIds.value.delete(intersectionId);
	} else {
		interFlipIds.value.add(intersectionId);
	}
}

function onKnotClose(closed: boolean) {
	if (closed) {
		knots.value.unshift({
			id: (knotDrawn.value + 1).toString(),
			points: [],
			isClosed: false,
			color: knotsColors[knotDrawn.value % knotsColors.length],
		});
		knotDrawn.value += 1;
	}
}

function onRemoveKnot(index: number) {
	if (knots.value.length <= 1) return;
	knots.value.splice(index, 1);
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
