<template>
	<div class="topbar">
		<button :class="{ disabled: !canSave }" @click="saveToFile">Save</button>
		<button @click="fileInput?.click()">Load</button>
		<input
			type="file"
			accept=".json"
			style="display: none"
			@change="loadFromFile"
			ref="fileInput"
		/>

		<div v-if="controlsStore.activeTab === 'drawing'">
			Hold <span class="key">Shift</span> to move knot as one,
			<span class="key">Alt</span> to remove points
		</div>
		<div v-else>
			Click an <span class="key">arrow</span> to control the Subsurface
			loop's direction. Click a <span class="key">point</span> to force
			the Subsurface loop through it.
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { CrossingWalkDirection, DrawingData } from "../types";
import { useControlsStore } from "../../data/controls";
import { useDrawingStore } from "../../data/drawing";
import { useSubsurfaceWalkStore } from "../../data/subsurface-walk";

const props = defineProps<{
	drawingData?: DrawingData;
}>();

const emit = defineEmits<{
	(e: "onLoadData", value: DrawingData): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);

const controlsStore = useControlsStore();
const drawingStore = useDrawingStore();
const subsurfaceWalkStore = useSubsurfaceWalkStore();

const canSave = computed(() => {
	const points = props.drawingData?.knots.map((knot) => knot.points).flat();
	return points && points.length > 0;
});

function saveToFile() {
	if (!canSave.value) return;
	const dataToSave = {
		...drawingStore.getDrawingData(),
		interFlipIds: Array.from(drawingStore.interFlipIds || []),
		crossingWalkDirections: Array.from(subsurfaceWalkStore.crossingWalkDirections),
		selectedStartPointId: subsurfaceWalkStore.selectedStartPointId,
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
			subsurfaceWalkStore.restore(
				Array.isArray(json.crossingWalkDirections)
					? new Map<string, CrossingWalkDirection>(json.crossingWalkDirections)
					: new Map(),
				typeof json.selectedStartPointId === "string"
					? json.selectedStartPointId
					: undefined,
			);
			emit("onLoadData", json);
		} catch (error) {
			console.error("Error parsing JSON:", error);
		}
	};
	reader.readAsText(file);
}
</script>

<style scoped>
.topbar {
	padding: 1em;
	background-color: #333;
	color: white;
	display: flex;
	align-items: center;
	justify-content: start;
	font-weight: bold;
	height: 100%;
	gap: 1em;
}

button {
	background-color: #555;
	color: white;
	border: none;
	padding: 0.5em 1em;
	border-radius: 4px;
	cursor: pointer;
	transition: background-color 0.3s;
}

button:hover {
	background-color: #777;
}

button.disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

span.key {
	background-color: #555;
	padding: 0.2em 0.4em;
	border-radius: 4px;
	font-family: monospace;
}
</style>
