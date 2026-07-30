import { defineStore } from 'pinia'
import { useToggle } from '@vueuse/core';

export const useControlsStore = defineStore('showSurfaces', () => {
    const [showSurfaces, toggleShowSurfaces] = useToggle(true);
    const [showSubSurface, toggleShowSubSurface] = useToggle(false);
    const [showSurfacesIntersections, toggleShowSurfacesIntersections] = useToggle(false);

    return {
        showSurfaces,
        toggleShowSurfaces,
        showSubSurface,
        toggleShowSubSurface,
        showSurfacesIntersections,
        toggleShowSurfacesIntersections,
    }
});
