import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  server: {
    port: 3001,
    // Let phones/other PCs reach the dev server through HTTPS tunnels (camera needs HTTPS).
    allowedHosts: [".ngrok-free.app", ".ngrok.app", ".trycloudflare.com"],
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    varlockVitePlugin({ ssrInjectMode: "resolved-env" }),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
  // Bundle all SSR deps for production: Vercel functions have no node_modules at runtime.
  // In dev, keep deps external — inlining CJS packages (react) into the SSR module runner
  // throws "module is not defined".
  ssr: {
    noExternal: command === "build" ? true : undefined,
  },
}));
