import React, { useState, useEffect } from "react";
import { BookingProvider, useBooking } from "./BookingContext";
import ModeSelector from "./steps/ModeSelector";
import RegularCalendar from "./steps/RegularCalendar";
import RegularCheckout from "./steps/RegularCheckout";
import PrivateSetup from "./steps/PrivateSetup";
import PrivateCheckout from "./steps/PrivateCheckout";

type Mode = "choose" | "regular" | "private";

const Wizard: React.FC = () => {
  const { booking, setBooking, t } = useBooking();
  const [mode, setMode] = useState<Mode>("choose");
  const [step, setStep] = useState(1);

  // Read ?tour= from URL — pre-select tour for private path
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tourParam = params.get("tour");
    if (
      tourParam &&
      ["left-bank", "right-bank", "general-history"].includes(tourParam) &&
      !booking.tour
    ) {
      setBooking({
        ...booking,
        tour: tourParam as "left-bank" | "right-bank" | "general-history",
      });
    }
  }, []);

  const goToMode = (m: Mode) => {
    setMode(m);
    setStep(1);
  };

  const renderContent = () => {
    if (mode === "choose") {
      return (
        <ModeSelector
          onSelectRegular={() => goToMode("regular")}
          onSelectPrivate={() => goToMode("private")}
        />
      );
    }

    if (mode === "regular") {
      switch (step) {
        case 1:
          return (
            <RegularCalendar
              onNext={() => setStep(2)}
              onBack={() => goToMode("choose")}
            />
          );
        case 2:
          return (
            <RegularCheckout
              onBack={() => setStep(1)}
              onRestart={() => goToMode("choose")}
            />
          );
        default:
          return null;
      }
    }

    if (mode === "private") {
      switch (step) {
        case 1:
          return (
            <PrivateSetup
              onNext={() => setStep(2)}
              onBack={() => goToMode("choose")}
            />
          );
        case 2:
          return (
            <PrivateCheckout
              onBack={() => setStep(1)}
              onRestart={() => goToMode("choose")}
            />
          );
        default:
          return null;
      }
    }

    return null;
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800">
        {t.title}
      </h2>
      <p className="text-center text-gray-600 mb-12 text-lg">
        {t.subtitle}
      </p>

      <div className="min-h-[400px]">{renderContent()}</div>
    </div>
  );
};

interface BookingWizardProps {
  translations: Record<string, any>;
  lang: string;
  defaultTour?: string;
}

const BookingWizard: React.FC<BookingWizardProps> = ({
  translations,
  lang,
  defaultTour,
}) => {
  return (
    <BookingProvider translations={translations} lang={lang} defaultTour={defaultTour}>
      <Wizard />
    </BookingProvider>
  );
};

export default BookingWizard;
