import type { SortProgram } from "./sort-dsl";

export type SortPreset = {
  id: string;
  label: string;
  summary: string;
  program: SortProgram;
};

export const presets: SortPreset[] = [
  {
    id: "sentences",
    label: "Story sentences",
    summary: "Restore a short scene to narrative order.",
    program: {
      dsl: "sort-lab/v1",
      title: "The lighthouse scene",
      objects: [
        { id: "sentence-4", label: "At last, the lamp swept across the black water.", data: { position: 4, words: 10 } },
        { id: "sentence-1", label: "Mara climbed the lighthouse stairs before dawn.", data: { position: 1, words: 7 } },
        { id: "sentence-5", label: "Far below, a fishing boat answered with its horn.", data: { position: 5, words: 9 } },
        { id: "sentence-2", label: "The old gears resisted her first pull.", data: { position: 2, words: 7 } },
        { id: "sentence-6", label: "Mara smiled and watched the storm turn east.", data: { position: 6, words: 8 } },
        { id: "sentence-3", label: "She leaned harder, and the mechanism began to turn.", data: { position: 3, words: 9 } },
      ],
      order: { keys: [{ field: "position", type: "number", direction: "asc" }], tieBreak: "input" },
      algorithm: { name: "insertion" },
    },
  },
  {
    id: "beats",
    label: "Musical phrase",
    summary: "Reassemble eight beats by phrase position.",
    program: {
      dsl: "sort-lab/v1",
      title: "Eight-beat phrase",
      objects: [
        { id: "beat-6", label: "Beat 6 · closed hat", data: { position: 6, velocity: 58 } },
        { id: "beat-2", label: "Beat 2 · closed hat", data: { position: 2, velocity: 55 } },
        { id: "beat-8", label: "Beat 8 · open hat", data: { position: 8, velocity: 72 } },
        { id: "beat-1", label: "Beat 1 · kick", data: { position: 1, velocity: 96 } },
        { id: "beat-5", label: "Beat 5 · kick", data: { position: 5, velocity: 91 } },
        { id: "beat-3", label: "Beat 3 · snare", data: { position: 3, velocity: 88 } },
        { id: "beat-7", label: "Beat 7 · snare", data: { position: 7, velocity: 84 } },
        { id: "beat-4", label: "Beat 4 · closed hat", data: { position: 4, velocity: 61 } },
      ],
      order: { keys: [{ field: "position", type: "number", direction: "asc" }], tieBreak: "input" },
      algorithm: { name: "merge" },
    },
  },
  {
    id: "penguins",
    label: "Penguin colony",
    summary: "Order penguins by height, then name.",
    program: {
      dsl: "sort-lab/v1",
      title: "Penguins at the ice edge",
      objects: [
        { id: "pip", label: "Pip", data: { heightCm: 74, name: "Pip" } },
        { id: "moss", label: "Moss", data: { heightCm: 51, name: "Moss" } },
        { id: "taro", label: "Taro", data: { heightCm: 82, name: "Taro" } },
        { id: "luma", label: "Luma", data: { heightCm: 63, name: "Luma" } },
        { id: "beak", label: "Beak", data: { heightCm: 63, name: "Beak" } },
        { id: "nori", label: "Nori", data: { heightCm: 46, name: "Nori" } },
      ],
      order: {
        keys: [
          { field: "heightCm", type: "number", direction: "asc" },
          { field: "name", type: "string", direction: "asc" },
        ],
        tieBreak: "input",
      },
      algorithm: { name: "selection" },
    },
  },
];
