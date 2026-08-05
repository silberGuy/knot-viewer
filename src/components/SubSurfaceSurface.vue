<template>
	<SubSurfaceCap
		:loop="loop"
		:surfaceLevel="surfaceLevel"
		:color="color"
		:opacity="opacity"
		:visible="visible && capVisible"
	/>
	<SubSurfaceWall
		:loop="loop"
		:surfaceLevel="surfaceLevel"
		:color="color"
		:opacity="opacity"
		:visible="visible"
	/>
</template>

<script setup lang="ts">
import SubSurfaceCap from "./SubSurfaceCap.vue";
import SubSurfaceWall from "./SubSurfaceWall.vue";
import type { SubSurface } from "./types";

withDefaults(
	defineProps<{
		loop: SubSurface;
		surfaceLevel: number;
		color?: string;
		opacity?: number;
		visible?: boolean;
		capVisible?: boolean;
	}>(),
	{ capVisible: true }
);
</script>
