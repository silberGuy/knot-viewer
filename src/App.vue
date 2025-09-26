<template>
	<div class="app-layout">
		<Topbar
			class="topbar"
			:drawingData="drawingData"
			@onLoadData="onLoadData"
		/>
		<DrawingBoard
			v-model:knots="drawingData.knots"
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
import Topbar from "./components/Topbar/Topbar.vue";

const drawingData = ref<DrawingData>({
	knots: [{ id: "1", points: [], isClosed: false }],
	interFlipIds: new Set<string>(),
});

function onLoadData(value: DrawingData) {
	console.log(value);
	drawingData.value = value;
}
</script>

<style scoped>
.app-layout {
	position: relative;
	width: 100%;
	height: 100%;

	display: grid;
	grid-template-columns: 47% 53%;
	grid-template-rows: 60px 1fr;

	grid-template-areas: "top top" "drawing viewer";
}

.topbar {
	grid-area: top;
}
</style>
