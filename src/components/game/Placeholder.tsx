import { Link } from "@tanstack/react-router";
import { ArrowLeft, Construction } from "lucide-react";

export function Placeholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="min-h-screen px-4 py-8 max-w-[520px] mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Lobby
      </Link>
      <div className="mt-10 neon-panel p-8 flex flex-col items-center text-center gap-3">
        <Construction className="h-10 w-10 text-primary" />
        <h1 className="text-3xl font-black">{title}</h1>
        <p className="text-sm text-muted-foreground max-w-xs">{subtitle}</p>
        <div className="mt-2 text-xs uppercase tracking-widest text-accent">Tulossa pian</div>
      </div>
    </div>
  );
}