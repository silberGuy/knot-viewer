import { defineStore } from 'pinia'
import { ref } from 'vue';

export const useSecondariesStore = defineStore('secondaries', () => {
    const secondaryKnotsIds = ref<string[][]>([]);

    const addSecondary = (knotIds: string[]) => secondaryKnotsIds.value.push(knotIds);
    const setSecondaries = (knotsIds: string[][]) => secondaryKnotsIds.value = [...knotsIds];

    return {
        secondaryKnotsIds,
        addSecondary,
        setSecondaries,
    }
});
