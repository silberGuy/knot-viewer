<template>
	<primitive :object="polygon" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
	Mesh,
	MeshBasicMaterial,
	DoubleSide,
	BufferGeometry,
	BufferAttribute,
} from "three";
const props = defineProps<{
	points: [number, number, number][];
	color?: number;
}>();

const material = computed(
	() =>
		new MeshBasicMaterial({
			color: props.color || 0x00ff00,
			side: DoubleSide,
		})
);
const geometry = computed(() => {
	const res = new BufferGeometry();
	const vertices = new Float32Array(props.points.flat());
	res.setAttribute("position", new BufferAttribute(vertices, 3));
	return res;
});
const polygon = computed(() => new Mesh(geometry.value, material.value));
</script>
