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
    sitemap({
      filter: (page) => !page.includes('/success'),
      serialize(item) {
        if (item.url.endsWith('.com/') || item.url.includes('/fr/') && !item.url.includes('/tours/') && !item.url.includes('/key-figures') && !item.url.includes('/blog')) {
          item.priority = 1.0;
        } else if (item.url.includes('/tours/')) {
          item.priority = 0.9;
        } else if (item.url.includes('/blog/')) {
          item.priority = 0.8;
        } else {
          item.priority = 0.7;
        }
        return item;
      }
    }),
  ],

  // Needed for API routes later
  output: "server",

  vite: {
    // @ts-ignore
    plugins: [tailwindcss()],
  },

  adapter: vercel({webAnalytics: {enabled: true}}),
});
