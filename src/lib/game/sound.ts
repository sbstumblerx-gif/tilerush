import bgm from "@/assets/bgm.mp3.asset.json";
import sfxWin from "@/assets/sfx-win.mp3.asset.json";
import sfxLose from "@/assets/sfx-lose.mp3.asset.json";
import sfxPop from "@/assets/sfx-pop.mp3.asset.json";

type SoundKind = "win" | "lose" | "pop";

let bgmEl: HTMLAudioElement | null = null;
let sfxCache: Partial<Record<SoundKind, HTMLAudioElement>> = {};
let music = 0.4;
let sfx = 0.7;

function ensureBgm() {
  if (typeof window === "undefined") return null;
  if (!bgmEl) {
    bgmEl = new Audio(bgm.url);
    bgmEl.loop = true;
    bgmEl.volume = music;
  }
  return bgmEl;
}

export function loadSoundSettings(): { music: number; sfx: number } {
  if (typeof window === "undefined") return { music, sfx };
  try {
    const raw = window.localStorage.getItem("tilerush.sound.v1");
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.music === "number") music = p.music;
      if (typeof p.sfx === "number") sfx = p.sfx;
    }
  } catch {}
  if (bgmEl) bgmEl.volume = music;
  return { music, sfx };
}

export function setMusicVolume(v: number) {
  music = Math.max(0, Math.min(1, v));
  if (bgmEl) bgmEl.volume = music;
  persist();
}
export function setSfxVolume(v: number) {
  sfx = Math.max(0, Math.min(1, v));
  persist();
}
function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("tilerush.sound.v1", JSON.stringify({ music, sfx }));
}

export function playBgm() {
  const el = ensureBgm();
  if (!el) return;
  el.volume = music;
  if (el.paused) el.play().catch(() => {});
}
export function pauseBgm() {
  if (bgmEl && !bgmEl.paused) bgmEl.pause();
}

const SRC: Record<SoundKind, string> = {
  win: sfxWin.url,
  lose: sfxLose.url,
  pop: sfxPop.url,
};

export function playSfx(kind: SoundKind) {
  if (typeof window === "undefined") return;
  let el = sfxCache[kind];
  if (!el) {
    el = new Audio(SRC[kind]);
    sfxCache[kind] = el;
  }
  try {
    el.currentTime = 0;
  } catch {}
  el.volume = sfx;
  el.play().catch(() => {});
}

/** Attach a click listener to the document that plays the pop sfx on any button click. */
export function installUiClickSound() {
  if (typeof window === "undefined") return;
  const handler = (e: MouseEvent) => {
    const t = e.target as HTMLElement | null;
    if (!t) return;
    if (t.closest("button, [role=button], a")) playSfx("pop");
  };
  document.addEventListener("click", handler, { capture: true });
}