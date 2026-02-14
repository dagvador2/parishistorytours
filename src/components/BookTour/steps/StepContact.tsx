import React from "react";
import { useBooking } from "../BookingContext";

const StepContact: React.FC = () => {
  const { booking, setBooking, t } = useBooking();
  const name = booking.name || "";
  const email = booking.email || "";
  const phone = booking.phone || "";

  const updateName = (value: string) => {
    setBooking({ ...booking, name: value });
  };

  const updateEmail = (value: string) => {
    setBooking({ ...booking, email: value });
  };

  const updatePhone = (value: string) => {
    setBooking({ ...booking, phone: value });
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-6">
        {t.step5}
      </h3>

      <div className="space-y-6">
        <div>
          <label
            htmlFor="contact-name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t.contact.name}
          </label>
          <input
            type="text"
            id="contact-name"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-400 focus:outline-none"
            placeholder={t.contact.namePlaceholder}
            value={name}
            onChange={(e) => updateName(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="contact-email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t.contact.email}
          </label>
          <input
            type="email"
            id="contact-email"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-400 focus:outline-none"
            placeholder={t.contact.emailPlaceholder}
            value={email}
            onChange={(e) => updateEmail(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="contact-phone"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {t.contact.phone}
          </label>
          <input
            type="tel"
            id="contact-phone"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-400 focus:outline-none"
            placeholder={t.contact.phonePlaceholder}
            value={phone}
            onChange={(e) => updatePhone(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default StepContact;
