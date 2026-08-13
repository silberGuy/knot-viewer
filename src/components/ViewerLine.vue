<template>
	<TresGroup>
		<!-- <Line2 :points="pointsCoords" :lineWidth="width || 4" :color="color" /> -->
		<primitive :object="lineObject" />
		<Sphere
			v-for="(point, i) in pointsCoords"
			:key="'sphere-' + point.join('_') + i"
			:args="[0.02, 0.02, 0.02]"
			:position="point"
			:color="color"
		/>
	</TresGroup>
</template>

<script setup lang="ts">
import { Sphere } from "@tresjs/cientos";
import type { Point3D, SecondariesPoint } from "./types";
import { computed, onBeforeUnmount, watch } from "vue";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";

const props = defineProps<{
	points: (Point3D | SecondariesPoint)[];
	color: string | number;
	pointsColor?: string | number;
	width?: number;
	noDepthTest?: boolean;
	// Appends the first point back onto the end, so the line segment closing the loop
	// actually gets drawn - Line2 only ever connects consecutive points it's given.
	closed?: boolean;
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
	if (props.closed && points.length > 2) {
		points.push(points[0]);
	}

	const geometry = new LineGeometry();
	geometry.setPositions(points.map((point) => point.toArray()).flat());

	const line = new Line2(geometry, material);
	line.renderOrder = 10;
	return line;
});

// `<primitive>` only adds the current lineObject to the scene; it doesn't
// reliably detach the previous one when this recomputes or when this
// component unmounts, so the old Line2 is cleaned up explicitly here.
function disposeLine(line: Line2 | undefined) {
	if (!line) return;
	line.removeFromParent();
	line.geometry.dispose();
	line.material.dispose();
}

watch(lineObject, (_current, previous) => disposeLine(previous));
onBeforeUnmount(() => disposeLine(lineObject.value));
</script>
