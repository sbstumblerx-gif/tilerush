import { useEffect, useState } from "react";
import { OpenContainer } from "./OpenContainer";
import { PRESENT_EVENT, type PresentedContainer } from "@/lib/game/containers";

/** Näyttää heti lunastetut laatikot, sydämet ja reput avattavaksi. */
export function ContainerHost() {
  const [queue, setQueue] = useState<PresentedContainer[]>([]);

  useEffect(() => {
    const onPresent = (e: Event) => {
      const detail = (e as CustomEvent<PresentedContainer>).detail;
      if (!detail) return;
      setQueue((q) => [...q, detail]);
    };
    window.addEventListener(PRESENT_EVENT, onPresent);
    return () => window.removeEventListener(PRESENT_EVENT, onPresent);
  }, []);

  if (queue.length === 0) return null;
  const current = queue[0];

  return (
    <OpenContainer
      kind={current.kind}
      startRarity={current.rarity}
      allowStore
      onDone={() => setQueue((q) => q.slice(1))}
    />
  );
}