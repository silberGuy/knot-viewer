<template>
	<div class="viewer-controls">
		<button class="viewer-controls-header" @click="expanded = !expanded">
			Controls
			<span class="chevron" :class="{ collapsed: !expanded }">▾</span>
		</button>

		<div v-if="expanded" class="viewer-controls-body">
			<label>
				<input
					type="checkbox"
					id="toggle-surfaces"
					v-model="controlsStore.showSurfaces"
				/>
				Show Surfaces
			</label>

			<label>
				<input
					type="checkbox"
					id="toggle-surfaces-intersections"
					v-model="controlsStore.showSurfacesIntersections"
				/>
				Show Surfaces Intersections
			</label>

			<label>
				Surface Level Height
				<input
					type="range"
					id="surface-level-height"
					min="10"
					max="32"
					step="1"
					v-model.number="controlsStore.surfaceLevelHeight"
				/>
			</label>

			<label v-if="controlsStore.isSecondaryActive">
				<input
					type="checkbox"
					id="toggle-secondary-surface"
					v-model="controlsStore.showSecondarySurface"
				/>
				Show Secondary Surface
			</label>

			<label v-if="controlsStore.isSecondaryActive">
				<input
					type="checkbox"
					id="toggle-secondary-cap"
					v-model="controlsStore.showSecondaryCap"
				/>
				Show Secondary Surface Cap
			</label>

			<label v-if="controlsStore.isSecondaryActive">
				<input
					type="checkbox"
					id="toggle-secondary-intersections"
					v-model="controlsStore.secondaryIntersections"
				/>
				Show Secondary Surface Intersections
			</label>

			<label v-if="controlsStore.isSecondaryActive">
				Secondary Surface Opacity
				<input
					type="range"
					id="secondary-surface-opacity"
					min="0.2"
					max="1"
					step="0.01"
					v-model.number="controlsStore.secondaryOpacity"
				/>
			</label>

			<label v-if="controlsStore.isSecondaryActive">
				Cap Shift
				<input
					type="range"
					id="cap-shift-distance"
					min="-30"
					max="30"
					step="1"
					list="cap-shift-distance-zero"
					v-model.number="capShiftDistance"
				/>
				<datalist id="cap-shift-distance-zero">
					<option value="0" />
				</datalist>
			</label>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useControlsStore } from "../data/controls";

const controlsStore = useControlsStore();

const expanded = ref(true);

// A plain step doesn't make 0 any easier to land on than any other value - this widens the
// "snap zone" around 0 specifically, since it's the shift's own no-op/reset value.
const ZERO_SNAP_RANGE = 2;
const capShiftDistance = computed({
	get: () => controlsStore.capShiftDistance,
	set: (value: number) => {
		controlsStore.capShiftDistance =
			Math.abs(value) <= ZERO_SNAP_RANGE ? 0 : value;
	},
});
</script>

<style scoped>
.viewer-controls {
	position: absolute;
	top: 1em;
	right: 1em;
	z-index: 1;
	width: 22em;
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	padding: 0.75em 1em;
	background: rgba(255, 255, 255, 0.85);
	border-radius: 8px;
	font-weight: bold;
}

.viewer-controls-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: none;
	border: none;
	padding: 0;
	outline: none;
	font: inherit;
	font-weight: bold;
	color: black;
	cursor: pointer;
}

.chevron {
	font-size: 1.2em;
	margin-top: -0.1em;
	display: inline-block;
	transition: transform 0.15s ease;
}

.chevron.collapsed {
	transform: rotate(90deg);
}

.viewer-controls-body {
	display: flex;
	flex-direction: column;
	gap: 0.5em;
}

.viewer-controls label {
	display: flex;
	align-items: center;
	gap: 0.4em;
	user-select: none;
	color: black;
}
</style>
