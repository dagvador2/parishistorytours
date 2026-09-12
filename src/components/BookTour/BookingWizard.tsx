import React, { useState, useEffect, useRef } from "react";
import { BookingProvider, useBooking } from "./BookingContext";
import UpcomingSessions from "./steps/UpcomingSessions";
import RegularCalendar from "./steps/RegularCalendar";
import RegularCheckout from "./steps/RegularCheckout";
import PrivateSetup from "./steps/PrivateSetup";
import PrivateCheckout from "./steps/PrivateCheckout";
import { track } from "../../scripts/track";
import type { SessionSlot, Tour } from "./types";

type Mode = "choose" | "regular" | "private";

const ALL_TOURS: Tour[] = ["left-bank", "right-bank", "general-history", "food-wine"];

interface WizardProps {
  /** Hide the wizard's own title / WhatsApp CTA / partner-logos row.
   *  Used when the surrounding section already provides those elements. */
  hideChrome?: boolean;
  /** Hide the inline "private tour" link under the date list — for pages that
   *  already give the private tour its own block. */
  hidePrivateLink?: boolean;
}

const Wizard: React.FC<WizardProps> = ({ hideChrome = false, hidePrivateLink = false }) => {
  const { booking, setBooking, t } = useBooking();
  const [mode, setMode] = useState<Mode>("choose");
  const [step, setStep] = useState(1);
  // Session picked from the "next dates" quick list — the calendar opens on it.
  const [preselectedSlot, setPreselectedSlot] = useState<SessionSlot | null>(null);

  // Latest booking in a ref so window-event handlers never see stale state.
  const bookingRef = useRef(booking);
  useEffect(() => {
    bookingRef.current = booking;
  });

  // Read ?tour= from URL — pre-select that tour (all four tours supported).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tourParam = params.get("tour") as Tour | null;
    if (tourParam && ALL_TOURS.includes(tourParam) && !bookingRef.current.tour) {
      setBooking({ ...bookingRef.current, tour: tourParam });
    }
  }, []);

  // Tour cards dispatch this when their "Reserve a Spot" CTA is clicked —
  // pre-select that tour so the wizard opens on its next available dates.
  useEffect(() => {
    const handler = (e: Event) => {
      const slug = (e as CustomEvent<string>).detail as Tour;
      if (!ALL_TOURS.includes(slug)) return;
      setBooking({ ...bookingRef.current, tour: slug });
      setPreselectedSlot(null);
      setMode("choose");
      setStep(1);
    };
    window.addEventListener("pht:select-tour", handler);
    return () => window.removeEventListener("pht:select-tour", handler);
  }, []);

  // The "Book your private tour" block outside the island dispatches this so
  // the wizard opens straight on the private form, with the tour pre-selected
  // when the caller names one.
  useEffect(() => {
    const handler = (e: Event) => {
      const slug = (e as CustomEvent<string | undefined>).detail as Tour | undefined;
      if (slug && ALL_TOURS.includes(slug)) {
        setBooking({ ...bookingRef.current, tour: slug });
      }
      track("select_mode", { mode: "private", source: "private_block" });
      setPreselectedSlot(null);
      setMode("private");
      setStep(1);
    };
    window.addEventListener("pht:private-tour", handler);
    return () => window.removeEventListener("pht:private-tour", handler);
  }, []);

  // Let the surrounding page follow along: the booking section swaps its own
  // headings so a private form never sits under a "scheduled walks" title.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("pht:booking-mode", { detail: mode }));
  }, [mode]);

  const goToMode = (m: Mode) => {
    if (m === "choose") setPreselectedSlot(null);
    setMode(m);
    setStep(1);
  };

  const handleSlotFromList = (slot: SessionSlot) => {
    setPreselectedSlot(slot);
    setMode("regular");
    setStep(1);
  };

  const renderContent = () => {
    if (mode === "choose") {
      return (
        <UpcomingSessions
          hidePrivateLink={hidePrivateLink}
          onSelectSlot={handleSlotFromList}
          onSeeCalendar={() => {
            track("select_mode", { mode: "calendar" });
            goToMode("regular");
          }}
          onSelectPrivate={() => {
            track("select_mode", { mode: "private" });
            goToMode("private");
          }}
        />
      );
    }

    if (mode === "regular") {
      switch (step) {
        case 1:
          return (
            <RegularCalendar
              initialSlot={preselectedSlot}
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
      {!hideChrome && (
        <>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-800">
            {t.title}
          </h2>
          <p className="text-center text-gray-600 mb-4 text-lg">
            {t.subtitle}
          </p>

          {/* WhatsApp CTA */}
          <div className="text-center mb-10">
            <a
              href="https://wa.me/33620622480"
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
        </>
      )}

      <div className="min-h-[400px]">{renderContent()}</div>

      {/* Platform booking links */}
      {!hideChrome && mode === "choose" && (
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
            <a
              href="https://parisjetaime.com/activite/Paris-history-tours-p4833"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img src="/logos/parisjetaime_logo.svg" alt="Paris je t'aime — Office du Tourisme" className="w-10 h-10 object-contain" />
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
  hideChrome?: boolean;
  hidePrivateLink?: boolean;
}

const BookingWizard: React.FC<BookingWizardProps> = ({
  translations,
  lang,
  defaultTour,
  hideChrome = false,
  hidePrivateLink = false,
}) => {
  return (
    <BookingProvider translations={translations} lang={lang} defaultTour={defaultTour}>
      <Wizard hideChrome={hideChrome} hidePrivateLink={hidePrivateLink} />
    </BookingProvider>
  );
};

export default BookingWizard;
