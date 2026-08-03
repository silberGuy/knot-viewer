import { ref } from 'vue';
import { defineStore } from 'pinia'
import type { CrossingWalkDirection, CrossingWalkDirections, Knot3D } from '../components/types';
import { getDefaultCrossingWalkDirections } from '../utils/sub-surfaces';

// Holds the user's crossingWalkDirection overrides and selected walk-start point for the
// Subsurface board. Both reset every time the Subsurface tab is entered (see
// SubsurfaceBoard.vue) - safe to do because the knots (and therefore the crossings and
// points) can't change while that tab is showing, so there's never a stale id to worry about.
export const useSubsurfaceWalkStore = defineStore('subsurfaceWalk', () => {
    const crossingWalkDirections = ref<CrossingWalkDirections>(new Map());
    const selectedStartPointId = ref<string | undefined>(undefined);

    function reset(knots: Knot3D[]) {
        crossingWalkDirections.value = getDefaultCrossingWalkDirections(knots);
        selectedStartPointId.value = undefined;
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
        reset,
        setDirection,
        setStartPoint,
    }
});
