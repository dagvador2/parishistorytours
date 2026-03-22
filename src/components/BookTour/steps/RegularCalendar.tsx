import React, { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useBooking } from "../BookingContext";
import { getTourName, getTourStops, tourInfo } from "../../../data/tour-info";

interface Slot {
  id: string;
  start_time: string;
  free: number;
  tour_type: string;
}

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const RegularCalendar: React.FC<Props> = ({ onNext, onBack }) => {
  const { booking, setBooking, t, lang } = useBooking();
  const [selectedDay, setSelectedDay] = useState<Date>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [availableDays, setAvailableDays] = useState<Record<string, number>>({});
  const [pricePerPerson, setPricePerPerson] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [participants, setParticipants] = useState(2);
  const [participantError, setParticipantError] = useState("");
  const [attempted, setAttempted] = useState(false);

  const locale = lang === "fr" ? "fr-FR" : "en-US";

  // Fetch price on mount (use left-bank as default; both tours same price)
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch("/api/stripe-price?tour=left-bank");
        if (res.ok) {
          const data = await res.json();
          setPricePerPerson(data.unit_amount / 100);
        }
      } catch {
        setPricePerPerson(50);
      } finally {
        setPriceLoading(false);
      }
    };
    fetchPrice();
  }, []);

  // Fetch all available days (no tour filter)
  useEffect(() => {
    const fetchDays = async () => {
      try {
        const res = await fetch("/api/sessions?participants=1");
        if (!res.ok) return;
        const { availableDays: days } = await res.json();
        setAvailableDays(days || {});
      } catch (err) {
        console.error("Error fetching sessions:", err);
      }
    };
    fetchDays();
  }, []);

  // Fetch slots for selected day
  useEffect(() => {
    if (!selectedDay) return;
    const fetchSlots = async () => {
      try {
        const dateStr = selectedDay.toISOString().split("T")[0];
        const res = await fetch(`/api/sessions/${dateStr}?participants=1`);
        if (!res.ok) return;
        const { slots: fetched } = await res.json();
        setSlots(fetched || []);
      } catch (err) {
        console.error("Error fetching slots:", err);
      }
    };
    fetchSlots();
    setSelectedSlot(null);
    setParticipantError("");
  }, [selectedDay]);

  const selectSlot = (slot: Slot) => {
    setSelectedSlot(slot);
    setParticipantError("");
    // Check participants fit
    if (participants > slot.free) {
      setParticipantError(
        t.regularCalendar?.tooManyParticipants ||
          `Only ${slot.free} spots available for this session.`
      );
    }
  };

  const changeParticipants = (delta: number) => {
    const next = participants + delta;
    if (next < 1 || next > 10) return;
    setParticipants(next);
    setParticipantError("");
    if (selectedSlot && next > selectedSlot.free) {
      setParticipantError(
        t.regularCalendar?.tooManyParticipants ||
          `Only ${selectedSlot.free} spots available for this session.`
      );
    }
  };

  const isValid = selectedSlot && participants >= 1 && participants <= (selectedSlot?.free ?? 0);

  const handleNext = () => {
    setAttempted(true);
    if (!isValid || !selectedSlot) return;

    const date = new Date(selectedSlot.start_time).toISOString().split("T")[0];
    const time = new Date(selectedSlot.start_time)
      .toTimeString()
      .split(" ")[0]
      .substring(0, 5);

    setBooking({
      ...booking,
      tour: selectedSlot.tour_type as "left-bank" | "right-bank" | "general-history",
      tourType: "regular",
      sessionId: selectedSlot.id,
      date,
      time,
      participants,
      price: pricePerPerson * participants,
    });
    onNext();
  };

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: lang !== "fr",
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

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
      <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">
        {t.regularCalendar?.title || "Choose a session"}
      </h3>
      <p className="text-sm text-gray-500 text-center mb-6">
        {t.regularCalendar?.subtitle || "Select a date to see available tours"}
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
                {t.regularCalendar?.highlightedDates || "Highlighted dates have available sessions."}
              </p>
            }
          />
        </div>

        {/* Slots */}
        <div>
          {selectedDay && (
            <div>
              <h4 className="font-bold text-gray-800 mb-4 text-center md:text-left">
                {selectedDay.toLocaleDateString(locale, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h4>
              {slots.length > 0 ? (
                <div className="space-y-3">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    const tourName = getTourName(slot.tour_type, lang);
                    const tourStops = getTourStops(slot.tour_type, lang);
                    const spotsClass =
                      slot.free > 5
                        ? "text-green-600 font-semibold"
                        : slot.free <= 3
                        ? "text-orange-500 font-semibold"
                        : "text-gray-500";

                    const tourThumb = tourInfo[slot.tour_type]?.thumb;

                    return (
                      <button
                        key={slot.id}
                        onClick={() => selectSlot(slot)}
                        className={`w-full border-2 rounded-xl text-left transition-all duration-200 overflow-hidden ${
                          isSelected
                            ? "border-blue-600 bg-blue-50 shadow-md shadow-blue-100"
                            : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                        }`}
                        disabled={priceLoading}
                      >
                        <div className="flex items-stretch">
                          {tourThumb && (
                            <img
                              src={tourThumb}
                              alt={tourName}
                              width={120}
                              height={90}
                              loading="lazy"
                              decoding="async"
                              className="w-24 h-auto object-cover flex-shrink-0 hidden sm:block"
                            />
                          )}
                          <div className="flex justify-between items-start flex-1 p-4">
                          <div className="flex-1">
                            <div className="font-bold text-gray-800 text-lg">
                              {formatTime(slot.start_time)}
                            </div>
                            <div className="text-sm font-semibold text-gray-700 mt-0.5">
                              {tourName}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {tourStops}
                            </div>
                            <div className={`text-sm mt-1 ${spotsClass}`}>
                              {slot.free} {t.calendar.spotsAvailable}
                              {!priceLoading && (
                                <span className="text-gray-500 font-normal">
                                  {" "}
                                  · €{pricePerPerson} {t.calendar.perPerson}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="ml-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">
                    {t.calendar.noSessions} {t.calendar.onThisDate}
                  </p>
                </div>
              )}
            </div>
          )}
          {!selectedDay && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">{t.calendar.selectDate}</p>
            </div>
          )}
        </div>
      </div>

      {/* Selected session summary + participants */}
      {selectedSlot && (
        <div className="mt-6 p-5 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
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
            <span className="text-green-800 font-semibold">
              {t.calendar.sessionSelected}
            </span>
          </div>
          <p className="text-sm text-green-700 mb-1">
            {selectedDay?.toLocaleDateString(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}{" "}
            · {formatTime(selectedSlot.start_time)}
          </p>
          <p className="text-sm text-green-700 mb-4">
            {getTourName(selectedSlot.tour_type, lang)}
          </p>

          {/* Participants counter */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700">
                {t.step1Setup.participants}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => changeParticipants(-1)}
                  disabled={participants <= 1}
                  className="w-9 h-9 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-blue-600 hover:bg-blue-50 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20 12H4"
                    />
                  </svg>
                </button>
                <span className="text-2xl font-bold text-gray-800 w-8 text-center">
                  {participants}
                </span>
                <button
                  type="button"
                  onClick={() => changeParticipants(1)}
                  disabled={participants >= 10}
                  className="w-9 h-9 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-blue-600 hover:bg-blue-50 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-green-800">
                {t.calendar.total} €{pricePerPerson * participants}
              </div>
              <div className="text-xs text-gray-500">
                {participants} × €{pricePerPerson}
              </div>
            </div>
          </div>

          {participantError && (
            <p className="text-sm text-red-500 mt-2">{participantError}</p>
          )}
        </div>
      )}

      {/* Validation message */}
      {attempted && !isValid && (
        <p className="text-sm text-red-500 text-center mt-4">
          {t.validation.chooseSession}
        </p>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center gap-4 justify-center">
        <button
          onClick={onBack}
          className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          {t.back}
        </button>
        <button
          onClick={handleNext}
          className="px-8 py-3 rounded-lg font-semibold transition-all cursor-pointer bg-gray-800 text-white hover:bg-gray-700 shadow-md hover:shadow-lg text-base"
        >
          {t.next}
        </button>
      </div>
    </div>
  );
};

export default RegularCalendar;
