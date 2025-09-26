import { defineStore } from 'pinia'

export const useControlsStore = defineStore('showSurfaces', {
    state: () => ({
        showSurfaces: true,
    }),
    actions: {
        toggleShowSurfaces() {
            this.showSurfaces = !this.showSurfaces;
        },
    }
});
