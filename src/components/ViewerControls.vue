<template>
	<div class="viewer-controls">
		<button class="viewer-controls-header" @click="expanded = !expanded">
			<span class="chevron" :class="{ collapsed: !expanded }">▾</span>
			Controls
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

			<label v-if="controlsStore.isSubSurfaceActive">
				<input
					type="checkbox"
					id="toggle-subsurface-surface"
					v-model="controlsStore.showSubSurfaceSurface"
				/>
				Show Subsurface
			</label>

			<label v-if="controlsStore.isSubSurfaceActive">
				<input
					type="checkbox"
					id="toggle-subsurface-cap"
					v-model="controlsStore.showSubSurfaceCap"
				/>
				Show Subsurface Cap
			</label>

			<label v-if="controlsStore.isSubSurfaceActive">
				<input
					type="checkbox"
					id="toggle-subsurface-intersections"
					v-model="controlsStore.subsurfaceIntersections"
				/>
				Show Subsurface Intersections
			</label>

			<label v-if="controlsStore.isSubSurfaceActive">
				Subsurface Opacity
				<input
					type="range"
					id="subsurface-surface-opacity"
					min="0.2"
					max="1"
					step="0.01"
					v-model.number="controlsStore.subSurfaceOpacity"
				/>
			</label>

			<label v-if="controlsStore.isSubSurfaceActive">
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
	gap: 0.4em;
	background: none;
	border: none;
	padding: 0;
	font: inherit;
	font-weight: bold;
	color: black;
	cursor: pointer;
}

.chevron {
	display: inline-block;
	transition: transform 0.15s ease;
}

.chevron.collapsed {
	transform: rotate(-90deg);
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
