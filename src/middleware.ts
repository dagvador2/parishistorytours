import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  // Only set lang on the first pass — Astro.rewrite() re-runs the middleware,
  // so we must not overwrite the value set during the original /fr/* request.
  if (!context.locals.lang) {
    context.locals.lang = context.url.pathname.startsWith('/fr') ? 'fr' : 'en';
  }
  return next();
});
