<template>
	<div class="app-layout">
		<DrawingBoard
			v-model:knots="drawingData.knots"
			v-model:interFlipIds="drawingData.interFlipIds"
			@rerender="updateViewerData"
		/>
		<KnotViewer
			:drawingData="drawingDataForViewer"
			:key="`${drawingData.knots.map((knot) => knot.id).join('-')}_${
				controlsStore.showSubSurface
			}`"
		/>
		<Topbar
			class="topbar"
			:drawingData="drawingData"
			@onLoadData="onLoadData"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import cloneDeep from "clone-deep";
import type { DrawingData } from "./components/types";
import DrawingBoard from "./components/DrawingBoard.vue";
import KnotViewer from "./components/KnotViewer.vue";
import Topbar from "./components/Topbar/Topbar.vue";
import { useControlsStore } from "./data/controls";
import { useDrawingStore } from "./data/drawing";

const controlsStore = useControlsStore();
const drawingStore = useDrawingStore();

const drawingData = computed(() => drawingStore.getDrawingData());

const drawingDataForViewer = ref<DrawingData>(
	getCenteredData(cloneDeep(drawingData.value))
);

function onLoadData(value: DrawingData) {
	drawingStore.setDrawingData(value);
	updateViewerData();
}

function updateViewerData() {
	drawingDataForViewer.value = getCenteredData(cloneDeep(drawingData.value));
}

function getCenteredData(data: DrawingData): DrawingData {
	const allPoints = data.knots.flatMap((knot) => knot.points);
	if (allPoints.length === 0) return data;
	const minX = Math.min(...allPoints.map((pt) => pt.x));
	const minY = Math.min(...allPoints.map((pt) => pt.y));
	const maxX = Math.max(...allPoints.map((pt) => pt.x));
	const maxY = Math.max(...allPoints.map((pt) => pt.y));
	const offsetX = minX + (maxX - minX) / 2;
	const offsetY = minY + (maxY - minY) / 2;

	const knots = data.knots.map((knot) => {
		const points = knot.points.map((pt) => ({
			...pt,
			x: (pt.x - offsetX) / 2,
			y: (pt.y - offsetY) / 2,
		}));
		return { ...knot, points };
	});
	return { ...data, knots };
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
