import React, { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useBooking } from "../BookingContext";
import type { Tour } from "../types";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const PrivateSetup: React.FC<Props> = ({ onNext, onBack }) => {
  const { booking, setBooking, t, lang } = useBooking();
  const [attempted, setAttempted] = useState(false);

  const locale = lang === "fr" ? "fr-FR" : "en-US";

  const today = new Date();
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);

  const selectedDay = booking.date ? new Date(booking.date + "T00:00:00") : undefined;

  const chooseTour = (tour: Tour) => setBooking({ ...booking, tour });

  const increment = () => {
    if (booking.participants < 10) {
      setBooking({ ...booking, participants: booking.participants + 1 });
    }
  };

  const decrement = () => {
    if (booking.participants > 1) {
      setBooking({ ...booking, participants: booking.participants - 1 });
    }
  };

  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      setBooking({ ...booking, date: day.toISOString().split("T")[0] });
    }
  };

  const updateTime = (value: string) => setBooking({ ...booking, time: value });
  const updateMessage = (value: string) => setBooking({ ...booking, message: value });

  const timeOptions: string[] = [];
  for (let h = 9; h <= 18; h++) {
    timeOptions.push(`${h.toString().padStart(2, "0")}:00`);
    if (h < 18) {
      timeOptions.push(`${h.toString().padStart(2, "0")}:30`);
    }
  }

  const formatTimeLabel = (val: string) => {
    if (lang === "fr") return val;
    const [hourStr, minStr] = val.split(":");
    const hour = parseInt(hourStr);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minStr} ${ampm}`;
  };

  const isValid =
    booking.tour &&
    booking.participants > 0 &&
    booking.date &&
    booking.time;

  const handleNext = () => {
    setAttempted(true);
    if (isValid) {
      setBooking({ ...booking, tourType: "private" });
      onNext();
    }
  };

  const tourOptions: { id: Tour; label: string; desc: string }[] = [
    { id: "left-bank", label: t.leftBank, desc: t.leftBankDesc },
    { id: "right-bank", label: t.rightBank, desc: t.rightBankDesc },
    { id: "both", label: t.privateSetup?.both || "Both tours", desc: t.privateSetup?.bothDesc || "Left Bank + Right Bank" },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
      <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
        {t.privateSetup?.title || "Configure your private tour"}
      </h3>

      {/* Tour selection */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          {t.step1Setup.chooseTour}
        </h4>
        <div className="flex flex-col sm:flex-row gap-3">
          {tourOptions.map(({ id, label, desc }) => {
            const isSelected = booking.tour === id;
            return (
              <button
                key={id}
                onClick={() => chooseTour(id)}
                className={`flex-1 p-4 border-2 rounded-xl text-center transition-all duration-200 ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 shadow-md shadow-blue-100"
                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                }`}
              >
                <div className={`font-bold text-sm ${isSelected ? "text-blue-700" : "text-gray-800"}`}>
                  {label}
                </div>
                <p className={`text-xs mt-0.5 ${isSelected ? "text-blue-600" : "text-gray-500"}`}>
                  {desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Participants */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          {t.step1Setup.participants}
        </h4>
        <div className="flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={decrement}
            disabled={booking.participants <= 1}
            className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-blue-600 hover:bg-blue-50 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
          <span className="text-3xl font-bold text-gray-800 w-12 text-center">
            {booking.participants}
          </span>
          <button
            type="button"
            onClick={increment}
            disabled={booking.participants >= 10}
            className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-blue-600 hover:bg-blue-50 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1 text-center">
          {booking.participants} {booking.participants === 1 ? t.person : t.people}
        </p>
      </div>

      {/* Date & Time */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="flex flex-col items-center">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 self-start">
            {t.private.preferredDate}
          </h4>
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={handleDaySelect}
            weekStartsOn={1}
            disabled={[{ before: today }, { after: maxDate }]}
            footer={
              selectedDay && (
                <p className="mt-2 text-sm text-blue-700 text-center font-medium">
                  {selectedDay.toLocaleDateString(locale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )
            }
          />
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="private-time" className="block text-sm font-semibold text-gray-700 mb-2">
              {t.private.preferredTime}
            </label>
            <select
              id="private-time"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white focus:border-blue-600 focus:outline-none text-gray-800 transition-colors"
              value={booking.time || ""}
              onChange={(e) => updateTime(e.target.value)}
            >
              <option value="">{t.private.selectTime}</option>
              {timeOptions.map((val) => (
                <option key={val} value={val}>
                  {formatTimeLabel(val)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="private-message" className="block text-sm font-semibold text-gray-700 mb-2">
              {t.step2Private.messageLabel}
            </label>
            <textarea
              id="private-message"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-600 focus:outline-none resize-none text-gray-800 transition-colors"
              rows={4}
              placeholder={t.step2Private.messagePlaceholder}
              value={booking.message || ""}
              onChange={(e) => updateMessage(e.target.value)}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>{t.private.note}</strong> {t.private.noteText}
            </p>
          </div>
        </div>
      </div>

      {/* Validation */}
      {attempted && !isValid && (
        <p className="text-sm text-red-500 text-center mb-4">
          {t.privateSetup?.validation || "Please select a tour, date, and time."}
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-4 justify-center">
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

export default PrivateSetup;
