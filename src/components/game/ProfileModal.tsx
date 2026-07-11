import { useState } from "react";
import { X, Trophy, Star, CheckCircle2, Users, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerToken } from "./PlayerToken";

export interface ProfileData {
  username: string;
  friendCode: string;
  levelsCompleted: number;
  starsCollected: number;
  isSelf?: boolean;
  equipped: {
    color: string;
    shape: string;
    pattern: string;
    accessory: string;
    theme: string;
    emojis?: string[];
  };
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ProfileData | null;
}

export function ProfileModal({ isOpen, onClose, profile }: ProfileModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !profile) return null;

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(profile.friendCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Koodin kopiointi epäonnistui", err);
    }
  };

  const activeEmojis = profile.equipped.emojis || ["😭", "😃", "😅", "👍"];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Sulkeminen taustaa klikkaamalla */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Profiilikortti */}
      <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Sulkemisrasti */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors z-10"
        >
          <X size={16} />
        </button>

        {/* YLÄOSA: Asukokonaisuus (Avatar) ja Nimi */}
        <div className="flex flex-col items-center text-center mt-4">
          <div className="relative p-5 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-inner mb-4 flex items-center justify-center min-h-[120px] min-w-[120px]">
            <PlayerToken equipped={profile.equipped} size={96} />
          </div>

          <h3 className="text-2xl font-black tracking-wide flex items-center gap-2 justify-center">
            {profile.username}
            {!profile.isSelf && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full flex items-center gap-1">
                <Users size={10} /> Kaveri
              </span>
            )}
            {profile.isSelf && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-full">
                Sinä
              </span>
            )}
          </h3>

          {/* Kaverikoodi + Kopiointipainike */}
          <div className="mt-2 flex items-center gap-2 bg-zinc-900 border border-zinc-800/80 rounded-xl px-3 py-1.5 text-xs text-zinc-400">
            <span className="font-mono tracking-wider text-zinc-300">{profile.friendCode}</span>
            <button
              onClick={handleCopyCode}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-all flex items-center justify-center"
              title="Kopioi kaverikoodi"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <hr className="border-zinc-900 my-5" />

        {/* KESKIOSA: Tilastot */}
        <div className="grid grid-cols-2 gap-3">
          {/* Läpäistyt tasot */}
          <div className="bg-zinc-900/50 border border-zinc-900 rounded-2xl p-3.5 text-center">
            <div className="flex justify-center text-blue-400 mb-1">
              <CheckCircle2 size={22} />
            </div>
            <div className="text-xl font-black">{profile.levelsCompleted}</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mt-0.5">Läpäistyt tasot</div>
          </div>

          {/* Kerätyt tähdet */}
          <div className="bg-zinc-900/50 border border-zinc-900 rounded-2xl p-3.5 text-center">
            <div className="flex justify-center text-amber-400 mb-1">
              <Star size={22} fill="currentColor" />
            </div>
            <div className="text-xl font-black">{profile.starsCollected}</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mt-0.5">Kerätyt tähdet</div>
          </div>
        </div>

        {/* ALAOSA: Käyttäjän emoji-nelikko */}
        <div className="mt-4 bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-black mb-3 flex items-center gap-1.5 justify-center">
            <Trophy size={12} className="text-amber-500" /> Käytössä olevat emojit
          </div>
          <div className="flex justify-center gap-2">
            {activeEmojis.slice(0, 4).map((emoji, index) => (
              <div 
                key={index} 
                className="w-12 h-12 bg-zinc-900 border border-zinc-800/80 rounded-xl flex items-center justify-center text-2xl shadow-md"
              >
                {emoji}
              </div>
            ))}
          </div>
        </div>

        {/* Alapainike sulkemiseen */}
        <div className="mt-5">
          <Button className="w-full rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-sm" onClick={onClose}>
            Sulje
          </Button>
        </div>

      </div>
    </div>
  );
            }
