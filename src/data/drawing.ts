import { defineStore } from "pinia";
import { ref } from "vue";
import cloneDeep from "clone-deep";
import type { DrawingData, Knot } from "../components/types";
import { knotsColors } from "./colors";

export const useDrawingStore = defineStore("drawing", () => {
    const knots = ref<Knot[]>([
        { id: "1", points: [], isClosed: false, color: knotsColors[0] },
    ]);
    const interFlipIds = ref<Set<string>>(new Set<string>());

    function setDrawingData(data: DrawingData) {
        knots.value = cloneDeep(data.knots);
        interFlipIds.value = new Set<string>(
            Array.isArray(data.interFlipIds) ? data.interFlipIds : Array.from(data.interFlipIds || [])
        );
    }

    function getDrawingData(): DrawingData {
        return {
            knots: cloneDeep(knots.value),
            interFlipIds: new Set<string>(Array.from(interFlipIds.value)),
        };
    }

    return {
        knots,
        interFlipIds,
        setDrawingData,
        getDrawingData,
    };
});
