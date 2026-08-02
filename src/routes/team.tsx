import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/game/Placeholder";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Joukkue · Tile Rush" },
      { name: "description", content: "Joukkueet saapuvat Tile Rushiin: perusta joukkue kavereiden kanssa ja kilpaile yhteisistä palkinnoista." },
      { property: "og:title", content: "Joukkue · Tile Rush" },
      { property: "og:description", content: "Joukkueet saapuvat Tile Rushiin tulevassa päivityksessä." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Placeholder
      title="Joukkue"
      subtitle="Perusta joukkue kavereiden kanssa ja kilpailkaa yhteisistä palkinnoista. Ominaisuus avautuu tulevassa päivityksessä."
    />
  ),
});