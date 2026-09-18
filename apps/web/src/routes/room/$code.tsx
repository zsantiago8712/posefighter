import { createFileRoute } from "@tanstack/react-router";

import { RoomScreen } from "@/features/multiplayer";

type RoomSearch = { fake?: boolean; fresh?: boolean };

export const Route = createFileRoute("/room/$code")({
  ssr: false, // camera + Phaser are browser-only
  validateSearch: (search: Record<string, unknown>): RoomSearch => ({
    fake: flag(search.fake),
    fresh: flag(search.fresh),
  }),
  component: RoomRoute,
});

function flag(v: unknown): boolean {
  return v === true || v === "1" || v === 1 || v === "true";
}

function RoomRoute() {
  const { code } = Route.useParams();
  const { fake, fresh } = Route.useSearch();
  return <RoomScreen code={code.toUpperCase()} fake={!!fake} fresh={!!fresh} />;
}
