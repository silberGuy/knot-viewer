<template>
	<circle
		ref="el"
		class="point"
		:cx="coords.x"
		:cy="coords.y"
		r="6"
		:fill="color"
	/>
</template>

<script setup lang="ts">
import { useDraggable } from "@vueuse/core";
import { computed, useTemplateRef } from "vue";
import type { Coords2D } from "./types";
import tinycolor from "tinycolor2";

const coords = defineModel<Coords2D>("coords", {
	required: true,
});

const props = defineProps<{ id: string; color?: string }>();

const el = useTemplateRef<HTMLElement>("el");
const svg = computed(() => el.value?.closest("svg"));

const color = computed(() => {
	const c = tinycolor(props.color || "black");
	const lightness = c.getBrightness();

	if (lightness > 150) {
		// already pretty bright
		return c.lighten(15).toHexString();
	} else {
		return c.lighten(40).toHexString();
	}
});

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
			console.log(`moving "${props.id}"`);
		}
	},
});
</script>

<style scoped>
.point {
	cursor: pointer;
}
</style>
