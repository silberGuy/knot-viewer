<template>
	<ViewerTriangle
		v-for="triangle in triangles"
		:points="triangle"
		:key="triangle.flat().join('_')"
		:color="color"
		:opacity="opacity"
		lit
	/>
</template>

<script setup lang="ts">
import { computed } from "vue";
import ViewerTriangle from "./ViewerTriangle.vue";
import type { Coords2D, SecondaryLoop } from "./types";
import { getSecondaryCapTriangles } from "../utils/secondary-surfaces";

const props = defineProps<{
	loop: SecondaryLoop;
	surfaceLevel: number;
	surfaceLevelHeight: number;
	color?: string;
	opacity?: number;
	visible?: boolean;
	shiftedBoundary: Map<string, Coords2D>;
}>();

// Stays mounted regardless of `visible` and just renders zero triangles when off, rather than
// being conditionally mounted by a parent v-if - mirrors KnotViewerKnot's showSurfaces prop
// (the already-working "Show Surfaces" toggle), unlike an outer v-if which didn't reliably hide
// this in TresJS when toggled without also unmounting via the Secondary tab switch.
const triangles = computed(() =>
	props.visible === false
		? []
		: getSecondaryCapTriangles(props.loop, props.surfaceLevel, props.shiftedBoundary, props.surfaceLevelHeight)
);
</script>
