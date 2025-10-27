import { defineStore } from 'pinia'

export const useControlsStore = defineStore('showSurfaces', {
    state: () => ({
        showSurfaces: true,
        showSurfacesIntersections: false,
    }),
    actions: {
        toggleShowSurfaces() {
            this.showSurfaces = !this.showSurfaces;
        },
        toggleShowSubSurface() {
            this.showSurfacesIntersections = !this.showSurfacesIntersections;
        }
    }
});
