<template>
	<circle
		:id="id"
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

const emit = defineEmits<{
	(event: "dragEnd"): void;
	(event: "moveKnot", delta: Coords2D): void;
}>();

const props = defineProps<{ id: string; color?: string }>();

const el = useTemplateRef<HTMLElement>("el");
const svg = computed(() => el.value?.closest("svg"));

const color = computed(() => {
	const c = tinycolor(props.color || "black");
	const lightness = c.getBrightness();

	if (lightness > 200) {
		return c.darken(20).toHexString();
	}
	if (lightness > 150) {
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
			const delta = {
				x: svgPoint.x - coords.value.x,
				y: svgPoint.y - coords.value.y,
			};
			if (event.shiftKey) {
				emit("moveKnot", delta);
			} else {
				coords.value = { x: svgPoint.x, y: svgPoint.y };
			}
		}
	},
	onEnd() {
		emit("dragEnd");
	},
});
</script>

<style scoped>
.point {
	cursor: pointer;
}
</style>
