import React, { createContext, useContext, useState } from "react";
import type { BookingData } from "./types";

interface Ctx {
  booking: BookingData;
  setBooking: (b: BookingData) => void;
  resetBooking: () => void;
}

const BookingContext = createContext<Ctx | null>(null);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initialBooking: BookingData = {
    tour: undefined as unknown as BookingData["tour"],
    participants: 1,
    tourType: undefined as unknown as BookingData["tourType"],
    date: "",
    time: "",
    name: "",
    email: "",
    phone: "",
  };

  const [booking, setBooking] = useState<BookingData>(initialBooking);

  const resetBooking = () => {
    setBooking(initialBooking);
  };

  return (
    <BookingContext.Provider value={{ booking, setBooking, resetBooking }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used inside BookingProvider");
  return ctx;
};
