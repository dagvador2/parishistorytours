import React from "react";
import { useBooking } from "../BookingContext";
import type { Tour } from "../types";

import pantheonThumb from "../../../images/pantheon_de_Paris.webp";
import vendomeThumb from "../../../images/place_vendome_paris.webp";

const StepTourSelection: React.FC = () => {
  const { booking, setBooking, t } = useBooking();
  const choose = (tour: Tour) => setBooking({ ...booking, tour });

  const tours: { id: Tour; label: string; desc: string; img: string }[] = [
    { id: "left-bank", label: t.leftBank, desc: t.leftBankDesc, img: pantheonThumb.src },
    { id: "right-bank", label: t.rightBank, desc: t.rightBankDesc, img: vendomeThumb.src },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
        {tours.map(({ id, label, desc, img }) => {
          const isSelected = booking.tour === id;

          return (
            <div
              key={id}
              className={`tour-option w-full md:w-1/2 max-w-sm cursor-pointer
                transition-all duration-300 transform hover:scale-105
                ${!isSelected && booking.tour ? "opacity-50" : "opacity-100"}`}
              onClick={() => choose(id)}
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
                  className="w-full h-48 object-cover"
                />
                <div
                  className={`absolute inset-0 flex items-center justify-center
                    ${isSelected ? "bg-black/30" : "bg-black/20"}`}
                >
                  <span className="text-white text-2xl font-bold tracking-wider drop-shadow-lg">
                    {label}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-center">
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepTourSelection;
