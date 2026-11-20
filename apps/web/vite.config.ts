import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const envDir = "../..";
  const environment = loadEnv(mode, envDir, "R2_PUBLIC_BASE_URL");
  const publicBaseUrl = (environment.R2_PUBLIC_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (publicBaseUrl) {
    const url = URL.parse(publicBaseUrl);
    if (!url || !publicBaseUrl.startsWith("https://") || url.username || url.password || url.search || url.hash || publicBaseUrl.includes("\\")) {
      throw new Error("R2_PUBLIC_BASE_URL must be a valid HTTPS URL");
    }
  }
  return {
    plugins: [react(), tailwindcss()],
    envDir,
    define: { "import.meta.env.R2_PUBLIC_BASE_URL": JSON.stringify(publicBaseUrl) },
    server: {
      port: 5173,
      strictPort: true,
      proxy: { "/api": "http://localhost:4000" },
    },
  };
});
