import { useEffect, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { supabase } from '../lib/supabase';

interface CountryData {
  [countryCode: string]: number;
}

const geoUrl = "/data/world-110m.json";

// Mapping des noms de pays en FRANÇAIS vers les codes ISO
const countryNameToCode: Record<string, string> = {
  'USA': 'USA',
  'UK': 'GBR',
  'États-Unis': 'USA',
  'Etats-Unis': 'USA',
  'France': 'FRA',
  'Allemagne': 'DEU',
  'Espagne': 'ESP',
  'Italie': 'ITA',
  'Canada': 'CAN',
  'Australie': 'AUS',
  'Japon': 'JPN',
  'Chine': 'CHN',
  'Brésil': 'BRA',
  'Inde': 'IND',
  'Pays-Bas': 'NLD',
  'Belgique': 'BEL',
  'Suisse': 'CHE',
  'Autriche': 'AUT',
  'Suède': 'SWE',
  'Norvège': 'NOR',
  'Danemark': 'DNK',
  'Finlande': 'FIN',
  'Pologne': 'POL',
  'République tchèque': 'CZE',
  'Portugal': 'PRT',
  'Grèce': 'GRC',
  'Turquie': 'TUR',
  'Russie': 'RUS',
  'Mexique': 'MEX',
  'Argentine': 'ARG',
  'Chili': 'CHL',
  'Colombie': 'COL',
  'Pérou': 'PER',
  'Venezuela': 'VEN',
  'Afrique du Sud': 'ZAF',
  'Égypte': 'EGY',
  'Maroc': 'MAR',
  'Nigeria': 'NGA',
  'Kenya': 'KEN',
  'Corée du Sud': 'KOR',
  'Thaïlande': 'THA',
  'Vietnam': 'VNM',
  'Singapour': 'SGP',
  'Malaisie': 'MYS',
  'Indonésie': 'IDN',
  'Philippines': 'PHL',
  'Nouvelle-Zélande': 'NZL',
  'Israël': 'ISR',
  'Arabie saoudite': 'SAU',
  'Émirats arabes unis': 'ARE',
  'Iran': 'IRN',
  'Irak': 'IRQ',
  'Pakistan': 'PAK',
  'Bangladesh': 'BGD',
  'Sri Lanka': 'LKA',
  'Myanmar': 'MMR',
  'Cambodge': 'KHM',
  'Laos': 'LAO',
  'Mongolie': 'MNG',
  'Kazakhstan': 'KAZ',
  'Ouzbékistan': 'UZB',
  'Turkménistan': 'TKM',
  'Kirghizistan': 'KGZ',
  'Tadjikistan': 'TJK',
  'Afghanistan': 'AFG',
  'Ukraine': 'UKR',
  'Biélorussie': 'BLR',
  'Lituanie': 'LTU',
  'Lettonie': 'LVA',
  'Estonie': 'EST',
  'Moldavie': 'MDA',
  'Roumanie': 'ROU',
  'Bulgarie': 'BGR',
  'Serbie': 'SRB',
  'Croatie': 'HRV',
  'Bosnie-Herzégovine': 'BIH',
  'Monténégro': 'MNE',
  'Albanie': 'ALB',
  'Macédoine du Nord': 'MKD',
  'Slovénie': 'SVN',
  'Slovaquie': 'SVK',
  'Hongrie': 'HUN',
  'Irlande': 'IRL',
  'Islande': 'ISL',
  'Luxembourg': 'LUX',
  'Malte': 'MLT',
  'Chypre': 'CYP',
  'Cameroun': 'CMR',
  'Irlande du Nord': 'GBR', // Partie du UK
  'Hong Kong': 'HKG',
  'Liban': 'LBN',
  'Tunisie': 'TUN'
};

export default function WorldMap() {
  const [countryData, setCountryData] = useState<CountryData>({});
  const [maxValue, setMaxValue] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    const fetchCountryData = async () => {
      try {
        const { data, error } = await supabase
          .from('data_participants_tour')
          .select('pays, taille_du_groupe');

        if (error) throw error;

        console.log('Raw data from Supabase:', data); // Debug

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

        console.log('Country count map:', Array.from(countryCount.entries())); // Debug

        // Convert to country codes
        const countryCodeMap: CountryData = {};
        let max = 0;
        
        countryCount.forEach((count, country) => {
          const code = countryNameToCode[country];
          console.log(`Mapping ${country} to ${code}`); // Debug
          if (code) {
            countryCodeMap[code] = count;
            max = Math.max(max, count);
          }
        });

        console.log('Final country code map:', countryCodeMap); // Debug
        console.log('Max value:', max); // Debug

        setCountryData(countryCodeMap);
        setMaxValue(max);
      } catch (error) {
        console.error('Error fetching country data:', error);
      }
    };

    fetchCountryData();
  }, []);

  const getColorIntensity = (value: number): string => {
    if (value === 0) return '#f3f4f6'; // gray-100
    const intensity = value / maxValue;
    const opacity = Math.max(0.3, intensity);
    return `rgba(37, 99, 235, ${opacity})`; // blue-600 with calculated opacity
  };

  const handleCountryClick = (geo: any) => {
    // Debug pour voir toutes les propriétés disponibles
    console.log('Available properties:', Object.keys(geo.properties));
    console.log('All properties:', geo.properties);
    
    // Essayer plusieurs propriétés possibles pour l'ID du pays
    const countryCode = geo.properties.ISO_A3 || 
                       geo.properties.ADM0_A3 || 
                       geo.properties.ISO_A3_EH ||
                       geo.properties.id ||
                       geo.properties.ID ||
                       geo.properties.iso_a3;
                       
    const countryName = geo.properties.NAME || 
                       geo.properties.NAME_EN || 
                       geo.properties.name ||
                       geo.properties.ADMIN ||
                       geo.properties.admin;
    
    const count = countryData[countryCode] || 0;
    
    console.log('Clicked country:', { 
      countryCode, 
      countryName, 
      count,
      allProps: geo.properties 
    });
    
    if (count > 0) {
      setSelectedCountry(countryName);
      alert(`${countryName}: ${count} participants`);
    } else {
      // Debug même si count = 0
      alert(`${countryName || 'Unknown'}: ${count} participants (Code: ${countryCode || 'Unknown'})`);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<SVGPathElement, MouseEvent>, geo: any) => {
    const countryCode = geo.properties.ISO_A3 || 
                       geo.properties.ADM0_A3 || 
                       geo.properties.ISO_A3_EH ||
                       geo.properties.id ||
                       geo.properties.ID ||
                       geo.properties.iso_a3;
                       
    const countryName = geo.properties.NAME || 
                       geo.properties.NAME_EN || 
                       geo.properties.name ||
                       geo.properties.ADMIN ||
                       geo.properties.admin;
    
    const count = countryData[countryCode] || 0;
    
    if (count > 0) {
      setTooltip({
        x: event.clientX,
        y: event.clientY,
        content: `${countryName}: ${count} participants`
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
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
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo) => {
                  const countryCode = geo.properties.ISO_A3 || 
                                     geo.properties.ADM0_A3 || 
                                     geo.properties.ISO_A3_EH ||
                                     geo.properties.id ||
                                     geo.properties.ID ||
                                     geo.properties.iso_a3;
                  
                  const value = countryData[countryCode] || 0;
                  
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
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-sm px-2 py-1 rounded shadow-lg pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 30,
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <span className="text-sm text-gray-600">Less</span>
        <div className="flex h-4 w-32 rounded overflow-hidden border border-gray-200">
          {[0.3, 0.45, 0.6, 0.75, 1.0].map((opacity, index) => (
            <div
              key={index}
              className="flex-1"
              style={{ backgroundColor: `rgba(37, 99, 235, ${opacity})` }}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600">More</span>
      </div>

      <div className="text-center mt-2 text-xs text-gray-500">
        Click on a country to see participant count
      </div>
    </div>
  );
}
