<template>
	<SubSurfaceCap
		:loop="loop"
		:surfaceLevel="surfaceLevel"
		:color="color"
		:visible="visible"
	/>
	<SubSurfaceWall
		:loop="loop"
		:surfaceLevel="surfaceLevel"
		:color="color"
		:visible="visible"
	/>
</template>

<script setup lang="ts">
import SubSurfaceCap from "./SubSurfaceCap.vue";
import SubSurfaceWall from "./SubSurfaceWall.vue";
import type { SubSurface } from "./types";

defineProps<{
	loop: SubSurface;
	surfaceLevel: number;
	color?: string;
	visible?: boolean;
}>();
</script>
