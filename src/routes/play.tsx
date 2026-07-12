import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/play")({
  component: () => (
    <div style={{ padding: "20px", textBreak: "break-word" }}>
      <h1>Testi</h1>
      <p>Jos näet tämän, itse sivu toimii ja vika on pelikomponenteissa.</p>
    </div>
  ),
});
