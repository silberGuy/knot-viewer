<template>
	<template v-for="(line, index) in lines" :key="'line-' + index">
		<slot name="line" :line="line" :index="index">
			<DrawingLine :line="line" :color="color" />
		</slot>
	</template>
	<template v-for="(point, index) in points" :key="'point-' + index">
		<slot name="point" :point="point" :index="index">
			<circle :cx="point.x" :cy="point.y" r="6" :fill="color || 'black'" />
		</slot>
	</template>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Line, Point } from "./types.ts";
import DrawingLine from "./DrawingLine.vue";
import { getKnotLines } from "../utils/drawing.ts";

const props = defineProps<{
	id: string;
	points: Point[];
	isClosed: boolean;
	color?: string;
}>();

defineSlots<{
	line?: (scope: { line: Line; index: number }) => unknown;
	point?: (scope: { point: Point; index: number }) => unknown;
}>();

const lines = computed(() =>
	getKnotLines({ id: props.id, points: props.points, isClosed: props.isClosed })
);
</script>
