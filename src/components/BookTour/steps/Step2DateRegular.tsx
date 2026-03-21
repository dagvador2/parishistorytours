import React, { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useBooking } from "../BookingContext";

interface Slot {
  id: string;
  start_time: string;
  free: number;
  price?: number;
}

const Step2DateRegular: React.FC = () => {
  const { booking, setBooking, t, lang } = useBooking();
  const [selectedDay, setSelectedDay] = useState<Date>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [availableDays, setAvailableDays] = useState<Record<string, number>>({});
  const [pricePerPerson, setPricePerPerson] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState<boolean>(true);

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const participantsLabel = booking.participants === 1 ? t.person : t.people;

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(`/api/stripe-price?tour=${booking.tour}`);
        if (!response.ok) throw new Error("Failed to fetch price");
        const priceData = await response.json();
        setPricePerPerson(priceData.unit_amount / 100);
      } catch {
        setPricePerPerson(50);
      } finally {
        setPriceLoading(false);
      }
    };
    fetchPrice();
  }, [booking.tour]);

  useEffect(() => {
    const fetchAllSlots = async () => {
      try {
        const res = await fetch(
          `/api/sessions?tour=${booking.tour}&participants=${booking.participants}`
        );
        if (!res.ok) return;
        const { availableDays: days } = await res.json();
        setAvailableDays(days || {});
      } catch (err) {
        console.error("Error fetching sessions:", err);
      }
    };
    fetchAllSlots();
  }, [booking.tour, booking.participants]);

  useEffect(() => {
    if (!selectedDay) return;
    const fetchSlots = async () => {
      try {
        const dateStr = selectedDay.toISOString().split("T")[0];
        const res = await fetch(
          `/api/sessions/${dateStr}?tour=${booking.tour}&participants=${booking.participants}`
        );
        if (!res.ok) return;
        const { slots: fetchedSlots } = await res.json();
        setSlots(
          (fetchedSlots || []).map((slot: any) => ({
            ...slot,
            price: pricePerPerson,
          }))
        );
      } catch (err) {
        console.error("Error fetching slots:", err);
      }
    };
    fetchSlots();
  }, [selectedDay, booking.tour, booking.participants, pricePerPerson]);

  const selectSlot = (slot: Slot) => {
    const date = new Date(slot.start_time).toISOString().split("T")[0];
    const time = new Date(slot.start_time)
      .toTimeString()
      .split(" ")[0]
      .substring(0, 5);

    setBooking({
      ...booking,
      date,
      time,
      sessionId: slot.id,
      price: pricePerPerson * booking.participants,
    });
  };

  const modifiers = {
    available: Object.keys(availableDays).map((d) => new Date(d)),
  };

  const modifiersStyles = {
    available: {
      backgroundColor: "#FEF3C7",
      color: "#92400E",
      borderRadius: "50%",
    },
  };

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: lang !== "fr",
    });
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">
        {t.step2Regular.title}
      </h3>
      <p className="text-sm text-gray-500 text-center mb-6">
        {booking.tour === "left-bank" ? t.leftBankTour : t.rightBankTour} · {booking.participants} {participantsLabel}
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Calendar */}
        <div className="flex flex-col items-center">
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            weekStartsOn={1}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            disabled={[{ before: new Date() }]}
            footer={
              <p className="mt-2 text-sm text-gray-500 text-center">
                {t.calendar.blueDates} {booking.participants} {participantsLabel}.
              </p>
            }
          />
        </div>

        {/* Available slots */}
        <div>
          {selectedDay && (
            <div>
              <h4 className="font-bold text-gray-800 mb-4 text-center md:text-left">
                {selectedDay.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
              </h4>
              {slots.length > 0 ? (
                <div className="space-y-3">
                  {slots.map((slot) => {
                    const isSelected = booking.sessionId === slot.id;
                    const manySpots = slot.free >= 5;
                    return (
                      <button
                        key={slot.id}
                        onClick={() => selectSlot(slot)}
                        className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                          isSelected
                            ? "border-blue-600 bg-blue-50 shadow-md shadow-blue-100"
                            : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                        }`}
                        disabled={priceLoading}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold text-gray-800 text-lg">
                              {formatTime(slot.start_time)}
                            </div>
                            <div
                              className={`text-sm mt-0.5 ${
                                manySpots ? "text-green-600 font-semibold" : "text-gray-500"
                              }`}
                            >
                              {slot.free} {t.calendar.spotsAvailable}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-800">
                              {priceLoading
                                ? t.calendar.loading
                                : `€${pricePerPerson} ${t.calendar.perPerson}`}
                            </div>
                            {isSelected && !priceLoading && (
                              <div className="text-sm text-blue-600 font-bold mt-0.5">
                                {t.calendar.total} €{pricePerPerson * booking.participants}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <div className="ml-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">
                    {t.calendar.noSessions} {booking.participants} {participantsLabel}{" "}
                    {t.calendar.onThisDate}
                  </p>
                </div>
              )}
            </div>
          )}
          {!selectedDay && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">{t.calendar.selectDate}</p>
            </div>
          )}
        </div>
      </div>

      {/* Session selected confirmation */}
      {booking.sessionId && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-green-800 font-semibold">
              {t.calendar.sessionSelected}{" "}
              {booking.date && new Date(booking.date).toLocaleDateString(locale)}{" "}
              {t.calendar.at} {booking.time}
            </span>
          </div>
          <p className="text-xl font-bold text-green-800">
            {t.calendar.total} €{booking.price}
          </p>
        </div>
      )}
    </div>
  );
};

export default Step2DateRegular;
