<template>
	<div class="knot-viewer">
		<ViewerControls />
		<TresCanvas>
			<TresPerspectiveCamera
				:position="cameraPosition"
				:fov="50"
				:near="0.1"
				:far="100000"
			>
				<!-- decay=0: default physically-correct falloff (decay=2) fades to ~0 at this
				scene's scale (raw SVG pixel coordinates, often hundreds of units across), which
				made the lit Subsurface surface look flat/unshaded again. -->
				<TresPointLight :intensity="2" :decay="0" />
			</TresPerspectiveCamera>
			<TresAmbientLight :intensity="0.4" />
			<OrbitControls :target="orbitTarget" />
			<KnotViewerKnot
				v-for="knot in knots3D"
				:knot="knot"
				:key="knot.diagramKnot.id"
				:surfaceColor="knot.diagramKnot.knot.color"
				:showSurfaces="controlsStore.showSurfaces"
			/>
			<KnotViewerKnot
				v-if="controlsStore.isSubSurfaceActive"
				:knot="subSurfaceLoop"
				:showSurfaces="false"
				surfaceColor="#ff00ff"
			/>
			<SubSurfaceSurface
				v-if="controlsStore.isSubSurfaceActive"
				:loop="subSurfaceLoop"
				:surfaceLevel="subSurfaceCapLevel + 5"
				:key="subSurfaceLoop.id"
				:visible="controlsStore.showSubSurfaceSurface"
				:capVisible="controlsStore.showSubSurfaceCap"
				:opacity="controlsStore.subSurfaceOpacity"
				:capShiftDistance="controlsStore.capShiftDistance"
				color="#ff00ff"
			/>
			<ViewerLine
				v-for="linePoints in surfaceIntersectionsLines"
				:key="linePoints.id"
				:points="linePoints.points"
				:color="linePoints.color"
				:width="6"
				noDepthTest
			/>
			<Grid
				:position="[orbitTarget[0], -8, orbitTarget[2]]"
				:args="[10.5, 10.5]"
				cell-color="#fbb03b"
				:cell-size="32"
				:cell-thickness="0.9"
				section-color="#fbb03b"
				:section-size="8"
				:section-thickness="0.7"
				:infinite-grid="true"
				:fade-from="0"
				:fade-distance="5000"
				:fade-strength="1"
			/>
		</TresCanvas>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DrawingData, SubSurfacesPoint } from "./types";
import { TresCanvas, extend } from "@tresjs/core";
import { OrbitControls, Grid } from "@tresjs/cientos";
import KnotViewerKnot from "./KnotViewerKnot.vue";
import SubSurfaceSurface from "./SubSurfaceSurface.vue";
import ViewerControls from "./ViewerControls.vue";
import { useControlsStore } from "../data/controls";
import { useSubsurfaceWalkStore } from "../data/subsurface-walk";
import {
	get3DKnots,
	getDiagram,
	getSurfaceLevelsCount,
} from "../utils/diagram";
import {
	getKnotsSurfacesIntersections,
	getSubSurfaceIntersectionsLoop,
	getSurfaceIntersectionsPairs,
} from "../utils/sub-surfaces";
import tinycolor from "tinycolor2";
import ViewerLine from "./ViewerLine.vue";

extend({ ViewerLine });

const props = defineProps<{
	drawingData: DrawingData;
}>();

const controlsStore = useControlsStore();
const subsurfaceWalkStore = useSubsurfaceWalkStore();

const diagram = computed(() => getDiagram(props.drawingData));
const knots3D = computed(() => get3DKnots(diagram.value));

// Purely cosmetic default framing - the knot's actual geometry (knots3D,
// subSurfaceLoop) is always computed from raw, uncentered drawingData, so
// it stays identical to what SubsurfaceBoard computes for the same
// drawing; this never touches that. Knot points are drawn in the Drawing
// board's raw SVG pixel coordinates (no viewBox), so "centered" here means
// facing where that board's own center would fall, not the 3D origin -
// approximated once from the board pane's layout share (see App.vue's
// `.board-pane` grid column/row) rather than measured live or recomputed
// as the drawing changes.
const orbitTarget: [number, number, number] = [
	(window.innerWidth * 0.47) / 2,
	0,
	(window.innerHeight - 60) / 2,
];
const cameraDistanceScale = 2.1;
const cameraHeightScale = 2.7;
const cameraPosition: [number, number, number] = [
	orbitTarget[0] + 80 * cameraDistanceScale,
	80 * cameraDistanceScale * cameraHeightScale,
	orbitTarget[2] + 160 * cameraDistanceScale,
];

function getKnotColor(knotId: string) {
	return (
		knots3D.value.find((knot) => knot.diagramKnot.id === knotId)?.diagramKnot
			.knot.color || "white"
	);
}

function getSurfaceIntersectionsColor(
	p1: SubSurfacesPoint,
	p2: SubSurfacesPoint,
) {
	if (!p1.surfaceIntersection || !p2.surfaceIntersection) return "white";
	const knotsIds = [
		...new Set([
			p1.surfaceIntersection.triangle.knotId,
			p2.surfaceIntersection.triangle.knotId,
			p1.surfaceIntersection.twinPointKnotId!,
			p2.surfaceIntersection.twinPointKnotId!,
		]),
	];
	const color1 = getKnotColor(knotsIds[0]);
	const color2 = getKnotColor(knotsIds[1]);
	let color = tinycolor.mix(color1, color2, 50).saturate(50);

	if (!color.isLight()) {
		color = color.lighten(20);
	}

	return color.toHexString();
}

const surfaceIntersectionsLines = computed(() => {
	if (!controlsStore.showSurfacesIntersections) return [];
	const points = getKnotsSurfacesIntersections(knots3D.value);
	const pairs = getSurfaceIntersectionsPairs(points);
	return pairs.map(([p1, p2]) => ({
		id: p1.id + "_" + p2.id,
		points: [p1, p2],
		color: getSurfaceIntersectionsColor(p1, p2),
	}));
});

const subSurfaceLoop = computed(() =>
	getSubSurfaceIntersectionsLoop(
		knots3D.value,
		subsurfaceWalkStore.crossingWalkDirections,
	),
);

const subSurfaceCapLevel = computed(() => getSurfaceLevelsCount(diagram.value));
</script>

<style scoped>
.knot-viewer {
	position: relative;
}
</style>
