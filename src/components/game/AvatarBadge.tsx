import { AVATARS } from "@/lib/game/cosmetics";

/** Profiilikuvan tunnisteesta emojiksi. */
export const AVATAR_EMOJI: Record<string, string> = Object.fromEntries(
  AVATARS.filter((a) => a.id !== "default" && a.preview).map((a) => [a.id, a.preview as string]),
);

interface Props {
  /** Profiilikuvan id (equipped.avatar). */
  avatar?: string | null;
  /** Varanimikirjain, jos profiilikuvaa ei ole valittu. */
  name?: string;
  size?: number;
  className?: string;
}

/**
 * Profiilikuva – täysin erillinen pelihahmosta (PlayerToken).
 * Näkyy nimen yhteydessä esim. lobbyssa, partyissa ja onlineotteluissa.
 */
export function AvatarBadge({ avatar, name, size = 36, className = "" }: Props) {
  const emoji = avatar && avatar !== "default" ? AVATAR_EMOJI[avatar] : undefined;
  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-900 border border-primary/40 select-none overflow-hidden ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      aria-label={name ? `${name} profiilikuva` : "Profiilikuva"}
    >
      {emoji ? <span>{emoji}</span> : (
        <span className="font-black text-primary" style={{ fontSize: size * 0.45 }}>
          {(name ?? "?").slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}
