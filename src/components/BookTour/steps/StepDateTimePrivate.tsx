import React from "react";
import { useBooking } from "../BookingContext";

interface Props {
  active: boolean;
}

const StepDateTimePrivate: React.FC<Props> = ({ active }) => {
  const { booking, setBooking, t, lang } = useBooking();
  const date = booking.date || "";
  const time = booking.time || "";

  if (!active || booking.tourType !== "private") return null;

  const updateDate = (value: string) => {
    setBooking({ ...booking, date: value });
  };

  const updateTime = (value: string) => {
    setBooking({ ...booking, time: value });
  };

  const timeOptions = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
  ];

  const formatTimeLabel = (val: string) => {
    if (lang === "fr") return val;
    const hour = parseInt(val.split(":")[0]);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm}`;
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-6">
        {t.step4Private}
      </h3>

      <div className="space-y-6">
        <div>
          <label
            htmlFor="tour-date"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t.private.preferredDate}
          </label>
          <input
            type="date"
            id="tour-date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-400 focus:outline-none"
            min={new Date().toISOString().split("T")[0]}
            value={date}
            onChange={(e) => updateDate(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="tour-time"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t.private.preferredTime}
          </label>
          <select
            id="tour-time"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-blue-400 focus:outline-none"
            value={time}
            onChange={(e) => updateTime(e.target.value)}
          >
            <option value="">{t.private.selectTime}</option>
            {timeOptions.map((timeValue) => (
              <option key={timeValue} value={timeValue}>
                {formatTimeLabel(timeValue)}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <strong>{t.private.note}</strong> {t.private.noteText}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StepDateTimePrivate;
