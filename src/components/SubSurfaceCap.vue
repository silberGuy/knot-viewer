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
import type { SubSurface } from "./types";
import { getSubSurfaceCapTriangles } from "../utils/sub-surfaces";

const props = defineProps<{
	loop: SubSurface;
	surfaceLevel: number;
	color?: string;
	opacity?: number;
	visible?: boolean;
}>();

// Stays mounted regardless of `visible` and just renders zero triangles when off, rather than
// being conditionally mounted by a parent v-if - mirrors KnotViewerKnot's showSurfaces prop
// (the already-working "Show Surfaces" toggle), unlike an outer v-if which didn't reliably hide
// this in TresJS when toggled without also unmounting via the Subsurface tab switch.
const triangles = computed(() =>
	props.visible === false
		? []
		: getSubSurfaceCapTriangles(props.loop, props.surfaceLevel)
);
</script>
