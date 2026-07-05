import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/game/Placeholder";

export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "Tilastot · Tile Rush" }] }),
  component: () => <Placeholder title="Tilastot" subtitle="Voitot, häviöt, tehokkuus ja käytetyimmät ruudut." />,
});