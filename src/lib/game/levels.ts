import type { LevelDef } from "./types";

// Seeded PRNG so each level id yields a stable but unique layout across sessions.
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGrid(id: number, size: number, alphabet: string[], weights: number[], maxEnemies: number, moves: number, name: string): LevelDef {
  const rnd = mulberry32(id * 1103515245 + 12345);
  const total = weights.reduce((a, b) => a + b, 0);
  const grid: string[] = [];
  let enemies = 0;
  for (let r = 0; r < size; r++) {
    let row = "";
    for (let c = 0; c < size; c++) {
      // Kulmat: S ylävasen, G alaoikea
      if (r === 0 && c === 0) { row += "S"; continue; }
      if (r === size - 1 && c === size - 1) { row += "G"; continue; }
      
      // KORJAUS: Taataan kulmakulku laajentamalla vapaata aluetta ruutuihin (1,1) ja vastakkaiseen kulmaan
      if (
        (r === 0 && c === 1) || 
        (r === 1 && c === 0) || 
        (r === 1 && c === 1) || 
        (r === size - 1 && c === size - 2) || 
        (r === size - 2 && c === size - 1) ||
        (r === size - 2 && c === size - 2)
      ) {
        row += ".";
        continue;
      }
      
      const roll = rnd() * total;
      let acc = 0;
      let pick = ".";
      for (let i = 0; i < alphabet.length; i++) {
        acc += weights[i];
        if (roll < acc) { pick = alphabet[i]; break; }
      }
      if (pick === "X") {
        if (enemies >= maxEnemies) pick = ".";
        else enemies++;
      }
      // v4.5: esteet eivät saa olla vierekkäin
      if (pick === "#") {
        const leftIsObs = c > 0 && row[c - 1] === "#";
        const upIsObs = r > 0 && grid[r - 1][c] === "#";
        if (leftIsObs || upIsObs) pick = ".";
      }
      row += pick;
    }
    grid.push(row);
  }
  // Varmistetaan portaaliparit
  const pCount = grid.reduce((a, r) => a + (r.match(/P/g)?.length ?? 0), 0);
  if (pCount === 1) {
    outer: for (let r = grid.length - 1; r >= 0; r--) {
      for (let c = grid[r].length - 1; c >= 0; c--) {
        if (grid[r][c] === "." ) {
          grid[r] = grid[r].slice(0, c) + "P" + grid[r].slice(c + 1);
          break outer;
        }
      }
    }
  } else if (pCount > 2) {
    let kept = 0;
    for (let r = 0; r < grid.length; r++) {
      grid[r] = grid[r].replace(/P/g, () => (++kept > 2 ? "." : "P"));
    }
  }
  return { id, name, moves, grid };
}

      const roll = rnd() * total;
      let acc = 0;
      let pick = ".";
      for (let i = 0; i < alphabet.length; i++) {
        acc += weights[i];
        if (roll < acc) { pick = alphabet[i]; break; }
      }
      if (pick === "X") {
        if (enemies >= maxEnemies) pick = ".";
        else enemies++;
      }
      // v4.5: obstacles may never be adjacent (cardinal) to another obstacle.
      if (pick === "#") {
        const leftIsObs = c > 0 && row[c - 1] === "#";
        const upIsObs = r > 0 && grid[r - 1][c] === "#";
        if (leftIsObs || upIsObs) pick = ".";
      }
      row += pick;
    }
    grid.push(row);
  }
  // Ensure exactly one portal pair if any P present
  const pCount = grid.reduce((a, r) => a + (r.match(/P/g)?.length ?? 0), 0);
  if (pCount === 1) {
    // put another P far from the first
    outer: for (let r = grid.length - 1; r >= 0; r--) {
      for (let c = grid[r].length - 1; c >= 0; c--) {
        if (grid[r][c] === "." ) {
          grid[r] = grid[r].slice(0, c) + "P" + grid[r].slice(c + 1);
          break outer;
        }
      }
    }
  } else if (pCount > 2) {
    // trim to 2
    let kept = 0;
    for (let r = 0; r < grid.length; r++) {
      grid[r] = grid[r].replace(/P/g, () => (++kept > 2 ? "." : "P"));
    }
  }
  return { id, name, moves, grid };
}

// Pack templates -----------------------------------------------------
// Each pack has 10 unique layouts thanks to id-based seeding.

function pack(startId: number, size: (i: number) => number, moves: (i: number) => number, alphabet: string[], weights: number[], maxEnemies: number, name: (i: number) => string): LevelDef[] {
  return Array.from({ length: 10 }, (_, i) => buildGrid(startId + i, size(i + 1), alphabet, weights, maxEnemies, moves(i + 1), name(i + 1)));
}

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

// PACK 2 – tropical beach: energy heavy, few obstacles
const PACK2 = pack(11, (i) => (i < 4 ? 5 : i < 8 ? 6 : 7), (i) => 12 + i,
  [".", "#", "E", "I", "C"], [50, 12, 22, 8, 8], 0, (i) => `Rantahetki ${i}`);
// PACK 3 – winter: ice-heavy
const PACK3 = pack(21, (i) => (i < 4 ? 5 : i < 8 ? 6 : 7), (i) => 14 + i,
  [".", "#", "I", "H", "E"], [40, 12, 30, 12, 6], 0, (i) => `Talvi ${i}`);
// PACK 4 – volcano: heavy tiles + obstacles
const PACK4 = pack(31, (i) => (i < 4 ? 5 : i < 8 ? 6 : 7), (i) => 16 + i,
  [".", "#", "H", "C", "?"], [40, 18, 28, 8, 6], 0, (i) => `Ylänkö ${i}`);
// PACK 5 – speedway: energy + chargers
const PACK5 = pack(41, (i) => (i < 4 ? 5 : i < 8 ? 6 : 7), (i) => 10 + i,
  [".", "#", "E", "C", "L"], [40, 10, 30, 12, 8], 0, (i) => `Virta ${i}`);
// PACK 6 – enemy camp: 1-2 enemies, mixed
const PACK6 = pack(51, (i) => (i < 4 ? 5 : i < 8 ? 6 : 7), (i) => 18 + i,
  [".", "#", "X", "H", "I", "E", "?"], [40, 14, 8, 12, 10, 10, 6], 2, (i) => `Leiri ${i}`);
// PACK 7 – launchers
const PACK7 = pack(61, (i) => (i < 4 ? 5 : i < 8 ? 6 : 7), (i) => 14 + i,
  [".", "#", "L", "E", "I", "?"], [40, 12, 26, 12, 6, 4], 0, (i) => `Lento ${i}`);
// PACK 8 – random
const PACK8 = pack(71, (i) => (i < 4 ? 5 : i < 8 ? 6 : 7), (i) => 16 + i,
  [".", "#", "?", "E", "H", "C"], [40, 12, 28, 8, 8, 4], 0, (i) => `Arpapeli ${i}`);
// PACK 9 – dark caves: TNT is granted at start; extra obstacles
const PACK9 = pack(81, (i) => (i < 4 ? 5 : i < 8 ? 6 : 7), (i) => 16 + i,
  [".", "#", "H", "I", "E", "?", "L"], [30, 26, 14, 10, 8, 6, 6], 0, (i) => `Kaamos ${i}`);

export const LEVELS: LevelDef[] = [...PACK1, ...PACK2, ...PACK3, ...PACK4, ...PACK5, ...PACK6, ...PACK7, ...PACK8, ...PACK9];

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}
