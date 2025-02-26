import type { Config } from "@react-router/dev/config";

export default {
  // Config options...
  appDirectory: "src",
  prerender: ["/","/about"],
  ssr: false
} satisfies Config;
