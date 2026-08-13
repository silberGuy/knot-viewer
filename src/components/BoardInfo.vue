<template>
	<div class="board-info">
		<div class="board-info-icon-wrapper">
			<button class="board-info-icon" aria-label="Board controls help">
				i
			</button>
			<div class="board-info-tooltip">
				<div v-if="controlsStore.activeTab === 'drawing'">
					<p>
						Hold <span class="key">Shift</span> to move knot as one<br />
						Hold <span class="key">Alt</span> and click to remove points<br />
						Use both to remove a whole knot
					</p>
				</div>
				<div v-else>
					<p>
						Click an <span class="key">arrow</span> to control the Secondary
						loop's direction. Click a <span class="key">point</span> to force
						the Secondary loop through it.
					</p>
				</div>
			</div>
		</div>
		<button
			class="board-info-button"
			:class="{ disabled: !canSave }"
			@click="saveToFile"
		>
			Save
		</button>
		<button class="board-info-button" @click="fileInput?.click()">Load</button>
		<input
			type="file"
			accept=".json"
			style="display: none"
			@change="loadFromFile"
			ref="fileInput"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { CrossingWalkDirection } from "./types";
import { useControlsStore } from "../data/controls";
import { useDrawingStore } from "../data/drawing";
import { useSecondaryWalkStore } from "../data/secondary-walk";

const emit = defineEmits<{
	(e: "rerender"): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);

const controlsStore = useControlsStore();
const drawingStore = useDrawingStore();
const secondaryWalkStore = useSecondaryWalkStore();

const canSave = computed(() => {
	const points = drawingStore.knots.map((knot) => knot.points).flat();
	return points.length > 0;
});

function saveToFile() {
	if (!canSave.value) return;
	const dataToSave = {
		...drawingStore.getDrawingData(),
		interFlipIds: Array.from(drawingStore.interFlipIds || []),
		crossingWalkDirections: Array.from(
			secondaryWalkStore.crossingWalkDirections,
		),
		selectedStartPointId: secondaryWalkStore.selectedStartPointId,
	};
	const dataStr =
		"data:text/json;charset=utf-8," +
		encodeURIComponent(JSON.stringify(dataToSave));
	const downloadAnchorNode = document.createElement("a");
	downloadAnchorNode.setAttribute("href", dataStr);
	downloadAnchorNode.setAttribute("download", "knot_drawing.json");
	document.body.appendChild(downloadAnchorNode); // required for firefox
	downloadAnchorNode.click();
	downloadAnchorNode.remove();
}

function loadFromFile(event: Event) {
	const input = event.target as HTMLInputElement;
	if (!input.files || input.files.length === 0) return;
	const file = input.files[0];
	const reader = new FileReader();
	reader.onload = (e) => {
		if (!e.target?.result) return;
		try {
			const json = JSON.parse(e.target.result as string);
			if (json.interFlipIds && Array.isArray(json.interFlipIds)) {
				json.interFlipIds = new Set<string>(json.interFlipIds);
			}
			drawingStore.setDrawingData(json);
			secondaryWalkStore.restore(
				Array.isArray(json.crossingWalkDirections)
					? new Map<string, CrossingWalkDirection>(json.crossingWalkDirections)
					: new Map(),
				typeof json.selectedStartPointId === "string"
					? json.selectedStartPointId
					: undefined,
			);
			emit("rerender");
		} catch (error) {
			console.error("Error parsing JSON:", error);
		}
	};
	reader.readAsText(file);
}
</script>

<style scoped>
.board-info {
	position: absolute;
	bottom: 1em;
	left: 1em;
	z-index: 1;
	display: flex;
	align-items: center;
	gap: 0.5em;
}

.board-info-icon-wrapper {
	position: relative;
}

.board-info-icon {
	width: 1.6em;
	height: 1.6em;
	padding: 0.2em;
	border-radius: 50%;
	box-sizing: border-box;
	border: none;
	background: rgba(255, 255, 255, 0.85);
	box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
	border: solid 1px #d1d1d1;
	color: #1e1e1e;
	font-weight: bold;
	font-style: italic;
	cursor: default;
	display: flex;
	align-items: center;
	justify-content: center;
}

.board-info-tooltip {
	position: absolute;
	bottom: 2em;
	left: 0;
	display: none;
	white-space: nowrap;
	padding: 0.5em 0.75em;
	background: rgba(255, 255, 255, 0.85);
	color: #1e1e1e;
	border-radius: 8px;
	font-weight: bold;
}

.board-info-tooltip p {
	margin: 0;
}

.board-info-icon-wrapper:hover .board-info-tooltip {
	display: block;
}

span.key {
	background-color: rgba(30, 30, 30, 0.15);
	padding: 0.2em 0.4em;
	border-radius: 4px;
	font-family: monospace;
}

.board-info-button {
	background: rgba(255, 255, 255, 0.85);
	box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
	border: solid 1px #d1d1d1;
	color: #1e1e1e;
	border: none;
	padding: 0.4em 1em;
	border-radius: 7px;
	font-weight: bold;
	cursor: pointer;
}

.board-info-button:hover:not(.disabled) {
	background: rgba(240, 240, 240, 1);
}

.board-info-button.disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
</style>
