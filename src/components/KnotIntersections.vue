<template>
	<DrawingIntersection
		v-for="inter in intersections"
		:key="inter.id"
		:topLine="inter.topLine"
		:intersectionPoint="inter.point"
		:lineColor="
			knots.find((k) => k.id === inter.topLine.knotId)?.color || 'black'
		"
		:clickable="clickable"
		@click.stop="clickable && emit('flip', inter.id)"
	/>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Knot } from "./types.ts";
import DrawingIntersection from "./DrawingIntersection.vue";
import { computeIntersections } from "../utils/drawing";

const props = withDefaults(
	defineProps<{
		knots: Knot[];
		interFlipIds: Set<string>;
		clickable?: boolean;
	}>(),
	{ clickable: true }
);

const emit = defineEmits<{
	(event: "flip", intersectionId: string): void;
}>();

const intersections = computed(() =>
	computeIntersections(props.knots, props.interFlipIds)
);
</script>
