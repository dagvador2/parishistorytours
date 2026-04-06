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
      <p className="text-center text-gray-600 mb-4 text-lg">
        {t.subtitle}
      </p>

      {/* WhatsApp CTA */}
      <div className="text-center mb-10">
        <a
          href="https://wa.me/+33620622480"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors text-sm border border-gray-200 rounded-full px-5 py-2.5 hover:border-gray-400 hover:shadow-sm"
        >
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.89 3.488" />
          </svg>
          {t.whatsappCta || "Or contact me directly on WhatsApp"}
        </a>
      </div>

      <div className="min-h-[400px]">{renderContent()}</div>

      {/* Platform booking links */}
      {mode === "choose" && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">{t.alsoBookOn || "Also book on"}</p>
          <div className="flex items-center justify-center gap-8">
            <a
              href="https://www.getyourguide.com/paris-l16/world-war-ii-tour-in-paris-fall-resistance-liberation-t537162/"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img src="/logos/get your guide logo.webp" alt="GetYourGuide" className="w-36 object-contain" />
            </a>
            <a
              href="https://www.viator.com/tours/Paris/World-War-II-Tour-in-Paris-Fall-Resistance-and-Liberation/d479-5642691P2"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img src="/logos/Viator_Logo.png" alt="Viator" className="w-36 object-contain" />
            </a>
            <a
              href="https://www.tripadvisor.fr/Attraction_Review-g187147-d34229671-Reviews-Paris_History_Tours-Paris_Ile_de_France.html"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img src="/logos/Tripadvisor-Logo.png" alt="TripAdvisor" className="w-36 object-contain" />
            </a>
            <a
              href="https://tourist.com/p/24194"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img src="/logos/tourist_logo.svg" alt="Tourist.com" className="w-36 object-contain" />
            </a>
          </div>
        </div>
      )}
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
