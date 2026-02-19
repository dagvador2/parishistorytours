/**
 * KeyFiguresStats — Animated statistics cards for the Key Figures page.
 * Fetches real data from Supabase and displays with spring-based number animations
 * and framer-motion reveal transitions.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { supabase } from '../lib/supabase';

type StatColor = 'blue' | 'green' | 'purple' | 'orange';

type Stat = {
  id: string;
  label: string;
  value: number;
  suffix: string;
  color: StatColor;
};

const initialStats: Stat[] = [
  { id: 'participants', label: 'Total Participants', value: 0, suffix: '', color: 'blue' },
  { id: 'sessions', label: 'Tours Conducted', value: 0, suffix: '', color: 'green' },
  { id: 'kilometers', label: 'Kilometers Walked', value: 0, suffix: '', color: 'purple' },
  { id: 'countries', label: 'Countries Represented', value: 0, suffix: '', color: 'orange' },
];

// SVG icons instead of emojis for a professional look
const StatIcon = ({ id }: { id: string }) => {
  const icons: Record<string, JSX.Element> = {
    participants: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    sessions: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    kilometers: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
    countries: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  };
  return icons[id] || null;
};

// Spring-animated number ticker
function NumberTicker({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const isInView = useInView(ref, { once: true, margin: '0px' });

  useEffect(() => {
    if (isInView && value > 0) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  useEffect(() => {
    return springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = Math.floor(latest).toLocaleString('en-US');
      }
    });
  }, [springValue]);

  return <span ref={ref} className="tabular-nums">0</span>;
}

const colorConfig: Record<StatColor, { bg: string; text: string; border: string; glow: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', glow: 'shadow-blue-100/50' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', glow: 'shadow-emerald-100/50' },
  purple: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', glow: 'shadow-violet-100/50' },
  orange: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', glow: 'shadow-amber-100/50' },
};

export default function KeyFiguresStats() {
  const [realStats, setRealStats] = useState(initialStats);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from('data_participants_tour')
          .select('*');

        if (error) throw error;
        if (!data || data.length === 0) return;

        const sessionSet = new Set<number>();
        let totalParticipants = 0;
        const countryMap = new Map<string, number>();

        data.forEach(row => {
          if (row.id_session) sessionSet.add(row.id_session);
          const participantCount = Number(row.taille_du_groupe) || 0;
          totalParticipants += participantCount;

          const country = row.pays;
          if (country) {
            const key = String(country).trim();
            countryMap.set(key, (countryMap.get(key) || 0) + participantCount);
          }
        });

        const sessionsCount = sessionSet.size;
        const distanceKm = Math.round(sessionsCount * 2.5);
        const uniqueCountries = countryMap.size;

        setRealStats([
          { ...initialStats[0], value: totalParticipants },
          { ...initialStats[1], value: sessionsCount },
          { ...initialStats[2], value: distanceKm },
          { ...initialStats[3], value: uniqueCountries },
        ]);
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {realStats.map((stat, index) => {
        const colors = colorConfig[stat.color];
        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`relative overflow-hidden bg-white rounded-2xl border ${colors.border} p-5 md:p-6 text-center shadow-lg ${colors.glow} hover:shadow-xl transition-shadow duration-300`}
          >
            {/* Decorative gradient accent */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
              stat.color === 'blue' ? 'from-blue-400 to-blue-600' :
              stat.color === 'green' ? 'from-emerald-400 to-emerald-600' :
              stat.color === 'purple' ? 'from-violet-400 to-violet-600' :
              'from-amber-400 to-amber-600'
            }`} />

            <div className={`w-14 h-14 mx-auto mb-4 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center`}>
              <StatIcon id={stat.id} />
            </div>

            <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
              <NumberTicker value={stat.value} />
            </div>

            <div className="text-sm md:text-base text-gray-500 font-medium">
              {stat.label}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
