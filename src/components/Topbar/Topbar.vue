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

		<div class="spacer" style="flex-grow: 1"></div>

		<label style="user-select: none">
			<input
				type="checkbox"
				id="toggle-surfaces"
				v-model="controlsStore.showSurfaces"
			/>
			Show Surfaces
		</label>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { DrawingData } from "../types";
import { useControlsStore } from "../../data/controls";

const props = defineProps<{
	drawingData?: DrawingData;
}>();

const emit = defineEmits<{
	(e: "onLoadData", value: DrawingData): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);

const controlsStore = useControlsStore();

const canSave = computed(() => {
	const points = props.drawingData?.knots.map((knot) => knot.points).flat();
	return points && points.length > 0;
});

function saveToFile() {
	if (!canSave.value) return;
	const dataToSave = {
		...props.drawingData,
		interFlipIds: Array.from(props.drawingData?.interFlipIds || []),
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
</style>
