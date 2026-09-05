// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";
import sitemap from "@astrojs/sitemap";
import { readFileSync, readdirSync } from "node:fs";

// Minimal frontmatter read of the blog posts (lang + dates), used for:
// 1. 301 redirects from the legacy duplicate URLs (every article used to be
//    served under BOTH /blog/ and /fr/blog/) to their canonical locale.
// 2. <lastmod> in the sitemap.
const blogMeta = readdirSync("./src/content/blog")
  .filter((f) => f.endsWith(".md"))
  .map((f) => {
    const fm = readFileSync(`./src/content/blog/${f}`, "utf8").split("---")[1] ?? "";
    const get = (/** @type {string} */ key) => fm.match(new RegExp(`^${key}:\\s*\"?([^\"\\n]+)\"?`, "m"))?.[1]?.trim();
    return {
      slug: f.replace(/\.md$/, ""),
      lang: get("lang"),
      lastmod: get("updatedDate") || get("publishDate"),
    };
  });

const blogRedirects = Object.fromEntries(
  blogMeta.map(({ slug, lang }) =>
    lang === "fr"
      ? [`/blog/${slug}`, { status: /** @type {301} */ (301), destination: `/fr/blog/${slug}` }]
      : [`/fr/blog/${slug}`, { status: /** @type {301} */ (301), destination: `/blog/${slug}` }]
  )
);

const blogLastmod = new Map(blogMeta.map((m) => [m.slug, m.lastmod]));

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
      filter: (page) => !page.includes('/success') && !page.includes('/admin') && !page.includes('/self-guided-tour/access'),
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
        const slugMatch = item.url.match(/\/blog\/([^/]+)\/?$/);
        const lastmod = slugMatch && blogLastmod.get(slugMatch[1]);
        if (lastmod) {
          item.lastmod = new Date(lastmod).toISOString();
        }
        return item;
      }
    }),
  ],

  redirects: blogRedirects,

  // Needed for API routes later
  output: "server",

  build: {
    inlineStylesheets: 'always',
  },

  vite: {
    // @ts-ignore
    plugins: [tailwindcss()],
    server: {
      // Self-guided audioguide: its service worker lives at /self-guided-tour/sw.js but also
      // controls /fr/self-guided-tour/ (production: same header in vercel.json).
      headers: { "Service-Worker-Allowed": "/" },
      // Phone testing through a tunnel (cloudflared / ngrok): Vite 6 blocks unknown hosts by default.
      allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".ngrok.app"],
    },
  },

  adapter: vercel({webAnalytics: {enabled: true}}),
});
