import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface CountryData {
  country: string;
  participants: number;
  flag: string;
  percentage: number;
  count?: number;
  code?: string;
}

const countryFlags: Record<string, string> = {
  'USA': '🇺🇸',
  'United States': '🇺🇸',
  'Germany': '🇩🇪',
  'UK': '🇬🇧',
  'United Kingdom': '🇬🇧',
  'Spain': '🇪🇸',
  'Canada': '🇨🇦',
  'France': '🇫🇷',
  'Italy': '🇮🇹',
  'Australia': '🇦🇺',
  'Netherlands': '🇳🇱',
  'Japan': '🇯🇵'
};

export default function CountriesChart() {
  const [countriesData, setCountriesData] = useState<CountryData[]>([]);
  const [animatedData, setAnimatedData] = useState<CountryData[]>([]);

  // Mapping des noms de pays français vers les codes ISO pour les drapeaux
  const getCountryCode = (countryName: string): string => {
    const codeMap: Record<string, string> = {
      'USA': 'US',
      'UK': 'GB',
      'États-Unis': 'US',
      'Etats-Unis': 'US',
      'France': 'FR',
      'Allemagne': 'DE',
      'Espagne': 'ES',
      'Italie': 'IT',
      'Canada': 'CA',
      'Australie': 'AU',
      'Japon': 'JP',
      'Chine': 'CN',
      'Brésil': 'BR',
      'Inde': 'IN',
      'Pays-Bas': 'NL',
      'Belgique': 'BE',
      'Suisse': 'CH',
      'Autriche': 'AT',
      'Suède': 'SE',
      'Norvège': 'NO',
      'Danemark': 'DK',
      'Finlande': 'FI',
      'Pologne': 'PL',
      'République tchèque': 'CZ',
      'Portugal': 'PT',
      'Grèce': 'GR',
      'Turquie': 'TR',
      'Russie': 'RU',
      'Mexique': 'MX',
      'Argentine': 'AR',
      'Chili': 'CL',
      'Colombie': 'CO',
      'Pérou': 'PE',
      'Venezuela': 'VE',
      'Afrique du Sud': 'ZA',
      'Égypte': 'EG',
      'Maroc': 'MA',
      'Nigeria': 'NG',
      'Kenya': 'KE',
      'Corée du Sud': 'KR',
      'Thaïlande': 'TH',
      'Vietnam': 'VN',
      'Singapour': 'SG',
      'Malaisie': 'MY',
      'Indonésie': 'ID',
      'Philippines': 'PH',
      'Nouvelle-Zélande': 'NZ',
      'Israël': 'IL',
      'Arabie saoudite': 'SA',
      'Émirats arabes unis': 'AE',
      'Iran': 'IR',
      'Irak': 'IQ',
      'Pakistan': 'PK',
      'Bangladesh': 'BD',
      'Sri Lanka': 'LK',
      'Irlande': 'IE',
      'Islande': 'IS',
      'Luxembourg': 'LU',
      'Malte': 'MT',
      'Chypre': 'CY',
      'Cameroun': 'CM',
      'Irlande du Nord': 'GB',
      'Hong Kong': 'HK',
      'Liban': 'LB',
      'Tunisie': 'TN'
    };
    return codeMap[countryName] || 'UN'; // UN pour drapeau générique
  };

  useEffect(() => {
    const fetchCountryData = async () => {
      try {
        const { data, error } = await supabase
          .from('data_participants_tour')
          .select('pays, taille_du_groupe');

        if (error) throw error;

        const countryCount = new Map<string, number>();
        data?.forEach(row => {
          const country = row.pays;
          const participants = row.taille_du_groupe ?? 1;
          if (country) {
            countryCount.set(
              country, 
              (countryCount.get(country) || 0) + participants
            );
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
          code: getCountryCode(country)
        }));

        setCountriesData(chartData);
        setAnimatedData(chartData.map(item => ({ ...item, participants: 0 })));
      } catch (error) {
        console.error('Error fetching countries data:', error);
      }
    };

    fetchCountryData();
  }, []);

  const maxParticipants = Math.max(...countriesData.map(item => item.participants));

  useEffect(() => {
    const animateBar = (index: number, targetValue: number) => {
      const duration = 1500;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = Math.floor(progress * targetValue);
        
        setAnimatedData(prev => 
          prev.map((item, i) => 
            i === index ? { ...item, participants: currentValue } : item
          )
        );
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    };

    countriesData.forEach((item, index) => {
      setTimeout(() => {
        animateBar(index, item.participants);
      }, index * 200);
    });
  }, [countriesData]);

  return (
    <div className="space-y-4">
      {animatedData.map((item, index) => (
        <div key={item.country} className="flex items-center gap-4">
          {/* Flag */}
          <div className="flex-shrink-0 w-8 h-6 rounded overflow-hidden border border-gray-200">
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
                  parent.className = 'flex-shrink-0 w-8 h-6 flex items-center justify-center text-lg border border-gray-200 rounded';
                }
              }}
            />
          </div>
          
          {/* Country name */}
          <div className="flex-shrink-0 w-20 text-sm font-medium text-gray-700">
            {item.country}
          </div>
          
          {/* Progress bar */}
          <div className="flex-1 bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${item.percentage}%` }}
            />
          </div>
          
          {/* Count à droite */}
          <div className="flex-shrink-0 w-8 text-sm font-bold text-gray-900 text-right">
            {item.count}
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper function for flag emoji fallback
function getFlagEmoji(countryCode: string): string {
  const flagMap: Record<string, string> = {
    'US': '🇺🇸', 'FR': '🇫🇷', 'GB': '🇬🇧', 'DE': '🇩🇪', 'ES': '🇪🇸',
    'IT': '🇮🇹', 'CA': '🇨🇦', 'AU': '🇦🇺', 'JP': '🇯🇵', 'CN': '🇨🇳',
    'BR': '🇧🇷', 'IN': '🇮🇳', 'NL': '🇳🇱', 'BE': '🇧🇪', 'CH': '🇨🇭',
    'PT': '🇵🇹', 'PK': '🇵🇰', 'IL': '🇮🇱', 'PH': '🇵🇭', 'VE': '🇻🇪'
  };
  return flagMap[countryCode] || '🌍';
}
