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
      filter: (page) => !page.includes('/success') && !page.includes('/admin'),
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

  build: {
    inlineStylesheets: 'always',
  },

  vite: {
    // @ts-ignore
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          // Force stable filenames so Vercel deploys updated content
          // (Vercel has a bug where new content-hashed filenames are dropped)
          chunkFileNames: '_astro/[name].js',
          entryFileNames: '_astro/[name].js',
        }
      }
    }
  },

  adapter: vercel({webAnalytics: {enabled: true}}),
});
