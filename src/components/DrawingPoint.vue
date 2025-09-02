<template>
	<circle
		ref="el"
		class="point"
		:cx="coords.x"
		:cy="coords.y"
		r="5"
		fill="red"
	/>
</template>

<script setup lang="ts">
import { useDraggable } from "@vueuse/core";
import { computed, useTemplateRef } from "vue";

const coords = defineModel<{ x: number; y: number }>("coords", {
	required: true,
});

const el = useTemplateRef<HTMLElement>("el");
const svg = computed(() => el.value?.closest("svg"));

useDraggable(el, {
	initialValue: { ...coords.value },
	stopPropagation: true,
	onMove(_, event) {
		if (!svg.value) return;
		const point = svg.value.createSVGPoint();
		point.x = event.clientX;
		point.y = event.clientY;
		const ctm = svg.value.getScreenCTM();
		if (ctm) {
			const svgPoint = point.matrixTransform(ctm.inverse());
			coords.value = { x: svgPoint.x, y: svgPoint.y };
		}
	},
});
</script>

<style scoped>
.point {
	cursor: pointer;
}
</style>
