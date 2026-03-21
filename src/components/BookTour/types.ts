export type Tour = "left-bank" | "right-bank";
export type TourType = "regular" | "private";
export type PaymentMethod = "stripe" | "on_site";

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
