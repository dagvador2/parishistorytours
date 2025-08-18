// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://www.parishistorytours.com",
  i18n: {
    defaultLocale: "en",
    locales: ["en", "fr"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false
    }
  },
  integrations: [
    react(),
    sitemap(),
  ],

  // Needed for API routes later
  output: "server",

  vite: {
    // @ts-ignore
    plugins: [tailwindcss()],
  },

  adapter: vercel({webAnalytics: {enabled: true}}),
});
