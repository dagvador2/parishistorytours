import React from "react";
import { useBooking } from "../BookingContext";

interface ProgressIndicatorProps {
  currentStep: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep }) => {
  const { t } = useBooking();

  const steps = [
    { number: 1, label: t.progress.setup },
    { number: 2, label: t.progress.dateTime },
    { number: 3, label: t.progress.checkout },
  ];

  return (
    <div className="mt-8">
      <div className="flex items-center justify-center">
        {steps.map((stepItem, index) => (
          <React.Fragment key={stepItem.number}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200 ${
                  currentStep >= stepItem.number
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {currentStep > stepItem.number ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  stepItem.number
                )}
              </div>
              <span className={`text-xs mt-1 hidden sm:block ${
                currentStep >= stepItem.number ? "text-gray-800" : "text-gray-500"
              }`}>
                {stepItem.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-0.5 w-12 sm:w-20 mx-3 transition-colors duration-200 ${
                currentStep > stepItem.number ? "bg-gray-800" : "bg-gray-200"
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProgressIndicator;
