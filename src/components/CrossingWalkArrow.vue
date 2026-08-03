<template>
	<g
		class="crossing-walk-arrow"
		:transform="`translate(${arrow.position.x}, ${arrow.position.y}) rotate(${angle})`"
		@click.stop="selectNext"
	>
		<circle class="crossing-walk-arrow-hitbox" r="16" />
		<polygon class="crossing-walk-arrow-head" points="0,-8 16,0 0,8" />
	</g>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
	CrossingWalkDirection,
	SubSurfacesKnot,
	SubSurfacesPoint,
} from "./types.ts";
import {
	ALL_DIRECTIONS,
	directionFromRoleAndStep,
	directionToRole,
	directionToStep,
	getCrossingId,
	getCrossingRole,
	type CrossingWalkArrow,
} from "../utils/sub-surfaces.ts";

const props = defineProps<{
	arrow: CrossingWalkArrow;
	// The walked loop's own points, and each knot's own point list (including injected
	// crossing points) - used only to work out this crossing's arrival direction below.
	walkPoints: SubSurfacesPoint[];
	knots: SubSurfacesKnot[];
}>();

const emit = defineEmits<{
	(event: "select", direction: CrossingWalkDirection): void;
}>();

// The direction (role + step) the walk was actually moving in right before it reached this
// crossing - see "Arrival direction" in CONTEXT.md. Found by comparing the walked loop's
// previous point against this crossing's own knot's forward/backward neighbor (see "Going
// forward on a knot"), not by currentDirection - the walk can arrive from either side
// regardless of which knot it resolves to continue on.
const arrivalDirection = computed<CrossingWalkDirection>(() => {
	const index = props.walkPoints.findIndex(
		(p) => getCrossingId(p) === props.arrow.crossingId,
	);
	const point = props.walkPoints[index];
	const previousPoint =
		props.walkPoints[
			(index - 1 + props.walkPoints.length) % props.walkPoints.length
		];

	const role = getCrossingRole(point)!;
	const knot = props.knots.find(
		(k) => k.diagramKnot.id === point.surfaceIntersection!.triangle.knotId,
	)!;
	const pointIndex = knot.points.findIndex((p) => p.id === point.id);
	const backwardNeighborId =
		knot.points[(pointIndex - 1 + knot.points.length) % knot.points.length]?.id;
	const step: 1 | -1 = previousPoint.id === backwardNeighborId ? 1 : -1;

	return directionFromRoleAndStep(role, step);
});

// Excluded so the arrow never offers a choice that would just retrace straight back the way
// the walk came in.
const excludedDirection = computed<CrossingWalkDirection>(() => {
	const role = directionToRole(arrivalDirection.value);
	const step = directionToStep(arrivalDirection.value);
	return directionFromRoleAndStep(role, step === 1 ? -1 : 1);
});

// Faces along the currently active direction's own knot line (forward or backward, per
// "Going forward on a knot") - not toward the walk's next point, which is often one of the
// pipeline's injected points and isn't drawn on this board at all.
const angle = computed(() => {
	const { currentDirection, topLine, bottomLine } = props.arrow;
	const role = directionToRole(currentDirection);
	const step = directionToStep(currentDirection);
	const line = role === "upper" ? topLine : bottomLine;
	const dx = step === 1 ? line.p2.x - line.p1.x : line.p1.x - line.p2.x;
	const dy = step === 1 ? line.p2.y - line.p1.y : line.p1.y - line.p2.y;
	return (Math.atan2(dy, dx) * 180) / Math.PI;
});

function selectNext() {
	const options = ALL_DIRECTIONS.filter(
		(direction) => direction !== excludedDirection.value,
	);
	const currentIndex = options.findIndex(
		(direction) => direction === props.arrow.currentDirection,
	);
	const next = options[(currentIndex + 1) % options.length];
	emit("select", next);
}
</script>

<style scoped>
.crossing-walk-arrow {
	cursor: pointer;
}

.crossing-walk-arrow-hitbox {
	fill: transparent;
}

.crossing-walk-arrow-head {
	fill: #ffda00;
	stroke: #7a5200;
	stroke-width: 1;
}

.crossing-walk-arrow:hover .crossing-walk-arrow-head {
	fill: #ffcc55;
}
</style>
