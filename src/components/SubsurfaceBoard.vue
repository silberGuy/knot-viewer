<template>
	<div class="drawing-board">
		<svg>
			<KnotShape
				v-for="knot in knots"
				:key="knot.id"
				:id="knot.id"
				:points="knot.points"
				:isClosed="knot.isClosed"
				:color="knot.color"
			/>
			<KnotIntersections
				:knots="knots"
				:interFlipIds="interFlipIds"
				:clickable="false"
			/>
		</svg>
	</div>
</template>

<script setup lang="ts">
import type { Knot } from "./types.ts";
import KnotIntersections from "./KnotIntersections.vue";
import KnotShape from "./KnotShape.vue";

defineProps<{
	knots: Knot[];
	interFlipIds: Set<string>;
}>();
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
