<template>
	<SubSurfaceCap
		:loop="loop"
		:surfaceLevel="surfaceLevel"
		:color="color"
		:opacity="opacity"
		:visible="visible && capVisible"
		:shiftedBoundary="shiftedBoundary"
	/>
	<SubSurfaceWall
		:loop="loop"
		:surfaceLevel="surfaceLevel"
		:color="color"
		:opacity="opacity"
		:visible="visible"
		:shiftedBoundary="shiftedBoundary"
	/>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SubSurfaceCap from "./SubSurfaceCap.vue";
import SubSurfaceWall from "./SubSurfaceWall.vue";
import type { SubsurfaceLoop } from "./types";
import { getShiftedCapBoundary } from "../utils/sub-surfaces";

const props = withDefaults(
	defineProps<{
		loop: SubsurfaceLoop;
		surfaceLevel: number;
		color?: string;
		opacity?: number;
		visible?: boolean;
		capVisible?: boolean;
		capShiftDistance?: number;
	}>(),
	{ capVisible: true }
);

// Computed once here, shared by both the cap and the wall's top edge (ADR 0007), rather than each
// recomputing it from capShiftDistance independently.
const shiftedBoundary = computed(() => getShiftedCapBoundary(props.loop, props.capShiftDistance ?? 0));
</script>
