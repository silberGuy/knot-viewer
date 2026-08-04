<template>
	<div class="app-layout">
		<div class="board-pane">
			<div class="board-tabs">
				<button
					:class="{ active: controlsStore.activeTab === 'drawing' }"
					@click="controlsStore.activeTab = 'drawing'"
				>
					Drawing
				</button>
				<button
					:class="{ active: controlsStore.activeTab === 'subsurface' }"
					@click="controlsStore.activeTab = 'subsurface'"
				>
					Subsurface
				</button>
			</div>
			<DrawingBoard
				v-if="controlsStore.activeTab === 'drawing'"
				v-model:knots="knots"
				v-model:interFlipIds="interFlipIds"
				@rerender="updateViewerData"
			/>
			<SubsurfaceBoard
				v-else
				:knots="drawingDataForViewer.knots"
				:interFlipIds="drawingDataForViewer.interFlipIds"
			/>
		</div>
		<KnotViewer
			:drawingData="drawingDataForViewer"
			:key="`${drawingData.knots.map((knot) => knot.id).join('-')}_${
				controlsStore.isSubSurfaceActive
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
import { storeToRefs } from "pinia";
import cloneDeep from "clone-deep";
import type { DrawingData } from "./components/types";
import DrawingBoard from "./components/DrawingBoard.vue";
import SubsurfaceBoard from "./components/SubsurfaceBoard.vue";
import KnotViewer from "./components/KnotViewer.vue";
import Topbar from "./components/Topbar/Topbar.vue";
import { useControlsStore } from "./data/controls";
import { useDrawingStore } from "./data/drawing";

const controlsStore = useControlsStore();
const drawingStore = useDrawingStore();
const { knots, interFlipIds } = storeToRefs(drawingStore);

const drawingData = computed<DrawingData>(() => ({
	knots: knots.value,
	interFlipIds: interFlipIds.value,
}));

const drawingDataForViewer = ref<DrawingData>(cloneDeep(drawingData.value));

function onLoadData(value: DrawingData) {
	drawingStore.setDrawingData(value);
	updateViewerData();
}

function updateViewerData() {
	drawingDataForViewer.value = cloneDeep(drawingData.value);
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
