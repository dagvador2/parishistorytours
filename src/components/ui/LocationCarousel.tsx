/**
 * LocationCarousel — Infinite sliding carousel for Paris tour locations.
 * Uses a clone-based approach: clones are prepended/appended so the track
 * never swaps DOM elements mid-animation, eliminating all blink/flash.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

interface LocationCard {
  imgUrl: string;
  title: string;
  subtitle: string;
  description: string;
  tag: string;
}

interface LocationCarouselProps {
  cards: LocationCard[];
  cardsPerView?: number;
  autoPlayMs?: number;
  height?: string;
}

export default function LocationCarousel({
  cards,
  cardsPerView = 3,
  autoPlayMs = 4000,
  height = '30rem',
}: LocationCarouselProps) {
  const total = cards.length;
  if (total === 0) return null;

  // Clone buffer: [last N cards] + [all cards] + [first N cards]
  // This allows seamless infinite scrolling in both directions.
  const buffer = cardsPerView;
  const extended = [
    ...cards.slice(-buffer),
    ...cards,
    ...cards.slice(0, buffer),
  ];

  // `pos` is the logical index into the real cards (0..total-1).
  // The track offset accounts for the prepended clones.
  const [pos, setPos] = useState(0);
  const [animated, setAnimated] = useState(true);
  const [hovered, setHovered] = useState(false);
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pct = 100 / cardsPerView;
  const trackOffset = (pos + buffer) * pct;

  const slide = useCallback((next: number) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setAnimated(true);
    setPos(next);
  }, []);

  const goNext = useCallback(() => slide(pos + 1), [pos, slide]);
  const goPrev = useCallback(() => slide(pos - 1), [pos, slide]);

  // After the CSS transition ends, snap back to the real zone if needed
  const handleTransitionEnd = useCallback(() => {
    if (pos >= total) {
      setAnimated(false);
      setPos(pos - total);
    } else if (pos < 0) {
      setAnimated(false);
      setPos(pos + total);
    }
    // Unlock after a frame so the snap (if any) has painted
    requestAnimationFrame(() => {
      lockRef.current = false;
    });
  }, [pos, total]);

  // Auto-play
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoPlayMs > 0 && total > cardsPerView) {
      timerRef.current = setInterval(() => {
        setPos(p => {
          if (lockRef.current) return p;
          lockRef.current = true;
          setAnimated(true);
          return p + 1;
        });
      }, autoPlayMs);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoPlayMs, total, cardsPerView]);

  const resetAutoPlay = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoPlayMs > 0 && total > cardsPerView) {
      timerRef.current = setInterval(() => {
        setPos(p => {
          if (lockRef.current) return p;
          lockRef.current = true;
          setAnimated(true);
          return p + 1;
        });
      }, autoPlayMs);
    }
  };

  // Map pos to a real 0..total-1 index for dot indicators
  const realIndex = ((pos % total) + total) % total;

  return (
    <div
      className="relative w-full"
      style={{ height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Overflow clip */}
      <div className="overflow-hidden h-full rounded-2xl">
        {/* Sliding track — all cards always in DOM, no swapping */}
        <div
          className="flex h-full will-change-transform"
          style={{
            transform: `translateX(-${trackOffset}%)`,
            transition: animated
              ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)'
              : 'none',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extended.map((card, idx) => (
            <div
              key={idx}
              className="px-1.5 first:pl-0 last:pr-0 h-full shrink-0"
              style={{ width: `${pct}%` }}
            >
              <div className="relative overflow-hidden rounded-2xl shadow-xl h-full group cursor-pointer ring-1 ring-black/5">
                <img
                  src={card.imgUrl}
                  alt={card.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />

                {/* Permanent bottom gradient + title */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-4 transition-transform duration-300 group-hover:-translate-y-2">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1">
                    {card.tag}
                  </span>
                  <h3 className="text-white font-bold text-base md:text-lg leading-tight">{card.title}</h3>
                  <p className="text-white/70 text-xs mt-0.5">{card.subtitle}</p>
                </div>

                {/* Hover overlay — slides up */}
                <div className="absolute inset-0 bg-black/85 text-white p-5 transition-transform duration-500 transform translate-y-full group-hover:translate-y-0 overflow-y-auto flex flex-col justify-center">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-3">
                    {card.tag}
                  </span>
                  <h3 className="font-bold text-lg mb-3 leading-tight">{card.title}</h3>
                  <p className="text-sm text-white/80 leading-relaxed">{card.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nav arrows — visible on hover */}
      {total > cardsPerView && (
        <>
          <button
            onClick={() => { goPrev(); resetAutoPlay(); }}
            aria-label="Previous"
            className={`absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-white/15 hover:bg-white/35 backdrop-blur-sm rounded-full text-white transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => { goNext(); resetAutoPlay(); }}
            aria-label="Next"
            className={`absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-white/15 hover:bg-white/35 backdrop-blur-sm rounded-full text-white transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              if (!lockRef.current) {
                slide(i);
                resetAutoPlay();
              }
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === realIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
