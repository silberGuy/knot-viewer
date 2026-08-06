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
import type { Coords2D, SubsurfaceLoop } from "./types";
import { getSubSurfaceCapTriangles } from "../utils/sub-surfaces";

const props = defineProps<{
	loop: SubsurfaceLoop;
	surfaceLevel: number;
	color?: string;
	opacity?: number;
	visible?: boolean;
	shiftedBoundary: Map<string, Coords2D>;
}>();

// Stays mounted regardless of `visible` and just renders zero triangles when off, rather than
// being conditionally mounted by a parent v-if - mirrors KnotViewerKnot's showSurfaces prop
// (the already-working "Show Surfaces" toggle), unlike an outer v-if which didn't reliably hide
// this in TresJS when toggled without also unmounting via the Subsurface tab switch.
const triangles = computed(() =>
	props.visible === false
		? []
		: getSubSurfaceCapTriangles(props.loop, props.surfaceLevel, props.shiftedBoundary)
);
</script>
