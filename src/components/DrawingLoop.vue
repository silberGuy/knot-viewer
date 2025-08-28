<template>
	<DrawingLine
		v-for="(line, index) in lines"
		:key="'line-' + index"
		:index="index"
		:line="line"
	/>
	<circle
		v-for="(point, index) in points"
		class="point"
		:key="index"
		:cx="point.x"
		:cy="point.y"
		r="5"
		fill="red"
		@click.stop="onPointClick(index)"
	/>
</template>

<script setup lang="ts">
import { computed, toRefs } from "vue";
import type { Point } from "./types.ts";
import DrawingLine from "./DrawingLine.vue";
import { getLoopLines } from "../utils/drawing.ts";

const props = defineProps<{
	id: string;
	points: Point[];
}>();
const { points, id } = toRefs(props);

const isClosed = defineModel<boolean>("isClosed", {
	type: Boolean,
	default: false,
});

const lines = computed(() => {
	return getLoopLines({
		id: id.value,
		points: points.value,
		isClosed: isClosed.value,
	});
});

function onPointClick(index: number) {
	if (index === 0 && !isClosed.value) {
		isClosed.value = true;
	}
}
</script>
