<template>
	<TresGroup>
		<!-- <Line2 :points="pointsCoords" :lineWidth="width || 4" :color="color" /> -->
		<primitive :object="lineObject" />
		<Sphere
			v-for="point in pointsCoords"
			:key="'sphere-' + point.join('_')"
			:args="[0.02, 0.02, 0.02]"
			:position="point"
			:color="color"
		/>
	</TresGroup>
</template>

<script setup lang="ts">
import { Sphere } from "@tresjs/cientos";
import type { Point3D, SubSurfacesPoint } from "./types";
import { computed } from "vue";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";

const props = defineProps<{
	points: (Point3D | SubSurfacesPoint)[];
	color: string | number;
	pointsColor?: string | number;
	width?: number;
	noDepthTest?: boolean;
}>();

const pointsCoords = computed(() => props.points.map((point) => point.coords));

const lineObject = computed(() => {
	const material = new LineMaterial({
		color: props.color || 0x0000ff,
		linewidth: props.width || 4,
		depthTest: props.noDepthTest ? false : true,
	});

	const points = props.points.map(
		(point) => new THREE.Vector3(...point.coords)
	);

	const geometry = new LineGeometry();
	geometry.setPositions(points.map((point) => point.toArray()).flat());

	const line = new Line2(geometry, material);
	line.renderOrder = 10;
	return line;
});
</script>
