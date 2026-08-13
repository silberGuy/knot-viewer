<template>
	<SecondaryCap
		:loop="loop"
		:surfaceLevel="surfaceLevel"
		:surfaceLevelHeight="surfaceLevelHeight"
		:color="color"
		:opacity="opacity"
		:visible="visible && capVisible"
		:shiftedBoundary="shiftedBoundary"
	/>
	<SecondaryWall
		:loop="loop"
		:surfaceLevel="surfaceLevel"
		:surfaceLevelHeight="surfaceLevelHeight"
		:color="color"
		:opacity="opacity"
		:visible="visible"
		:shiftedBoundary="shiftedBoundary"
	/>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SecondaryCap from "./SecondaryCap.vue";
import SecondaryWall from "./SecondaryWall.vue";
import type { SecondaryLoop } from "./types";
import { getShiftedCapBoundary } from "../utils/secondary-surfaces";

const props = withDefaults(
	defineProps<{
		loop: SecondaryLoop;
		surfaceLevel: number;
		surfaceLevelHeight: number;
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
