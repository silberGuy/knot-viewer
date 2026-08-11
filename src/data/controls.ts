import { computed, ref } from 'vue';
import { defineStore } from 'pinia'
import { useToggle } from '@vueuse/core';
import { DEFAULT_SURFACE_LEVEL_HEIGHT } from '../utils/diagram';

export const useControlsStore = defineStore('showSurfaces', () => {
    const [showSurfaces, toggleShowSurfaces] = useToggle(true);
    const [showSurfacesIntersections, toggleShowSurfacesIntersections] = useToggle(false);
    const [showSubSurfaceSurface, toggleShowSubSurfaceSurface] = useToggle(true);
    const [showSubSurfaceCap, toggleShowSubSurfaceCap] = useToggle(true);
    const [subsurfaceIntersections, toggleSubsurfaceIntersections] = useToggle(true);
    const subSurfaceOpacity = ref(0.6);
    const capShiftDistance = ref(0);
    const surfaceLevelHeight = ref(DEFAULT_SURFACE_LEVEL_HEIGHT);

    const activeTab = ref<"drawing" | "subsurface">("drawing");
    const isSubSurfaceActive = computed(() => activeTab.value === "subsurface");

    return {
        showSurfaces,
        toggleShowSurfaces,
        showSurfacesIntersections,
        toggleShowSurfacesIntersections,
        showSubSurfaceSurface,
        toggleShowSubSurfaceSurface,
        showSubSurfaceCap,
        toggleShowSubSurfaceCap,
        subsurfaceIntersections,
        toggleSubsurfaceIntersections,
        subSurfaceOpacity,
        capShiftDistance,
        surfaceLevelHeight,
        activeTab,
        isSubSurfaceActive,
    }
});
