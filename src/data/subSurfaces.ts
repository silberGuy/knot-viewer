import { defineStore } from 'pinia'
import { ref } from 'vue';

export const useSubSurfacesStore = defineStore('subSurfaces', () => {
    const subSurfaceKnotsIds = ref<string[][]>([]);

    const addSubSurface = (knotIds: string[]) => subSurfaceKnotsIds.value.push(knotIds);
    const setSubSurfaces = (knotsIds: string[][]) => subSurfaceKnotsIds.value = [...knotsIds];

    return {
        subSurfaceKnotsIds,
        addSubSurface,
        setSubSurfaces,
    }
});
