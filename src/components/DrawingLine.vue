<template>
	<line
		class="drawing-line"
		:x1="line.p1.x"
		:y1="line.p1.y"
		:x2="line.p2.x"
		:y2="line.p2.y"
		:stroke="color || 'black'"
	/>
</template>

<script setup lang="ts">
import type { Line } from "./types";
defineProps<{
	line: Line;
	color?: string;
}>();
</script>
