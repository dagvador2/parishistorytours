import React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useBooking } from "../BookingContext";

const Step2DatePrivate: React.FC = () => {
  const { booking, setBooking, t, lang } = useBooking();

  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const participantsLabel = booking.participants === 1 ? t.person : t.people;

  const today = new Date();
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);

  const selectedDay = booking.date ? new Date(booking.date + "T00:00:00") : undefined;

  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      const dateStr = day.toISOString().split("T")[0];
      setBooking({ ...booking, date: dateStr });
    }
  };

  const updateTime = (value: string) => {
    setBooking({ ...booking, time: value });
  };

  const updateMessage = (value: string) => {
    setBooking({ ...booking, message: value });
  };

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

  return (
    <div>
      <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">
        {t.step2Private.title}
      </h3>
      <p className="text-sm text-gray-500 text-center mb-6">
        {t.privateTour} · {booking.tour === "left-bank" ? t.leftBankTour : t.rightBankTour} · {booking.participants} {participantsLabel}
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Calendar */}
        <div className="flex flex-col items-center">
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

        {/* Time + Message */}
        <div className="space-y-5">
          <div>
            <label
              htmlFor="tour-time"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              {t.private.preferredTime}
            </label>
            <select
              id="tour-time"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 bg-white focus:border-blue-600 focus:outline-none text-gray-800 transition-colors"
              value={booking.time || ""}
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

          <div>
            <label
              htmlFor="private-message"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
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
    </div>
  );
};

export default Step2DatePrivate;
