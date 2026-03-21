import React, { createContext, useContext, useState } from "react";
import type { BookingData } from "./types";

interface Ctx {
  booking: BookingData;
  setBooking: (b: BookingData) => void;
  resetBooking: () => void;
  t: Record<string, any>;
  lang: string;
}

const BookingContext = createContext<Ctx | null>(null);

export const BookingProvider: React.FC<{
  children: React.ReactNode;
  translations: Record<string, any>;
  lang: string;
  defaultTour?: string;
}> = ({ children, translations, lang, defaultTour }) => {
  const initialBooking: BookingData = {
    tour: (defaultTour as BookingData["tour"]) || (undefined as unknown as BookingData["tour"]),
    participants: 2,
    tourType: undefined as unknown as BookingData["tourType"],
    date: "",
    time: "",
    name: "",
    email: "",
    phone: "",
    message: "",
  };

  const [booking, setBooking] = useState<BookingData>(initialBooking);

  const resetBooking = () => {
    setBooking(initialBooking);
  };

  return (
    <BookingContext.Provider value={{ booking, setBooking, resetBooking, t: translations, lang }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used inside BookingProvider");
  return ctx;
};
