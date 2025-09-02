<template>
	<DrawingLine
		v-for="(line, index) in lines"
		:key="'line-' + index"
		:index="index"
		:line="line"
		@click.stop="onLineClick(line, $event)"
	/>
	<DrawingPoint
		v-for="(point, index) in points"
		:key="'point-' + index"
		:coords="point"
		@update:coords="
			(newCoords) => (points[index] = { ...points[index], ...newCoords })
		"
		@click.stop="onPointClick(index)"
	/>
	<!-- <circle
		v-for="(point, index) in points"
		class="point"
		:key="index"
		:cx="point.x"
		:cy="point.y"
		r="5"
		fill="red"
	/> -->
</template>

<script setup lang="ts">
import { computed, toRefs } from "vue";
import type { Line, Point } from "./types.ts";
import DrawingLine from "./DrawingLine.vue";
import { getLoopLines, getSvgCoords } from "../utils/drawing.ts";
import DrawingPoint from "./DrawingPoint.vue";

const props = defineProps<{
	id: string;
}>();

const points = defineModel<Point[]>("points", {
	type: Array as () => Point[],
	required: true,
});
const { id } = toRefs(props);

const isClosed = defineModel<boolean>("isClosed", {
	type: Boolean,
	default: false,
});

const lines = computed(() => {
	return getLoopLines({
		id: id.value,
		points: points.value,
		isClosed: isClosed.value,
	});
});

function onPointClick(index: number) {
	if (index === 0 && !isClosed.value) {
		isClosed.value = true;
	}
}

function onLineClick(line: Line, clickEvent: MouseEvent) {
	const target = clickEvent.currentTarget as SVGElement;
	const svg = target?.closest("svg") as SVGSVGElement;
	if (!svg) return;
	const coords = getSvgCoords(clickEvent, svg);
	if (coords) {
		const pointIndex = points.value.findIndex(
			(p) => p.id === line.p1.id || p.id === line.p2.id
		);
		if (pointIndex !== -1) {
			points.value.splice(pointIndex + 1, 0, {
				id: points.value.length.toString(),
				...coords,
			});
		}
	}
}
</script>
