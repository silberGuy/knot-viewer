<template>
	<!-- <line
		:key="index"
		:x1="line.p1.x"
		:y1="line.p1.y"
		:x2="line.p2.x"
		:y2="line.p2.y"
		stroke="white"
		stroke-width="8"
	/> -->
	<line
		:x1="line.p1.x"
		:y1="line.p1.y"
		:x2="line.p2.x"
		:y2="line.p2.y"
		stroke="blue"
		stroke-width="2"
	/>
</template>

<script setup lang="ts">
import type { Line } from "./types";
defineProps<{
	line: Line;
}>();
</script>
