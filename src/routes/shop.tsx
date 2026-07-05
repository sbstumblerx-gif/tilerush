import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/game/Placeholder";

export const Route = createFileRoute("/shop")({
  head: () => ({ meta: [{ title: "Kauppa · Tile Rush" }] }),
  component: () => <Placeholder title="Kauppa" subtitle="Itemit ja kosmeettiset avautuvat pian." />,
});