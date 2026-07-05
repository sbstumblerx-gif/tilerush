import type { LevelDef } from "./types";

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: "Ensiaskeleet",
    moves: 10,
    grid: [
      "S....",
      ".#.#.",
      ".....",
      ".#.#.",
      "....G",
    ],
  },
  {
    id: 2,
    name: "Energiavirta",
    moves: 8,
    grid: [
      "S..#.",
      ".#E..",
      "..#E.",
      ".E.#.",
      "##..G",
    ],
  },
  {
    id: 3,
    name: "Raskas polku",
    moves: 12,
    grid: [
      "S.H..",
      ".#H#.",
      "..H..",
      "H#.#H",
      "....G",
    ],
  },
  {
    id: 4,
    name: "Portaalit",
    moves: 10,
    grid: [
      "S..#P",
      ".##..",
      ".....",
      "..##.",
      "P..#G",
    ],
  },
  {
    id: 5,
    name: "Jäätävää",
    moves: 14,
    grid: [
      "S.I..",
      ".#I#.",
      "II.II",
      ".#I#.",
      "..I.G",
    ],
  },
  {
    id: 6,
    name: "Latauskenttä",
    moves: 8,
    grid: [
      "S.#..",
      "..C#.",
      "#....",
      ".#C#.",
      "..#.G",
    ],
  },
  {
    id: 7,
    name: "Uhkapeli",
    moves: 12,
    grid: [
      "S..?.",
      ".#.#.",
      "?...?",
      ".#.#.",
      ".?..G",
    ],
  },
  {
    id: 8,
    name: "Sekasotku",
    moves: 16,
    grid: [
      "S.H.P.",
      ".#IE#.",
      ".?..C.",
      ".#II#.",
      ".C..?.",
      "P.#.HG",
    ],
  },
];

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}