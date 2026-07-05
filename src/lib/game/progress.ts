const KEY = "tilerush.progress.v1";

export interface Progress {
  completed: number[];
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return { completed: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { completed: [] };
    const parsed = JSON.parse(raw) as Progress;
    return { completed: Array.isArray(parsed.completed) ? parsed.completed : [] };
  } catch {
    return { completed: [] };
  }
}

export function markComplete(levelId: number): void {
  if (typeof window === "undefined") return;
  const p = loadProgress();
  if (!p.completed.includes(levelId)) p.completed.push(levelId);
  window.localStorage.setItem(KEY, JSON.stringify(p));
}

export function isUnlocked(levelId: number, completed: number[]): boolean {
  if (levelId === 1) return true;
  return completed.includes(levelId - 1);
}

export function firstUnfinished(completed: number[], allIds: number[]): number {
  for (const id of allIds) if (!completed.includes(id)) return id;
  return allIds[allIds.length - 1];
}