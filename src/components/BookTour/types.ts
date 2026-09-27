export type Tour = "left-bank" | "right-bank" | "general-history" | "food-wine";
export type TourType = "regular" | "private";
export type PaymentMethod = "stripe" | "on_site";

/** A bookable session slot as returned by /api/sessions. */
export interface SessionSlot {
  id: string;
  start_time: string;
  free: number;
  tour_type: string;
  /** Language the walk is narrated in. */
  language?: "en" | "fr";
}

export interface BookingData {
  tour: Tour;
  participants: number;
  tourType: TourType;
  date: string;
  time: string;
  sessionId?: string;
  price?: number;
  name: string;
  email: string;
  phone: string;
  message?: string;
  paymentMethod?: PaymentMethod;
  status?: string; // pending, pending_payment, confirmed, etc.
}
