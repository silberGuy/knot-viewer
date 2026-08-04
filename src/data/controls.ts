import { computed, ref } from 'vue';
import { defineStore } from 'pinia'
import { useToggle } from '@vueuse/core';

export const useControlsStore = defineStore('showSurfaces', () => {
    const [showSurfaces, toggleShowSurfaces] = useToggle(true);
    const [showSurfacesIntersections, toggleShowSurfacesIntersections] = useToggle(false);
    const [showSubSurfaceSurface, toggleShowSubSurfaceSurface] = useToggle(true);

    const activeTab = ref<"drawing" | "subsurface">("drawing");
    const isSubSurfaceActive = computed(() => activeTab.value === "subsurface");

    return {
        showSurfaces,
        toggleShowSurfaces,
        showSurfacesIntersections,
        toggleShowSurfacesIntersections,
        showSubSurfaceSurface,
        toggleShowSubSurfaceSurface,
        activeTab,
        isSubSurfaceActive,
    }
});
