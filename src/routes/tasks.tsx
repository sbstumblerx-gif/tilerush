import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/game/Placeholder";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tehtävät · Tile Rush" }] }),
  component: () => <Placeholder title="Tehtävät" subtitle="Päivittäiset ja viikoittaiset haasteet." />,
});