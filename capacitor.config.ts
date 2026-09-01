import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.eldercheck.app",
  appName: "ElderCheck",
  webDir: "public",
  // ElderCheck uses server-side rendering, Server Actions, and cookie-based
  // auth (Supabase), which can't be statically exported into the app bundle.
  // Instead, the native shell loads the live deployed site directly. This is
  // the standard approach for server-rendered apps with Capacitor.
  server: {
    url: "https://eldercheck-polished-colinjat2-7599s-projects.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
