import { createFileRoute } from "@tanstack/react-router";

import { RoomScreen } from "@/features/multiplayer";

type RoomSearch = { fake?: boolean };

export const Route = createFileRoute("/room/$code")({
  ssr: false, // camera + Phaser are browser-only
  validateSearch: (search: Record<string, unknown>): RoomSearch => ({
    fake: search.fake === true || search.fake === "1" || search.fake === 1 || search.fake === "true",
  }),
  component: RoomRoute,
});

function RoomRoute() {
  const { code } = Route.useParams();
  const { fake } = Route.useSearch();
  return <RoomScreen code={code.toUpperCase()} fake={!!fake} />;
}
