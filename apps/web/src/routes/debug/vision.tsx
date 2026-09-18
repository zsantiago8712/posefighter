import { createFileRoute } from "@tanstack/react-router";

import { VisionDebugPage } from "@/features/vision/VisionDebugPage";

export const Route = createFileRoute("/debug/vision")({
  ssr: false,
  component: VisionDebugPage,
});
