import type { LevelDef } from "./types";

const PACK1: LevelDef[] = [
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
    name: "Vihollisleiri",
    moves: 14,
    grid: [
      "S....",
      "..X..",
      ".....",
      "..X..",
      "....G",
    ],
  },
  {
    id: 9,
    name: "Laukaisurampit",
    moves: 10,
    grid: [
      "S....",
      ".#L#.",
      ".....",
      ".#L#.",
      "....G",
    ],
  },
  {
    id: 10,
    name: "Sekasotku",
    moves: 18,
    grid: [
      "S.H.P.",
      ".#IEL.",
      ".?..C.",
      ".#IIX.",
      ".C..?.",
      "P.#.HG",
    ],
  },
];

/** Generate simple themed levels for later packs. */
function genPack(startId: number, name: (i: number) => string, moves: (i: number) => number, buildGrid: (i: number) => string[]): LevelDef[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: startId + i,
    name: name(i + 1),
    moves: moves(i + 1),
    grid: buildGrid(i + 1),
  }));
}

const PACK2 = genPack(11, (i) => `Rantahetki ${i}`, () => 14, (i) => [
  "S....",
  ".E.E.",
  "..#..",
  ".E.E.",
  `..${i % 2 === 0 ? "E" : "."}.G`,
]);

const PACK3 = genPack(21, (i) => `Talvi ${i}`, () => 16, () => [
  "S.I..",
  "II.II",
  ".I.I.",
  "II.II",
  "..I.G",
]);

const PACK4 = genPack(31, (i) => `Ylänkö ${i}`, () => 18, () => [
  "S.H..",
  "H.H.H",
  ".H.H.",
  "H.H.H",
  "..H.G",
]);

const PACK5 = genPack(41, (i) => `Virta ${i}`, () => 10, () => [
  "S.E..",
  "EE.EE",
  ".E.E.",
  "EE.EE",
  "..E.G",
]);

const PACK6 = genPack(51, (i) => `Leiri ${i}`, () => 20, () => [
  "S....",
  ".X.X.",
  ".....",
  ".X.X.",
  "....G",
]);

export const LEVELS: LevelDef[] = [...PACK1, ...PACK2, ...PACK3, ...PACK4, ...PACK5, ...PACK6];

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}