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
import type { Coords2D, SubSurface } from "./types";
import { getSubSurfaceWallTriangles } from "../utils/sub-surfaces";

const props = defineProps<{
	loop: SubSurface;
	surfaceLevel: number;
	color?: string;
	opacity?: number;
	visible?: boolean;
	shiftedBoundary: Map<string, Coords2D>;
}>();

// Stays mounted regardless of `visible` and just renders zero triangles when off - see
// SubSurfaceCap.vue for why (mirrors KnotViewerKnot's showSurfaces prop).
const triangles = computed(() =>
	props.visible === false
		? []
		: getSubSurfaceWallTriangles(props.loop, props.surfaceLevel, props.shiftedBoundary)
);
</script>
