import { createFileRoute } from "@tanstack/react-router";

import { HomeScreen } from "@/features/multiplayer";

export const Route = createFileRoute("/")({
  ssr: false,
  component: HomeScreen,
});
