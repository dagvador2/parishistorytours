import React, { useState, useEffect } from "react";
import { useBooking } from "../BookingContext";
import type { Tour, TourType } from "../types";

// Use pre-generated 640px thumbnails instead of full 2000px source images
const pantheonThumbSrc = "/photos/thumbnails/pantheon_thumb.webp";
const vendomeThumbSrc = "/photos/thumbnails/vendome_thumb.webp";

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
    { id: "left-bank", label: t.leftBank, desc: t.leftBankDesc, img: pantheonThumbSrc },
    { id: "right-bank", label: t.rightBank, desc: t.rightBankDesc, img: vendomeThumbSrc },
  ];

  const tourTypes: { id: TourType; title: string; subtitle: string; icon: string }[] = [
    {
      id: "regular",
      title: t.regularTour,
      subtitle: pricePerPerson
        ? `€${pricePerPerson}/${t.person} · ${t.step1Setup.groupMax}`
        : t.regularTourDesc,
      icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z",
    },
    {
      id: "private",
      title: t.privateTour,
      subtitle: t.step1Setup.privateSubtitle,
      icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    },
  ];

  return (
    <div className="space-y-2">
      {/* — Section 1: Tour selection — */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-800 mb-5">
          {t.step1Setup.chooseTour}
        </h3>
        <div className="flex flex-col md:flex-row gap-5 justify-center items-center">
          {tours.map(({ id, label, desc, img }) => {
            const isSelected = booking.tour === id;
            return (
              <div
                key={id}
                className={`w-full md:w-1/2 max-w-xs cursor-pointer transition-all duration-300 transform hover:scale-[1.03]
                  ${!isSelected && booking.tour ? "opacity-40 scale-[0.97]" : "opacity-100"}`}
                onClick={() => chooseTour(id)}
              >
                <div
                  className={`relative rounded-xl overflow-hidden shadow-lg ${
                    isSelected ? "ring-4 ring-blue-600 shadow-blue-200/50" : "ring-1 ring-gray-200"
                  }`}
                >
                  <img
                    src={img}
                    alt={label}
                    width={640}
                    height={427}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-40 object-cover"
                  />
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center transition-colors
                      ${isSelected ? "bg-black/40" : "bg-black/25 hover:bg-black/35"}`}
                  >
                    <span className="text-white text-2xl font-bold tracking-wide drop-shadow-lg">
                      {label}
                    </span>
                    <span className="text-white/90 text-sm mt-1 drop-shadow">{desc}</span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 py-2">
        <div className="flex-1 h-px bg-gray-200" />
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* — Section 2: Participants counter — */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          {t.step1Setup.participants}
        </h3>
        <div className="flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={decrement}
            disabled={booking.participants <= 1}
            className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-600 transition-all disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:bg-transparent"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
          <div className="w-16 text-center">
            <span className="text-4xl font-bold text-gray-800">
              {booking.participants}
            </span>
          </div>
          <button
            type="button"
            onClick={increment}
            disabled={booking.participants >= 10}
            className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-600 transition-all disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:bg-transparent"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {booking.participants} {booking.participants === 1 ? t.person : t.people}
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 py-2">
        <div className="flex-1 h-px bg-gray-200" />
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* — Section 3: Tour type — */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-800 mb-5">
          {t.step1Setup.tourType}
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch max-w-lg mx-auto">
          {tourTypes.map(({ id, title, subtitle, icon }) => {
            const isSelected = booking.tourType === id;
            return (
              <button
                key={id}
                className={`flex-1 cursor-pointer transition-all duration-200 p-5 border-2 rounded-xl text-center ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 shadow-md shadow-blue-100"
                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                }`}
                onClick={() => chooseType(id)}
              >
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${
                    isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                  </div>
                  <h4 className={`text-base font-bold mb-1 ${isSelected ? "text-blue-700" : "text-gray-800"}`}>
                    {title}
                  </h4>
                  <p className={`text-sm ${isSelected ? "text-blue-600" : "text-gray-500"}`}>
                    {subtitle}
                  </p>
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
