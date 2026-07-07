import { ACCESSORIES, COLORS, PATTERNS, SHAPES } from "@/lib/game/cosmetics";
import type { Equipped } from "@/lib/game/progress";
import fifaBall from "@/assets/fifa-ball.png.asset.json";

interface Props {
  equipped: Equipped;
  size?: number;
  showAccessory?: boolean;
}

const SHAPE_CLIP: Record<string, string> = {
  circle: "circle(50% at 50% 50%)",
  square: "inset(0%)",
  star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
  kolmio: "polygon(50% 0%, 100% 100%, 0% 100%)",
  hex: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
  tiimalasi: "polygon(0% 0%, 100% 0%, 20% 50%, 100% 100%, 0% 100%, 80% 50%)",
};

export function PlayerToken({ equipped, size = 44, showAccessory = true }: Props) {
  const color = COLORS.find((c) => c.id === equipped.color)?.preview ?? "#22d3ee";
  const shape = SHAPES.find((s) => s.id === equipped.shape)?.id ?? "circle";
  const pattern = PATTERNS.find((p) => p.id === equipped.pattern);
  const acc = ACCESSORIES.find((a) => a.id === equipped.accessory);
  const clip = SHAPE_CLIP[shape] ?? SHAPE_CLIP.circle;
  const isFifa = pattern?.id === "fifa";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* body */}
      <div
        className="absolute inset-0 shadow-[0_0_10px_rgba(255,255,255,0.35)]"
        style={{
          background: isFifa ? undefined : color,
          clipPath: clip,
          WebkitClipPath: clip,
        }}
      >
        {isFifa && (
          <img
            src={fifaBall.url}
            alt=""
            className="w-full h-full object-cover"
            style={{ clipPath: clip, WebkitClipPath: clip }}
          />
        )}
      </div>
      {/* pattern overlay (except fifa which uses image) */}
      {pattern && !isFifa && pattern.id !== "none" && (
        <div
          className="absolute inset-0 flex items-center justify-center text-white/80 pointer-events-none"
          style={{ fontSize: size * 0.55, clipPath: clip, WebkitClipPath: clip, mixBlendMode: "overlay" }}
        >
          {pattern.preview}
        </div>
      )}
      {/* accessory on top of head */}
      {showAccessory && acc && acc.id !== "none" && (
        <span
          className="absolute pointer-events-none"
          style={{ top: -size * 0.35, left: "50%", transform: "translateX(-50%)", fontSize: size * 0.55 }}
        >
          {acc.preview}
        </span>
      )}
    </div>
  );
}