<template>
	<primitive :object="polygon" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
	Mesh,
	MeshBasicMaterial,
	MeshLambertMaterial,
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
	lit?: boolean;
}>();

const geometry = computed(() => {
	const res = new BufferGeometry();
	const vertices = new Float32Array(props.points.flat());
	res.setAttribute("position", new BufferAttribute(vertices, 3));
	if (props.lit) res.computeVertexNormals();

	return res;
});

const polygon = computed(() => {
	const opacity = props.opacity ?? 1;
	const transparent = opacity < 1;
	const MaterialClass = props.lit ? MeshLambertMaterial : MeshBasicMaterial;
	const frontMat = new MaterialClass({
		color: tinycolor(props.color).darken(10).toHexString(),
		side: FrontSide,
		opacity,
		transparent,
	});
	const backMat = new MaterialClass({
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
