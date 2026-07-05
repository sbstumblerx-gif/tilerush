import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/game/Placeholder";

export const Route = createFileRoute("/customize")({
  head: () => ({ meta: [{ title: "Mukauta · Tile Rush" }] }),
  component: () => <Placeholder title="Mukauta" subtitle="Skinit, teemat ja ulkoasu." />,
});