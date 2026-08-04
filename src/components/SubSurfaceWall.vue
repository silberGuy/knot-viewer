<template>
	<ViewerTriangle
		v-for="triangle in triangles"
		:points="triangle"
		:key="triangle.flat().join('_')"
		:color="color"
	/>
</template>

<script setup lang="ts">
import { computed } from "vue";
import ViewerTriangle from "./ViewerTriangle.vue";
import type { SubSurface } from "./types";
import { getSubSurfaceWallTriangles } from "../utils/sub-surfaces";

const props = defineProps<{
	loop: SubSurface;
	surfaceLevel: number;
	color?: string;
	visible?: boolean;
}>();

// Stays mounted regardless of `visible` and just renders zero triangles when off - see
// SubSurfaceCap.vue for why (mirrors KnotViewerKnot's showSurfaces prop).
const triangles = computed(() =>
	props.visible === false
		? []
		: getSubSurfaceWallTriangles(props.loop, props.surfaceLevel)
);
</script>
