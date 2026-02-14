import React from "react";
import { useBooking } from "../BookingContext";

const StepParticipants: React.FC = () => {
  const { booking, setBooking, t } = useBooking();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setBooking({ ...booking, participants: val });
    }
  };

  return (
    <div>
      <select
        value={booking.participants || ""}
        onChange={handleChange}
        className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-gray-600 text-gray-700"
      >
        <option value="" disabled>
          {t.select}
        </option>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n} {n === 1 ? t.person : t.people}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StepParticipants;
