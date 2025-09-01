<template>
	<div class="app-layout">
		<DrawingBoard
			v-model:loops="drawingData.loops"
			v-model:interFlipIds="drawingData.interFlipIds"
		/>
		<KnotViewer :drawingData="drawingData" />
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { DrawingData } from "./components/types";
import DrawingBoard from "./components/DrawingBoard.vue";
import KnotViewer from "./components/KnotViewer.vue";

const drawingData = ref<DrawingData>({
	loops: [{ id: "1", points: [], isClosed: false }],
	interFlipIds: new Set<string>(),
});
</script>

<style scoped>
.app-layout {
	position: relative;
	width: 100%;
	height: 100%;

	display: grid;
	grid-template-columns: 35% 50%;
}
</style>
