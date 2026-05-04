/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly STRIPE_SECRET_KEY: string;
  readonly STRIPE_PUBLISHABLE_KEY: string;
  readonly STRIPE_WEBHOOK_SECRET: string;
  readonly STRIPE_PRODUCT_ID_WW2_LEFT_BANK: string;
  readonly STRIPE_PRODUCT_ID_WW2_RIGHT_BANK: string;
  readonly STRIPE_PRODUCT_ID_GENERAL_HISTORY: string;
  readonly STRIPE_PRODUCT_ID_NOURRITOUR: string;
  readonly RESEND_API_KEY: string;
  readonly GOOGLE_PLACES_API_KEY: string;
  readonly GOOGLE_PLACE_ID: string;
  readonly ADMIN_PASSWORD: string;
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly PUBLIC_INSTAGRAM_URL: string;
  readonly PUBLIC_MAPBOX_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    lang: 'en' | 'fr';
  }
}
