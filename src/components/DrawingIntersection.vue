<template>
	<g class="intersection">
		<circle
			:cx="intersectionPoint.x"
			:cy="intersectionPoint.y"
			:r="length / 2"
			fill="white"
		/>
		<line
			class="drawing-line"
			:x1="shortLinePoint1.x"
			:y1="shortLinePoint1.y"
			:x2="shortLinePoint2.x"
			:y2="shortLinePoint2.y"
			:stroke="lineColor || 'black'"
		/>
	</g>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Coords2D, Line } from "./types";
const props = defineProps<{
	topLine: Line;
	intersectionPoint: Coords2D;
	lineColor?: string;
}>();

const length = 13;
const u = computed(() => {
	const dx = props.topLine.p2.x - props.topLine.p1.x;
	const dy = props.topLine.p2.y - props.topLine.p1.y;
	const lineLength = Math.sqrt(dx * dx + dy * dy);
	return {
		x: dx / lineLength,
		y: dy / lineLength,
	};
});

const shortLinePoint1 = computed(() => {
	return {
		x: props.intersectionPoint.x - (u.value.x * length) / 2,
		y: props.intersectionPoint.y - (u.value.y * length) / 2,
	};
});

const shortLinePoint2 = computed(() => {
	return {
		x: props.intersectionPoint.x + (u.value.x * length) / 2,
		y: props.intersectionPoint.y + (u.value.y * length) / 2,
	};
});
</script>

<style scoped>
.intersection {
	cursor: pointer;
}
</style>
