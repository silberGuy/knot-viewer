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
					:disabled="!hasEnoughPointsForSubsurface"
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
			<BoardInfo @rerender="updateViewerData" />
		</div>
		<KnotViewer
			:drawingData="drawingDataForViewer"
			:key="`${drawingData.knots.map((knot) => knot.id).join('-')}_${
				controlsStore.isSubSurfaceActive
			}`"
		/>
		<div class="app-version">v{{ appVersion }}</div>
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
import BoardInfo from "./components/BoardInfo.vue";
import { useControlsStore } from "./data/controls";
import { useDrawingStore } from "./data/drawing";

const appVersion = __APP_VERSION__;
const controlsStore = useControlsStore();
const drawingStore = useDrawingStore();
const { knots, interFlipIds } = storeToRefs(drawingStore);

const drawingData = computed<DrawingData>(() => ({
	knots: knots.value,
	interFlipIds: interFlipIds.value,
}));

// Fewer than 3 points total can't form a meaningful subsurface loop, so the
// Subsurface tab stays disabled until there's enough to work with.
const hasEnoughPointsForSubsurface = computed(
	() => knots.value.reduce((count, knot) => count + knot.points.length, 0) >= 3,
);

const drawingDataForViewer = ref<DrawingData>(cloneDeep(drawingData.value));

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
	grid-template-rows: 1fr;

	grid-template-areas: "drawing viewer";
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

.board-tabs button:disabled {
	cursor: not-allowed;
	color: #999;
}

.app-version {
	position: absolute;
	bottom: 0.5em;
	right: 0.75em;
	z-index: 1;
	font-size: 0.75em;
	color: #999;
	pointer-events: none;
}
</style>
