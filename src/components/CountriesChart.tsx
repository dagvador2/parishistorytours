/**
 * CountriesChart — Horizontal bar chart showing the top 5 countries
 * represented among tour participants. Fetches data from Supabase,
 * with staggered framer-motion reveal and gradient progress bars.
 */
import { useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface CountryData {
  country: string;
  participants: number;
  flag: string;
  percentage: number;
  count?: number;
  code?: string;
}

const getCountryCode = (countryName: string): string => {
  const codeMap: Record<string, string> = {
    'USA': 'US', 'UK': 'GB', 'États-Unis': 'US', 'Etats-Unis': 'US',
    'France': 'FR', 'Allemagne': 'DE', 'Espagne': 'ES', 'Italie': 'IT',
    'Canada': 'CA', 'Australie': 'AU', 'Japon': 'JP', 'Chine': 'CN',
    'Brésil': 'BR', 'Inde': 'IN', 'Pays-Bas': 'NL', 'Belgique': 'BE',
    'Suisse': 'CH', 'Autriche': 'AT', 'Suède': 'SE', 'Norvège': 'NO',
    'Danemark': 'DK', 'Finlande': 'FI', 'Pologne': 'PL',
    'République tchèque': 'CZ', 'Portugal': 'PT', 'Grèce': 'GR',
    'Turquie': 'TR', 'Russie': 'RU', 'Mexique': 'MX', 'Argentine': 'AR',
    'Chili': 'CL', 'Colombie': 'CO', 'Pérou': 'PE', 'Venezuela': 'VE',
    'Afrique du Sud': 'ZA', 'Égypte': 'EG', 'Maroc': 'MA', 'Nigeria': 'NG',
    'Kenya': 'KE', 'Corée du Sud': 'KR', 'Thaïlande': 'TH', 'Vietnam': 'VN',
    'Singapour': 'SG', 'Malaisie': 'MY', 'Indonésie': 'ID',
    'Philippines': 'PH', 'Nouvelle-Zélande': 'NZ', 'Israël': 'IL',
    'Arabie saoudite': 'SA', 'Émirats arabes unis': 'AE', 'Iran': 'IR',
    'Irak': 'IQ', 'Pakistan': 'PK', 'Bangladesh': 'BD', 'Sri Lanka': 'LK',
    'Irlande': 'IE', 'Islande': 'IS', 'Luxembourg': 'LU', 'Malte': 'MT',
    'Chypre': 'CY', 'Cameroun': 'CM', 'Irlande du Nord': 'GB',
    'Hong Kong': 'HK', 'Liban': 'LB', 'Tunisie': 'TN',
  };
  return codeMap[countryName] || 'UN';
};

function getFlagEmoji(countryCode: string): string {
  const flagMap: Record<string, string> = {
    'US': '🇺🇸', 'FR': '🇫🇷', 'GB': '🇬🇧', 'DE': '🇩🇪', 'ES': '🇪🇸',
    'IT': '🇮🇹', 'CA': '🇨🇦', 'AU': '🇦🇺', 'JP': '🇯🇵', 'CN': '🇨🇳',
    'BR': '🇧🇷', 'IN': '🇮🇳', 'NL': '🇳🇱', 'BE': '🇧🇪', 'CH': '🇨🇭',
    'PT': '🇵🇹', 'PK': '🇵🇰', 'IL': '🇮🇱', 'PH': '🇵🇭', 'VE': '🇻🇪',
  };
  return flagMap[countryCode] || '🌍';
}

// Gradient colors for each rank
const barGradients = [
  'from-blue-500 to-blue-600',
  'from-blue-400 to-blue-500',
  'from-sky-400 to-blue-400',
  'from-sky-300 to-sky-400',
  'from-sky-200 to-sky-300',
];

export default function CountriesChart() {
  const [countriesData, setCountriesData] = useState<CountryData[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-50px' });

  useEffect(() => {
    const fetchCountryData = async () => {
      try {
        const res = await fetch('/api/participants-data');
        if (!res.ok) throw new Error('Failed to fetch participants data');
        const { data } = await res.json();

        const countryCount = new Map<string, number>();
        data?.forEach(row => {
          const country = row.pays;
          const participants = row.taille_du_groupe ?? 1;
          if (country) {
            countryCount.set(country, (countryCount.get(country) || 0) + participants);
          }
        });

        const sortedCountries = Array.from(countryCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        const maxCount = Math.max(...sortedCountries.map(([, count]) => count));

        const chartData = sortedCountries.map(([country, count]) => ({
          country,
          participants: count,
          flag: getFlagEmoji(getCountryCode(country)),
          count,
          percentage: (count / maxCount) * 100,
          code: getCountryCode(country),
        }));

        setCountriesData(chartData);
      } catch (error) {
        console.error('Error fetching countries data:', error);
      }
    };

    fetchCountryData();
  }, []);

  return (
    <div ref={containerRef} className="space-y-5">
      {countriesData.map((item, index) => (
        <motion.div
          key={item.country}
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          className="flex items-center gap-4"
        >
          {/* Rank number */}
          <div className="flex-shrink-0 w-7 text-sm font-bold text-gray-400">
            #{index + 1}
          </div>

          {/* Flag */}
          <div className="flex-shrink-0 w-9 h-7 rounded-md overflow-hidden border border-gray-200 shadow-sm">
            <img
              src={`https://flagsapi.com/${item.code}/flat/64.png`}
              alt={`${item.country} flag`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = getFlagEmoji(item.code ?? '');
                  parent.className = 'flex-shrink-0 w-9 h-7 flex items-center justify-center text-lg border border-gray-200 rounded-md';
                }
              }}
            />
          </div>

          {/* Country name */}
          <div className="flex-shrink-0 w-24 text-sm font-semibold text-gray-700 truncate">
            {item.country}
          </div>

          {/* Progress bar */}
          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${barGradients[index] || barGradients[4]}`}
              initial={{ width: 0 }}
              animate={isInView ? { width: `${item.percentage}%` } : { width: 0 }}
              transition={{ duration: 1, delay: 0.3 + index * 0.15, ease: 'easeOut' }}
            />
          </div>

          {/* Count */}
          <div className="flex-shrink-0 w-12 text-right">
            <span className="text-sm font-bold text-gray-900">{item.count}</span>
            <span className="text-xs text-gray-400 ml-0.5">pax</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
