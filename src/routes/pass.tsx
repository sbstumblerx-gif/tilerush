import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/game/Placeholder";

export const Route = createFileRoute("/pass")({
  head: () => ({ meta: [{ title: "Tile Pass · Tile Rush" }] }),
  component: () => <Placeholder title="Tile Pass" subtitle="Etenemispassi ja palkintorata." />,
});