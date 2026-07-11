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

/** Build a size×size grid seeded by id, dropping tiles from `alphabet` with the given weights. */
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

// Pack templates -----------------------------------------------------

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
    grid:
      
