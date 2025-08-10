import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type StatColor = 'blue' | 'green' | 'purple' | 'orange';

type Stat = {
  id: string;
  label: string;
  value: number;
  suffix: string;
  icon: string;
  color: StatColor;
};

const initialStats: Stat[] = [
  {
    id: 'participants',
    label: 'Total Participants',
    value: 0,
    suffix: '', // Enlever le +
    icon: '👥',
    color: 'blue'
  },
  {
    id: 'sessions',
    label: 'Tours Conducted',
    value: 0,
    suffix: '', // Enlever le +
    icon: '🚶',
    color: 'green'
  },
  {
    id: 'kilometers',
    label: 'Kilometers Walked',
    value: 0,
    suffix: '', // Enlever le +
    icon: '📍',
    color: 'purple'
  },
  {
    id: 'countries',
    label: 'Countries Represented',
    value: 0,
    suffix: '', // Enlever le +
    icon: '🌍',
    color: 'orange'
  }
];

export default function KeyFiguresStats() {
  const [realStats, setRealStats] = useState(initialStats);
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>(
    initialStats.reduce((acc, stat) => ({ ...acc, [stat.id]: 0 }), {} as Record<string, number>)
  );

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
          // Correction: utiliser directement taille_du_groupe sans fallback à 1
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

        const updatedStats = [
          { ...initialStats[0], value: totalParticipants },
          { ...initialStats[1], value: sessionsCount },
          { ...initialStats[2], value: distanceKm },
          { ...initialStats[3], value: uniqueCountries }
        ];
        setRealStats(updatedStats);
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const animateValue = (id: string, start: number, end: number, duration: number) => {
      const startTimestamp = Date.now();
      const step = () => {
        const now = Date.now();
        const progress = Math.min((now - startTimestamp) / duration, 1);
        const currentValue = Math.floor(progress * (end - start) + start);

        setAnimatedValues(prev => ({ ...prev, [id]: currentValue }));

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    };

    // Animate each stat value
    realStats.forEach((stat) => {
      animateValue(stat.id, 0, stat.value, 2000);
    });
  }, [realStats]);

  const getColorClasses = (color: 'blue' | 'green' | 'purple' | 'orange') => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
      {realStats.map((stat) => (
        <div
          key={stat.id}
          className="bg-white rounded-lg shadow-lg p-4 md:p-6 text-center transform hover:scale-105 transition-transform duration-300"
        >
          <div className={`w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 rounded-full flex items-center justify-center text-xl md:text-2xl ${getColorClasses(stat.color)}`}>
            {stat.icon}
          </div>
          <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">
            {animatedValues[stat.id]}{stat.suffix}
          </div>
          <div className="text-xs md:text-base text-gray-600 font-medium">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
