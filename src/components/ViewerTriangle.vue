<template>
	<primitive :object="polygon" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
	Mesh,
	MeshBasicMaterial,
	BufferGeometry,
	BufferAttribute,
	FrontSide,
	BackSide,
	Group,
} from "three";
import tinycolor from "tinycolor2";
const props = defineProps<{
	points: [number, number, number][];
	color?: string;
	opacity?: number;
}>();

const geometry = computed(() => {
	const res = new BufferGeometry();
	const vertices = new Float32Array(props.points.flat());
	res.setAttribute("position", new BufferAttribute(vertices, 3));

	return res;
});

const polygon = computed(() => {
	const opacity = props.opacity ?? 1;
	const transparent = opacity < 1;
	const frontMat = new MeshBasicMaterial({
		color: tinycolor(props.color).darken(10).toHexString(),
		side: FrontSide,
		opacity,
		transparent,
	});
	const backMat = new MeshBasicMaterial({
		color: props.color,
		side: BackSide,
		opacity,
		transparent,
	});
	const frontMesh = new Mesh(geometry.value, frontMat);
	const backMesh = new Mesh(geometry.value, backMat);

	const group = new Group();
	group.add(frontMesh);
	group.add(backMesh);
	return group;
});
</script>
