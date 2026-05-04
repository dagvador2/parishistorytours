import Stripe from 'stripe';

export type TourSlug = 'left-bank' | 'right-bank' | 'general-history' | 'food-wine';

export const TOUR_SLUGS: readonly TourSlug[] = [
  'left-bank',
  'right-bank',
  'general-history',
  'food-wine',
] as const;

export const isTourSlug = (value: unknown): value is TourSlug =>
  typeof value === 'string' && (TOUR_SLUGS as readonly string[]).includes(value);

const PRODUCT_ID_BY_TOUR: Record<TourSlug, string | undefined> = {
  'left-bank': import.meta.env.STRIPE_PRODUCT_ID_WW2_LEFT_BANK,
  'right-bank': import.meta.env.STRIPE_PRODUCT_ID_WW2_RIGHT_BANK,
  'general-history': import.meta.env.STRIPE_PRODUCT_ID_GENERAL_HISTORY,
  'food-wine': import.meta.env.STRIPE_PRODUCT_ID_NOURRITOUR,
};

export const getProductIdForTour = (tour: TourSlug): string => {
  const id = PRODUCT_ID_BY_TOUR[tour];
  if (!id) {
    throw new Error(`Missing Stripe product id for tour "${tour}". Set the matching STRIPE_PRODUCT_ID_* env var.`);
  }
  return id;
};

let stripeClient: Stripe | null = null;
const getStripe = (): Stripe => {
  if (!stripeClient) {
    stripeClient = new Stripe(import.meta.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-07-30.basil',
    });
  }
  return stripeClient;
};

export const fetchActivePrice = async (tour: TourSlug): Promise<Stripe.Price> => {
  const productId = getProductIdForTour(tour);
  const prices = await getStripe().prices.list({
    product: productId,
    active: true,
    limit: 1,
  });
  if (!prices.data.length) {
    throw new Error(`No active price found for tour "${tour}" (product ${productId}).`);
  }
  return prices.data[0];
};
