import { useEffect, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { supabase } from '../lib/supabase';

interface CountryData {
  [countryCode: string]: number;
}

const geoUrl = "/data/world-110m.json";

// Mapping des noms de pays de Supabase vers les noms utilisés dans le fichier TopoJSON
const countryNameToTopoName: Record<string, string> = {
  'USA': 'United States of America',
  'UK': 'United Kingdom',
  'United Kingdom': 'United Kingdom', // Ajout pour être sûr
  'Royaume-Uni': 'United Kingdom', // Au cas où
  'Grande-Bretagne': 'United Kingdom', // Au cas où
  'France': 'France',
  'Allemagne': 'Germany',
  'Espagne': 'Spain',
  'Italie': 'Italy',
  'Canada': 'Canada',
  'Australie': 'Australia',
  'Japon': 'Japan',
  'Chine': 'China',
  'Brésil': 'Brazil',
  'Inde': 'India',
  'Pays Bas': 'Netherlands',
  'Belgique': 'Belgium',
  'Suisse': 'Switzerland',
  'Autriche': 'Austria',
  'Suède': 'Sweden',
  'Norvège': 'Norway',
  'Danemark': 'Denmark',
  'Finlande': 'Finland',
  'Pologne': 'Poland',
  'République tchèque': 'Czech Republic',
  'Portugal': 'Portugal',
  'Grèce': 'Greece',
  'Turquie': 'Turkey',
  'Russie': 'Russia',
  'Mexique': 'Mexico',
  'Argentine': 'Argentina',
  'Chili': 'Chile',
  'Colombie': 'Colombia',
  'Pérou': 'Peru',
  'Venezuela': 'Venezuela',
  'Afrique du Sud': 'South Africa',
  'Egypte': 'Egypt',
  'Maroc': 'Morocco',
  'Nigeria': 'Nigeria',
  'Kenya': 'Kenya',
  'Corée du Sud': 'South Korea',
  'Thailande': 'Thailand',
  'Vietnam': 'Vietnam',
  'Singapour': 'Singapore',
  'Malaisie': 'Malaysia',
  'Indonésie': 'Indonesia',
  'Philippines': 'Philippines',
  'Nouvelle Zélande': 'New Zealand',
  'Israel': 'Israel',
  'Arabie saoudite': 'Saudi Arabia',
  'Émirats arabes unis': 'United Arab Emirates',
  'Iran': 'Iran',
  'Irak': 'Iraq',
  'Pakistan': 'Pakistan',
  'Bangladesh': 'Bangladesh',
  'Sri Lanka': 'Sri Lanka',
  'Myanmar': 'Myanmar',
  'Cambodge': 'Cambodia',
  'Laos': 'Laos',
  'Mongolie': 'Mongolia',
  'Kazakhstan': 'Kazakhstan',
  'Ouzbékistan': 'Uzbekistan',
  'Turkménistan': 'Turkmenistan',
  'Kirghizistan': 'Kyrgyzstan',
  'Tadjikistan': 'Tajikistan',
  'Afghanistan': 'Afghanistan',
  'Ukraine': 'Ukraine',
  'Biélorussie': 'Belarus',
  'Lituanie': 'Lithuania',
  'Lettonie': 'Latvia',
  'Estonie': 'Estonia',
  'Moldavie': 'Moldova',
  'Roumanie': 'Romania',
  'Bulgarie': 'Bulgaria',
  'Serbie': 'Serbia',
  'Croatie': 'Croatia',
  'Bosnie-Herzégovine': 'Bosnia and Herzegovina',
  'Monténégro': 'Montenegro',
  'Albanie': 'Albania',
  'Macédoine du Nord': 'North Macedonia',
  'Slovenie': 'Slovenia',
  'Slovaquie': 'Slovakia',
  'Hongrie': 'Hungary',
  'Irlande': 'Ireland',
  'Islande': 'Iceland',
  'Luxembourg': 'Luxembourg',
  'Malte': 'Malta',
  'Chypre': 'Cyprus',
  'Cameroun': 'Cameroon',
  'Irlande du Nord': 'United Kingdom', // Partie du UK
  'Hong Kong': 'Hong Kong',
  'Liban': 'Lebanon',
  'Tunisie': 'Tunisia',
  'Azerbaidjan': 'Azerbaijan',
  'Costa Rica': 'Costa Rica',
  'Ecosse': 'Scotland',
  'Equateur' : 'Ecuador',
  'Taiwan' : 'Taiwan',
  'République Tchèque': 'Czech Republic',
  'Ireland' : 'Ireland'
};

export default function WorldMap() {
  const [countryData, setCountryData] = useState<CountryData>({});
  const [maxValue, setMaxValue] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string; country: string; flag: string; count: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

        // Convert to TopoJSON country names
        const countryNameMap: CountryData = {};
        let max = 0;
        
        countryCount.forEach((count, country) => {
          const topoName = countryNameToTopoName[country];
          if (topoName) {
            // Cumuler les valeurs au lieu de les écraser
            countryNameMap[topoName] = (countryNameMap[topoName] || 0) + count;
            max = Math.max(max, countryNameMap[topoName]);
          }
        });

        setCountryData(countryNameMap);
        setMaxValue(max);
      } catch (error) {
        console.error('Error fetching country data:', error);
      }
    };

    fetchCountryData();
  }, []);

  // Helper function to get country flag code for API
  const getCountryFlagCode = (countryName: string): string => {
    const flagCodeMap: Record<string, string> = {
      'United States of America': 'US',
      'United Kingdom': 'GB', 
      'France': 'FR',
      'Germany': 'DE',
      'Spain': 'ES',
      'Italy': 'IT',
      'Canada': 'CA',
      'Australia': 'AU',
      'Japan': 'JP',
      'China': 'CN',
      'Brazil': 'BR',
      'India': 'IN',
      'Netherlands': 'NL',
      'Belgium': 'BE',
      'Switzerland': 'CH',
      'Austria': 'AT',
      'Sweden': 'SE',
      'Norway': 'NO',
      'Denmark': 'DK',
      'Finland': 'FI',
      'Poland': 'PL',
      'Czech Republic': 'CZ',
      'Portugal': 'PT',
      'Greece': 'GR',
      'Turkey': 'TR',
      'Russia': 'RU',
      'Mexico': 'MX',
      'Argentina': 'AR',
      'Chile': 'CL',
      'Colombia': 'CO',
      'Peru': 'PE',
      'Venezuela': 'VE',
      'South Africa': 'ZA',
      'Egypt': 'EG',
      'Morocco': 'MA',
      'Nigeria': 'NG',
      'Kenya': 'KE',
      'South Korea': 'KR',
      'Thailand': 'TH',
      'Vietnam': 'VN',
      'Singapore': 'SG',
      'Malaysia': 'MY',
      'Indonesia': 'ID',
      'Philippines': 'PH',
      'New Zealand': 'NZ',
      'Israel': 'IL',
      'Saudi Arabia': 'SA',
      'United Arab Emirates': 'AE',
      'Iran': 'IR',
      'Iraq': 'IQ',
      'Pakistan': 'PK',
      'Bangladesh': 'BD',
      'Sri Lanka': 'LK',
      'Ireland': 'IE',
      'Iceland': 'IS',
      'Luxembourg': 'LU',
      'Malta': 'MT',
      'Cyprus': 'CY',
      'Lebanon': 'LB',
      'Tunisie': 'TN'
    };
    return flagCodeMap[countryName] || 'UN';
  };

  // Helper function for flag emoji fallback
  const getFlagEmoji = (countryCode: string): string => {
    const flagMap: Record<string, string> = {
      'US': '🇺🇸', 'GB': '🇬🇧', 'FR': '🇫🇷', 'DE': '🇩🇪', 'ES': '🇪🇸',
      'IT': '🇮🇹', 'CA': '🇨🇦', 'AU': '🇦🇺', 'JP': '🇯🇵', 'CN': '🇨🇳',
      'BR': '🇧🇷', 'IN': '🇮🇳', 'NL': '🇳🇱', 'BE': '🇧🇪', 'CH': '🇨🇭',
      'PT': '🇵🇹', 'RU': '🇷🇺', 'KR': '🇰🇷', 'IL': '🇮🇱', 'PH': '🇵🇭'
    };
    return flagMap[countryCode] || '🌍';
  };

  const getColorIntensity = (value: number): string => {
    if (value === 0) return '#f3f4f6'; // gray-100
    
    // Utiliser une échelle logarithmique pour mieux différencier les petites valeurs
    const logValue = Math.log(value + 1);
    const logMax = Math.log(maxValue + 1);
    const intensity = logValue / logMax;
    
    // Amplifier l'intensité pour les petites valeurs
    const adjustedIntensity = Math.pow(intensity, 0.6);
    
    // Assurer une intensité minimum plus visible
    const minIntensity = 0.3;
    const finalIntensity = Math.max(minIntensity, adjustedIntensity);
    
    // Utiliser un gradient de couleurs chaudes : jaune -> orange -> rouge
    if (finalIntensity < 0.5) {
      // Jaune à orange
      const ratio = finalIntensity / 0.5;
      const r = Math.round(255);
      const g = Math.round(255 - (60 * ratio)); // 255 -> 195
      const b = Math.round(0);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Orange à rouge
      const ratio = (finalIntensity - 0.5) / 0.5;
      const r = Math.round(255);
      const g = Math.round(195 - (195 * ratio)); // 195 -> 0
      const b = Math.round(0);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  const handleCountryClick = (geo: any) => {
    const countryName = geo.properties.name;
    const count = countryData[countryName] || 0;
    
    if (isMobile && count > 0) {
      setTooltip({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        content: `${count} participant${count > 1 ? 's' : ''}`,
        country: countryName,
        flag: getCountryFlagCode(countryName),
        count
      });
      
      setTimeout(() => setTooltip(null), 3000);
    } else if (!isMobile) {
      if (count > 0) {
        alert(`${countryName}: ${count} participants`);
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent<SVGPathElement, MouseEvent>, geo: any) => {
    if (!isMobile) {
      const countryName = geo.properties.name;
      const count = countryData[countryName] || 0;
      
      if (count > 0) {
        setTooltip({
          x: event.clientX,
          y: event.clientY,
          content: `${count} participant${count > 1 ? 's' : ''}`,
          country: countryName,
          flag: getCountryFlagCode(countryName),
          count
        });
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setTooltip(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 relative">
      <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
        Global Reach
      </h3>
      
      {/* Map Container */}
      <div className="relative w-full h-96 bg-gray-50 rounded-lg overflow-hidden">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 120,
            center: [0, 20]
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup>
            <Geographies geography={geoUrl}>
              {({ geographies }: { geographies: any[] }) => {
                return geographies.map((geo) => {
                  const countryName = geo.properties.name;
                  const value = countryData[countryName] || 0;
                  
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={getColorIntensity(value)}
                      stroke="#e5e7eb"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { 
                          fill: value > 0 ? "#1d4ed8" : "#f3f4f6",
                          stroke: "#374151",
                          strokeWidth: 1,
                          cursor: value > 0 ? "pointer" : "default",
                          outline: "none"
                        },
                        pressed: { outline: "none" }
                      }}
                      onClick={() => handleCountryClick(geo)}
                      onMouseMove={(event: React.MouseEvent<SVGPathElement, MouseEvent>) => handleMouseMove(event, geo)}
                      onMouseLeave={handleMouseLeave}
                    />
                  );
                });
              }}
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Enhanced Tooltip */}
      {tooltip && (
        <div
          className={`fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-3 pointer-events-none ${
            isMobile ? 'left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2' : ''
          }`}
          style={!isMobile ? {
            left: tooltip.x + 10,
            top: tooltip.y - 60,
          } : {}}
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-6 rounded overflow-hidden border border-gray-200">
              <img
                src={`https://flagsapi.com/${tooltip.flag}/flat/64.png`}
                alt={`${tooltip.country} flag`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = getFlagEmoji(tooltip.flag);
                    parent.className = 'flex-shrink-0 w-8 h-6 flex items-center justify-center text-lg border border-gray-200 rounded';
                  }
                }}
              />
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">
                {tooltip.country}
              </div>
              <div className="text-blue-600 font-medium text-sm">
                {tooltip.content}
              </div>
            </div>
          </div>
          {isMobile && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <span className="text-sm text-gray-600">Less</span>
        <div className="flex h-4 w-32 rounded overflow-hidden border border-gray-200">
          {[
            'rgb(255, 255, 0)',    // Jaune
            'rgb(255, 210, 0)',    // Jaune-orange
            'rgb(255, 165, 0)',    // Orange
            'rgb(255, 100, 0)',    // Orange-rouge
            'rgb(255, 0, 0)'       // Rouge
          ].map((color, index) => (
            <div
              key={index}
              className="flex-1"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600">More</span>
      </div>

      <div className="text-center mt-2 text-xs text-gray-500">
        {isMobile ? 'Tap on a country to see participant count' : 'Hover over a country to see participant count'}
      </div>
    </div>
  );
}

