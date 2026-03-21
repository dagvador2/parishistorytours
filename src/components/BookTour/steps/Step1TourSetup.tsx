import React, { useState, useEffect } from "react";
import { useBooking } from "../BookingContext";
import type { Tour, TourType } from "../types";

import pantheonThumb from "../../../images/pantheon_de_Paris.webp";
import vendomeThumb from "../../../images/place_vendome_paris.webp";

const Step1TourSetup: React.FC = () => {
  const { booking, setBooking, t } = useBooking();
  const [pricePerPerson, setPricePerPerson] = useState<number | null>(null);

  const chooseTour = (tour: Tour) => setBooking({ ...booking, tour });
  const chooseType = (tourType: TourType) => setBooking({ ...booking, tourType });

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

  // Fetch price when tour is selected
  useEffect(() => {
    if (!booking.tour) return;
    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/stripe-price?tour=${booking.tour}`);
        if (res.ok) {
          const data = await res.json();
          setPricePerPerson(data.unit_amount / 100);
        }
      } catch {
        setPricePerPerson(null);
      }
    };
    fetchPrice();
  }, [booking.tour]);

  const tours: { id: Tour; label: string; desc: string; img: string }[] = [
    { id: "left-bank", label: t.leftBank, desc: t.leftBankDesc, img: pantheonThumb.src },
    { id: "right-bank", label: t.rightBank, desc: t.rightBankDesc, img: vendomeThumb.src },
  ];

  const tourTypes: { id: TourType; title: string; subtitle: string }[] = [
    {
      id: "regular",
      title: t.regularTour,
      subtitle: pricePerPerson
        ? `€${pricePerPerson}/${t.person} · ${t.step1Setup.groupMax}`
        : t.regularTourDesc,
    },
    {
      id: "private",
      title: t.privateTour,
      subtitle: t.step1Setup.privateSubtitle,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Tour selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {t.step1Setup.chooseTour}
        </h3>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          {tours.map(({ id, label, desc, img }) => {
            const isSelected = booking.tour === id;
            return (
              <div
                key={id}
                className={`w-full md:w-1/2 max-w-sm cursor-pointer transition-all duration-300 transform hover:scale-[1.02]
                  ${!isSelected && booking.tour ? "opacity-50" : "opacity-100"}`}
                onClick={() => chooseTour(id)}
              >
                <div
                  className={`relative rounded-lg overflow-hidden shadow-md ${
                    isSelected ? "ring-4 ring-gray-600" : ""
                  }`}
                >
                  <img
                    src={img}
                    alt={label}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-36 object-cover"
                  />
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center
                      ${isSelected ? "bg-black/35" : "bg-black/20"}`}
                  >
                    <span className="text-white text-xl font-bold tracking-wider drop-shadow-lg">
                      {label}
                    </span>
                    <span className="text-white/80 text-sm mt-1">{desc}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Participants counter */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {t.step1Setup.participants}
        </h3>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={decrement}
            disabled={booking.participants <= 1}
            className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
            </svg>
          </button>
          <span className="text-2xl font-bold text-gray-800 w-12 text-center">
            {booking.participants}
          </span>
          <button
            type="button"
            onClick={increment}
            disabled={booking.participants >= 10}
            className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">
          {booking.participants} {booking.participants === 1 ? t.person : t.people}
        </p>
      </div>

      {/* Tour type selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {t.step1Setup.tourType}
        </h3>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          {tourTypes.map(({ id, title, subtitle }) => {
            const isSelected = booking.tourType === id;
            return (
              <button
                key={id}
                className={`flex-1 max-w-sm cursor-pointer transition-all duration-200 p-4 border-2 rounded-lg text-left ${
                  isSelected
                    ? "border-gray-600 bg-gray-600 text-white"
                    : "border-gray-200 hover:border-blue-400 hover:bg-blue-50"
                }`}
                onClick={() => chooseType(id)}
              >
                <div>
                  <h4 className="text-lg font-semibold mb-1">{title}</h4>
                  <p className="text-sm opacity-80">{subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Step1TourSetup;
