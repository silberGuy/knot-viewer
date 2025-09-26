<template>
	<DrawingLine
		v-for="(line, index) in lines"
		:key="'line-' + index"
		:index="index"
		:line="line"
		@click.stop="onLineClick(line, $event)"
		:color="props.color"
	/>
	<DrawingPoint
		v-for="(point, index) in points"
		:key="'point-' + index"
		:coords="point"
		:id="point.id"
		:color="props.color"
		@update:coords="
			(newCoords) => (points[index] = { ...points[index], ...newCoords })
		"
		@click.stop="onPointClick(index)"
		@moveKnot="onMoveKnot"
		@click.alt.stop="removePoint(index)"
		@click.shift.alt.stop="emit('removeKnot')"
	/>
</template>

<script setup lang="ts">
import { computed, toRefs } from "vue";
import type { Line, Point } from "./types.ts";
import DrawingLine from "./DrawingLine.vue";
import { getKnotLines, getSvgCoords } from "../utils/drawing.ts";
import DrawingPoint from "./DrawingPoint.vue";

const props = defineProps<{
	id: string;
	color?: string;
}>();

const emit = defineEmits<{
	(event: "removeKnot"): void;
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
	return getKnotLines({
		id: id.value,
		points: points.value,
		isClosed: isClosed.value,
	});
});

function onPointClick(index: number) {
	if (index === 0 && !isClosed.value && points.value.length > 2) {
		isClosed.value = true;
	}
}

function removePoint(index: number) {
	if (points.value.length <= 1) return;
	points.value.splice(index, 1);
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
				knotId: id.value,
			});
		}
	}
}

function onMoveKnot(delta: { x: number; y: number }) {
	points.value = points.value.map((point) => ({
		...point,
		x: point.x + delta.x,
		y: point.y + delta.y,
	}));
}
</script>
