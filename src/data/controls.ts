import { computed, ref } from 'vue';
import { defineStore } from 'pinia'
import { useToggle } from '@vueuse/core';

export const useControlsStore = defineStore('showSurfaces', () => {
    const [showSurfaces, toggleShowSurfaces] = useToggle(true);
    const [showSurfacesIntersections, toggleShowSurfacesIntersections] = useToggle(false);
    const [showSubSurfaceSurface, toggleShowSubSurfaceSurface] = useToggle(true);
    const [showSubSurfaceCap, toggleShowSubSurfaceCap] = useToggle(true);
    const subSurfaceOpacity = ref(0.6);
    const capShiftDistance = ref(0);

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
        subSurfaceOpacity,
        capShiftDistance,
        activeTab,
        isSubSurfaceActive,
    }
});
