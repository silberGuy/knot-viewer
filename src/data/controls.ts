import { computed, ref } from 'vue';
import { defineStore } from 'pinia'
import { useToggle } from '@vueuse/core';
import { DEFAULT_SURFACE_LEVEL_HEIGHT } from '../utils/diagram';

export const useControlsStore = defineStore('showSurfaces', () => {
    const [showSurfaces, toggleShowSurfaces] = useToggle(true);
    const [showSurfacesIntersections, toggleShowSurfacesIntersections] = useToggle(false);
    const [showSecondarySurface, toggleShowSecondarySurface] = useToggle(true);
    const [showSecondaryCap, toggleShowSecondaryCap] = useToggle(true);
    const [secondaryIntersections, toggleSecondaryIntersections] = useToggle(true);
    const secondaryOpacity = ref(0.6);
    const capShiftDistance = ref(0);
    const surfaceLevelHeight = ref(DEFAULT_SURFACE_LEVEL_HEIGHT);

    const activeTab = ref<"drawing" | "secondary">("drawing");
    const isSecondaryActive = computed(() => activeTab.value === "secondary");

    return {
        showSurfaces,
        toggleShowSurfaces,
        showSurfacesIntersections,
        toggleShowSurfacesIntersections,
        showSecondarySurface,
        toggleShowSecondarySurface,
        showSecondaryCap,
        toggleShowSecondaryCap,
        secondaryIntersections,
        toggleSecondaryIntersections,
        secondaryOpacity,
        capShiftDistance,
        surfaceLevelHeight,
        activeTab,
        isSecondaryActive,
    }
});
