import React, { useState } from "react";
import { useBooking } from "../BookingContext";

interface StepWrapperProps {
  children: React.ReactNode;
  nextLabel?: string;
  showBack?: boolean;
  onNext?: () => void;
  onBack?: () => void;
  isTransitioning?: boolean;
  validationKey?: string;
  validationMessage?: string;
}

const StepWrapper: React.FC<StepWrapperProps> = ({
  children,
  nextLabel = "Continue",
  showBack = true,
  onNext,
  onBack,
  isTransitioning = false,
  validationKey,
  validationMessage
}) => {
  const { booking, t } = useBooking();
  const [attempted, setAttempted] = useState(false);

  const isStepValid = () => {
    if (!validationKey) return true;

    switch (validationKey) {
      case "tour":
        return !!booking.tour;
      case "participants":
        return booking.participants && booking.participants > 0;
      case "tourType":
        return !!booking.tourType;
      case "tourSetup":
        return !!booking.tour && booking.participants > 0 && !!booking.tourType;
      case "dateTime":
        if (booking.tourType === "regular") {
          return booking.sessionId && booking.sessionId !== "";
        } else {
          return booking.date && booking.time && booking.date !== "" && booking.time !== "";
        }
      case "contact":
        return booking.name && booking.email && booking.name !== "" && booking.email !== "";
      default:
        return true;
    }
  };

  const handleNext = () => {
    setAttempted(true);
    if (isStepValid()) {
      onNext && onNext();
    }
  };

  return (
    <div className={`transition-all duration-300 ease-in-out ${
      isTransitioning ? "opacity-0 transform translate-x-4" : "opacity-100 transform translate-x-0"
    }`}>
      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100">
        {children}

        <div className="mt-8 flex flex-col items-center gap-3">
          {/* Validation error */}
          {attempted && !isStepValid() && validationMessage && (
            <span className="text-sm text-red-500 text-center">
              {validationMessage}
            </span>
          )}

          {/* Buttons row */}
          <div className="flex items-center gap-4 w-full justify-center">
            {showBack && onBack && (
              <button
                onClick={onBack}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                {t.back}
              </button>
            )}

            {onNext && (
              <button
                onClick={handleNext}
                className="px-8 py-3 rounded-lg font-semibold transition-all cursor-pointer bg-gray-800 text-white hover:bg-gray-700 shadow-md hover:shadow-lg text-base"
              >
                {nextLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepWrapper;
