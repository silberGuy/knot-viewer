import { ref } from 'vue';
import { defineStore } from 'pinia'
import type { CrossingWalkDirection, CrossingWalkDirections, Knot3D } from '../components/types';
import { getDefaultCrossingWalkDirections } from '../utils/sub-surfaces';

// Holds the user's crossingWalkDirection overrides and selected walk-start point for the
// Subsurface board. These persist across tab switches and round-trip through Save/Load
// (see BoardInfo.vue) - no longer reset just for revisiting the tab.
export const useSubsurfaceWalkStore = defineStore('subsurfaceWalk', () => {
    const crossingWalkDirections = ref<CrossingWalkDirections>(new Map());
    const selectedStartPointId = ref<string | undefined>(undefined);

    // Drops only overrides a drawing edit actually invalidated - not a full reset.
    function pruneStale(knots: Knot3D[]) {
        const validCrossingIds = new Set(getDefaultCrossingWalkDirections(knots).keys());
        for (const crossingId of Array.from(crossingWalkDirections.value.keys())) {
            if (!validCrossingIds.has(crossingId)) {
                crossingWalkDirections.value.delete(crossingId);
            }
        }

        if (selectedStartPointId.value) {
            const validPointIds = new Set(knots.flatMap((knot) => knot.points.map((point) => point.id)));
            if (!validPointIds.has(selectedStartPointId.value)) {
                selectedStartPointId.value = undefined;
            }
        }
    }

    // Overwrites both with a loaded file's contents (or defaults - an empty map, no selected
    // start point - when the file predates this feature).
    function restore(directions: CrossingWalkDirections, startPointId: string | undefined) {
        crossingWalkDirections.value = directions;
        selectedStartPointId.value = startPointId;
    }

    function setDirection(crossingId: string, direction: CrossingWalkDirection) {
        crossingWalkDirections.value.set(crossingId, direction);
    }

    function setStartPoint(pointId: string) {
        selectedStartPointId.value = pointId;
    }

    return {
        crossingWalkDirections,
        selectedStartPointId,
        pruneStale,
        restore,
        setDirection,
        setStartPoint,
    }
});
