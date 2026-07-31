<template>
	<div class="app-layout">
		<Topbar
			class="topbar"
			:drawingData="drawingData"
			@onLoadData="onLoadData"
		/>
		<div class="board-pane">
			<div class="board-tabs">
				<button
					:class="{ active: activeTab === 'drawing' }"
					@click="activeTab = 'drawing'"
				>
					Drawing
				</button>
				<button
					:class="{ active: activeTab === 'subsurface' }"
					@click="activeTab = 'subsurface'"
				>
					Subsurface
				</button>
			</div>
			<DrawingBoard
				v-if="activeTab === 'drawing'"
				v-model:knots="drawingData.knots"
				v-model:interFlipIds="drawingData.interFlipIds"
				@rerender="updateViewerData"
			/>
			<SubsurfaceBoard
				v-else
				:knots="drawingData.knots"
				:interFlipIds="drawingData.interFlipIds"
			/>
		</div>
		<KnotViewer
			:drawingData="drawingDataForViewer"
			:key="drawingData.knots.map((knot) => knot.id).join('-')"
		/>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import cloneDeep from "clone-deep";
import type { DrawingData } from "./components/types";
import DrawingBoard from "./components/DrawingBoard.vue";
import SubsurfaceBoard from "./components/SubsurfaceBoard.vue";
import KnotViewer from "./components/KnotViewer.vue";
import Topbar from "./components/Topbar/Topbar.vue";
import { knotsColors } from "./data/colors";

const activeTab = ref<"drawing" | "subsurface">("drawing");

const drawingData = ref<DrawingData>({
	knots: [{ id: "1", points: [], isClosed: false, color: knotsColors[0] }],
	interFlipIds: new Set<string>(),
});

const drawingDataForViewer = ref<DrawingData>(
	getCenteredData(cloneDeep(drawingData.value)),
);

function onLoadData(value: DrawingData) {
	console.log(value);
	drawingData.value = value;
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

.board-pane {
	grid-area: drawing;
	position: relative;
	min-height: 0;
}

.board-tabs {
	position: absolute;
	top: 0.75em;
	left: 1em;
	z-index: 1;
	display: flex;
	gap: 0.25em;
	padding: 0.25em;
	background: lightblue;
	border-radius: 8px;
}

.board-tabs button {
	padding: 0.4em 1em;
	border: none;
	background: transparent;
	cursor: pointer;
	border-radius: 6px;
	font-weight: bold;
	color: #333;
}

.board-tabs button.active {
	background: #fff;
}
</style>
