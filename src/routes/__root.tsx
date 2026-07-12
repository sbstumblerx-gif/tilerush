import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { RewardScreen } from "@/components/game/RewardScreen";
import { installUiClickSound, loadSoundSettings, playBgm, setMusicVolume, setSfxVolume } from "@/lib/game/sound";
import { loadProgress } from "@/lib/game/progress";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Sivua ei löydy</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Etsimääsi sivua ei ole olemassa tai se on siirretty.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Palaa etusivulle
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Lataus epäonnistui
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Jokin meni vikaan. Yritä uudelleen tai palaa etusivulle.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Yritä uudelleen
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Etusivulle
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Tile Rush · Ruudukkopulma" },
      { name: "description", content: "Ratkaise ruudukkopohjaisia pulmia erilaisten ruutujen sekasotkussa. Rajalliset siirrot, taktinen reittisuunnittelu ja uniikit ruututoiminnot." },
      { name: "author", content: "Tile Rush" },
      { property: "og:title", content: "Tile Rush · Ruudukkopulma" },
      { property: "og:description", content: "Ratkaise ruudukkopohjaisia pulmia erilaisten ruutujen sekasotkussa. Rajalliset siirrot, taktinen reittisuunnittelu ja uniikit ruututoiminnot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Tile Rush · Ruudukkopulma" },
      { name: "twitter:description", content: "Ratkaise ruudukkopohjaisia pulmia erilaisten ruutujen sekasotkussa. Rajalliset siirrot, taktinen reittisuunnittelu ja uniikit ruututoiminnot." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fe435d22-dc02-4990-9824-766110052a19/id-preview-b997a8aa--b9308cc6-5ea3-4ba9-bddd-9e1ea2df2d49.lovable.app-1783278562329.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fe435d22-dc02-4990-9824-766110052a19/id-preview-b997a8aa--b9308cc6-5ea3-4ba9-bddd-9e1ea2df2d49.lovable.app-1783278562329.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  
  useEffect(() => {
    const s = loadSoundSettings();
    const p = loadProgress();
    setMusicVolume(p.settings.music ?? s.music);
    setSfxVolume(p.settings.sfx ?? s.sfx);
    installUiClickSound();
    const start = () => {
      playBgm();
      document.removeEventListener("pointerdown", start);
    };
    document.addEventListener("pointerdown", start);
    return () => document.removeEventListener("pointerdown", start);
  }, []);

  return (
    <html lang="fi">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <Outlet />
          <RewardScreen />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
