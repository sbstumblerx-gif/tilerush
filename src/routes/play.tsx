import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/play")({
  component: PlayPage,
});

function PlayPage() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Pelisivu</h1>
      <p>Reitti tunnistettu onnistuneesti.</p>
    </div>
  );
}
