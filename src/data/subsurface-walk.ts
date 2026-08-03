import { ref } from 'vue';
import { defineStore } from 'pinia'
import type { CrossingWalkDirection, CrossingWalkDirections, Knot3D } from '../components/types';
import { getDefaultCrossingWalkDirections } from '../utils/sub-surfaces';

// Holds the user's crossingWalkDirection overrides for the Subsurface board. Reset to
// all-defaults every time the Subsurface tab is entered (see SubsurfaceBoard.vue) - safe
// to do because the knots (and therefore the crossings) can't change while that tab is
// showing, so there's never a stale id to worry about.
export const useSubsurfaceWalkStore = defineStore('subsurfaceWalk', () => {
    const crossingWalkDirections = ref<CrossingWalkDirections>(new Map());

    function reset(knots: Knot3D[]) {
        crossingWalkDirections.value = getDefaultCrossingWalkDirections(knots);
    }

    function setDirection(crossingId: string, direction: CrossingWalkDirection) {
        crossingWalkDirections.value.set(crossingId, direction);
    }

    return {
        crossingWalkDirections,
        reset,
        setDirection,
    }
});
