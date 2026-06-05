import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: process.env.PRD_VIEWER_BASE_PATH ?? "/",
  plugins: [react(), tsconfigPaths()]
});
