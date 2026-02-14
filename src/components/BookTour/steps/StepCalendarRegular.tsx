import React, { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useBooking } from "../BookingContext";
import { supabase } from "../../../lib/supabase";

interface Props {
  active: boolean;
}

interface Slot {
  id: string;
  start_time: string;
  free: number;
  price?: number;
}

const StepCalendarRegular: React.FC<Props> = ({ active }) => {
  const { booking, setBooking, t, lang } = useBooking();
  const [selectedDay, setSelectedDay] = useState<Date>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [availableDays, setAvailableDays] = useState<Record<string, number>>(
    {}
  );
  const [pricePerPerson, setPricePerPerson] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState<boolean>(true);

  if (!active || booking.tourType !== "regular") return null;

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const participantsLabel = booking.participants === 1 ? t.person : t.people;

  // Fetch price from Stripe API
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(`/api/stripe-price?tour=${booking.tour}`);
        if (!response.ok) {
          throw new Error("Failed to fetch price");
        }
        const priceData = await response.json();
        const price = priceData.unit_amount / 100;
        setPricePerPerson(price);
      } catch (error) {
        console.error("Error fetching price:", error);
        setPricePerPerson(50);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchPrice();
  }, []);

  // Fetch all slots on component load
  useEffect(() => {
    const fetchAllSlots = async () => {
      try {
        const { data, error } = await supabase
          .from("sessions")
          .select("id, start_time, available_spots, tour_type")
          .eq("tour_type", booking.tour)
          .gte("start_time", new Date().toISOString());

        if (error) {
          console.error("Error fetching all slots:", error);
          return;
        }

        const groupedSlots: Record<string, number> = {};
        data?.forEach((slot) => {
          const date = new Date(slot.start_time).toISOString().split("T")[0];
          if (slot.available_spots >= booking.participants) {
            groupedSlots[date] = (groupedSlots[date] || 0) + 1;
          }
        });

        setAvailableDays(groupedSlots);
      } catch (err) {
        console.error("Unexpected error fetching all slots:", err);
      }
    };

    fetchAllSlots();
  }, [booking.tour, booking.participants]);

  // Fetch slots for the selected day
  useEffect(() => {
    if (!selectedDay) return;

    const fetchSlots = async () => {
      try {
        const begin = new Date(selectedDay);
        begin.setHours(0, 0, 0, 0);
        const end = new Date(selectedDay);
        end.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from("sessions")
          .select("id, start_time, available_spots")
          .eq("tour_type", booking.tour)
          .gte("start_time", begin.toISOString())
          .lte("start_time", end.toISOString());

        if (error) {
          console.error("Error fetching slots for selected day:", error);
          return;
        }

        const availableSlots = (data || []).filter(
          (slot: { available_spots: number }) =>
            slot.available_spots >= booking.participants
        );

        const mappedSlots: Slot[] = availableSlots.map((slot: any) => ({
          id: slot.id,
          start_time: slot.start_time,
          free: slot.available_spots,
          price: pricePerPerson,
        }));

        setSlots(mappedSlots);
      } catch (err) {
        console.error("Unexpected error fetching slots for selected day:", err);
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
      date: date,
      time: time,
      sessionId: slot.id,
      price: pricePerPerson * booking.participants,
    });
  };

  const modifiers = {
    available: Object.keys(availableDays).map((date) => new Date(date)),
  };

  const modifiersStyles = {
    available: {
      backgroundColor: "#E0F2FE",
      color: "#0284C7",
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
      <h3 className="text-xl font-semibold text-gray-800 mb-6">
        {t.step4Calendar}
      </h3>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <div>
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            weekStartsOn={1}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            disabled={[
              { before: new Date() },
            ]}
            footer={
              <p className="mt-2 text-sm text-gray-600">
                {t.calendar.blueDates} {booking.participants}{" "}
                {participantsLabel}.
              </p>
            }
          />
        </div>
        {/* Available slots */}
        <div>
          {selectedDay && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-4">
                {t.calendar.availableSessions} {selectedDay.toLocaleDateString(locale)} {t.calendar.for}{" "}
                {booking.participants}{" "}
                {participantsLabel}.
              </h4>
              {slots.length > 0 ? (
                <div className="space-y-3">
                  {slots.map((slot) => {
                    const isSelected = booking.sessionId === slot.id;
                    return (
                      <button
                        key={slot.id}
                        onClick={() => selectSlot(slot)}
                        className={`w-full p-3 border rounded-lg text-left transition-all duration-200 ${
                          isSelected
                            ? "border-gray-600 bg-gray-50"
                            : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                        }`}
                        disabled={priceLoading}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-800">
                              {formatTime(slot.start_time)}
                            </div>
                            <div className="text-sm text-gray-600">
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
                              <div className="text-sm text-blue-600">
                                {t.calendar.total} €{pricePerPerson * booking.participants}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  {t.calendar.noSessions} {booking.participants}{" "}
                  {participantsLabel} {t.calendar.onThisDate}
                </p>
              )}
            </div>
          )}
          {!selectedDay && (
            <p className="text-gray-500 text-sm">
              {t.calendar.selectDate}
            </p>
          )}
        </div>
      </div>
      {booking.sessionId && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-green-800 font-medium">
              {t.calendar.sessionSelected}{" "}
              {booking.date && new Date(booking.date).toLocaleDateString(locale)} {t.calendar.at}{" "}
              {booking.time}
            </span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            {t.calendar.total} €{booking.price} {t.calendar.for} {booking.participants}{" "}
            {participantsLabel}
          </p>
        </div>
      )}
    </div>
  );
};
export default StepCalendarRegular;
