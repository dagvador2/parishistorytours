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
      <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        {children}

        <div className="mt-8 flex justify-between items-center">
          <div>
            {showBack && onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition-colors text-sm md:text-base"
              >
                {t.back}
              </button>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Afficher le message d'erreur uniquement après une tentative */}
            {attempted && !isStepValid() && validationMessage && (
              <span className="text-sm text-red-500 text-right">
                {validationMessage}
              </span>
            )}
            
            <div>
              {onNext && (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 rounded-md font-medium transition-colors cursor-pointer bg-blue-600 text-white hover:bg-blue-700 text-sm md:text-base"
                >
                  {nextLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepWrapper;
