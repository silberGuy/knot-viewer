<template>
	<div class="viewer-controls">
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

		<label v-if="controlsStore.isSubSurfaceActive">
			<input
				type="checkbox"
				id="toggle-subsurface-surface"
				v-model="controlsStore.showSubSurfaceSurface"
			/>
			Show Subsurface Surface
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
			Subsurface Surface Opacity
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
				v-model.number="controlsStore.capShiftDistance"
			/>
		</label>
	</div>
</template>

<script setup lang="ts">
import { useControlsStore } from "../data/controls";

const controlsStore = useControlsStore();
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

.viewer-controls label {
	display: flex;
	align-items: center;
	gap: 0.4em;
	user-select: none;
	color: black;
}
</style>
