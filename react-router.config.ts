import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  // Config options...
  appDirectory: "src",
  ssr: true,
  presets: [vercelPreset()],
} satisfies Config;
