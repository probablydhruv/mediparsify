import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";
import netlifyPlugin from "@netlify/vite-plugin-react-router";

export default defineConfig({
  ssr: {
    noExternal: ["react-dropzone"],
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths(), netlifyPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
