import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/game/Placeholder";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Asetukset · Tile Rush" }] }),
  component: () => <Placeholder title="Asetukset" subtitle="Ääni, grafiikka, esteettömyys, pelinopeus." />,
});