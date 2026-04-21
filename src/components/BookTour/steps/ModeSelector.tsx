import React, { useState, useEffect } from "react";
import { useBooking } from "../BookingContext";

interface Props {
  onSelectRegular: () => void;
  onSelectPrivate: () => void;
}

const ModeSelector: React.FC<Props> = ({ onSelectRegular, onSelectPrivate }) => {
  const { t } = useBooking();
  const [pricePerPerson, setPricePerPerson] = useState<number | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch("/api/stripe-price?tour=left-bank");
        if (res.ok) {
          const data = await res.json();
          setPricePerPerson(data.unit_amount / 100);
        }
      } catch {
        setPricePerPerson(null);
      }
    };
    fetchPrice();
  }, []);

  const cards = [
    {
      key: "regular",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
      title: t.modeSelector?.joinTour || "Join a scheduled tour",
      description: t.modeSelector?.joinDesc || "See upcoming dates & book your spot. Small group, max 10 people.",
      price: pricePerPerson
        ? `${t.modeSelector?.from || "From"} €${pricePerPerson}/${t.person}`
        : null,
      onClick: onSelectRegular,
    },
    {
      key: "private",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: t.modeSelector?.privateTour || "Book a private tour",
      description: t.modeSelector?.privateDesc || "Choose your tour, date & group size. Exclusive experience.",
      price: t.modeSelector?.customPricing || "Custom pricing",
      onClick: onSelectPrivate,
    },
  ];

  return (
    <div className="bg-transparent p-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {cards.map((card) => (
          <button
            key={card.key}
            onClick={card.onClick}
            className="group p-8 border border-[var(--border)] bg-[var(--paper-3)] rounded-sm text-left transition-colors duration-200 hover:border-[var(--ink)] focus:outline-none focus:border-[var(--ink)]"
            style={{ borderRadius: 2 }}
          >
            <div className="w-10 h-10 border border-[var(--border)] flex items-center justify-center mb-5 text-[var(--ink-2)] group-hover:border-[var(--ink)] group-hover:text-[var(--ink)] transition-colors" style={{ borderRadius: 2 }}>
              {card.icon}
            </div>
            <h3 className="text-xl mb-2 text-[var(--ink)]" style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}>{card.title}</h3>
            <p className="text-sm text-[var(--ink-2)] mb-5 leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>{card.description}</p>
            {card.price && (
              <span className="inline-block text-xs text-[var(--ink)] border-t border-[var(--border)] pt-3 tracking-wider uppercase" style={{ fontFamily: 'var(--font-sans)', letterSpacing: '0.1em', fontWeight: 500 }}>
                {card.price}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModeSelector;
