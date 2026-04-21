/**
 * WorldMap — Interactive choropleth map showing participant countries.
 * Uses react-simple-maps with a blue-toned color scale matching the site's
 * design language. Includes hover tooltips (desktop) and tap info (mobile).
 */
import { useEffect, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';

interface CountryData {
  [countryCode: string]: number;
}

interface WorldMapProps {
  countryData: CountryData;
  maxValue: number;
  theme?: 'default' | 'quiet';
}

const geoUrl = '/data/world-110m.json';

const getCountryFlagCode = (countryName: string): string => {
  const flagCodeMap: Record<string, string> = {
    'United States of America': 'US', 'United Kingdom': 'GB',
    'France': 'FR', 'Germany': 'DE', 'Spain': 'ES', 'Italy': 'IT',
    'Canada': 'CA', 'Australia': 'AU', 'Japan': 'JP', 'China': 'CN',
    'Brazil': 'BR', 'India': 'IN', 'Netherlands': 'NL', 'Belgium': 'BE',
    'Switzerland': 'CH', 'Austria': 'AT', 'Sweden': 'SE', 'Norway': 'NO',
    'Denmark': 'DK', 'Finland': 'FI', 'Poland': 'PL',
    'Czech Republic': 'CZ', 'Portugal': 'PT', 'Greece': 'GR',
    'Turkey': 'TR', 'Russia': 'RU', 'Mexico': 'MX', 'Argentina': 'AR',
    'Chile': 'CL', 'Colombia': 'CO', 'Peru': 'PE', 'Venezuela': 'VE',
    'South Africa': 'ZA', 'Egypt': 'EG', 'Morocco': 'MA', 'Nigeria': 'NG',
    'Kenya': 'KE', 'South Korea': 'KR', 'Thailand': 'TH', 'Vietnam': 'VN',
    'Singapore': 'SG', 'Malaysia': 'MY', 'Indonesia': 'ID',
    'Philippines': 'PH', 'New Zealand': 'NZ', 'Israel': 'IL',
    'Saudi Arabia': 'SA', 'United Arab Emirates': 'AE', 'Iran': 'IR',
    'Iraq': 'IQ', 'Pakistan': 'PK', 'Bangladesh': 'BD', 'Sri Lanka': 'LK',
    'Ireland': 'IE', 'Iceland': 'IS', 'Luxembourg': 'LU', 'Malta': 'MT',
    'Cyprus': 'CY', 'Lebanon': 'LB', 'Tunisie': 'TN',
  };
  return flagCodeMap[countryName] || 'UN';
};

function getFlagEmoji(countryCode: string): string {
  const flagMap: Record<string, string> = {
    'US': '🇺🇸', 'GB': '🇬🇧', 'FR': '🇫🇷', 'DE': '🇩🇪', 'ES': '🇪🇸',
    'IT': '🇮🇹', 'CA': '🇨🇦', 'AU': '🇦🇺', 'JP': '🇯🇵', 'CN': '🇨🇳',
    'BR': '🇧🇷', 'IN': '🇮🇳', 'NL': '🇳🇱', 'BE': '🇧🇪', 'CH': '🇨🇭',
    'PT': '🇵🇹', 'RU': '🇷🇺', 'KR': '🇰🇷', 'IL': '🇮🇱', 'PH': '🇵🇭',
  };
  return flagMap[countryCode] || '🌍';
}

export default function WorldMap({ countryData, maxValue, theme = 'default' }: WorldMapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string; country: string; flag: string; count: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const isQuiet = theme === 'quiet';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Color scale per theme.
  // default → blue ramp (legacy);  quiet → ink ramp on paper (editorial).
  const getColorIntensity = (value: number): string => {
    if (isQuiet) {
      if (value === 0) return '#e8e7e2'; // slightly darker than paper-2 so edges read
      const logValue = Math.log(value + 1);
      const logMax = Math.log(maxValue + 1);
      const intensity = Math.pow(logValue / logMax, 0.55);
      const finalIntensity = Math.max(0.22, intensity);
      // Ramp from warm paper-2 (#f0efea) → ink (#1a1a1a)
      const r = Math.round(240 - (240 - 26) * finalIntensity);
      const g = Math.round(239 - (239 - 26) * finalIntensity);
      const b = Math.round(234 - (234 - 26) * finalIntensity);
      return `rgb(${r}, ${g}, ${b})`;
    }

    if (value === 0) return '#f1f5f9'; // slate-100

    const logValue = Math.log(value + 1);
    const logMax = Math.log(maxValue + 1);
    const intensity = Math.pow(logValue / logMax, 0.6);
    const finalIntensity = Math.max(0.25, intensity);

    // Blue gradient: light sky → deep blue
    const r = Math.round(219 - (219 - 30) * finalIntensity);
    const g = Math.round(234 - (234 - 64) * finalIntensity);
    const b = Math.round(254 - (254 - 175) * finalIntensity);
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Per-theme chrome + hover styling
  const containerClass = isQuiet
    ? 'bg-transparent overflow-hidden h-full flex flex-col'
    : 'bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden';
  const mapBgClass = isQuiet ? 'relative w-full flex-1 min-h-[320px] bg-[#fafaf7]' : 'relative w-full h-80 md:h-96 bg-slate-50';
  const hoverActiveFill = isQuiet ? '#1a1a1a' : '#1e40af';
  const hoverActiveStroke = isQuiet ? '#000000' : '#1e3a8a';
  const hoverInactiveFill = isQuiet ? '#e8e7e2' : '#f1f5f9';
  const hoverInactiveStroke = isQuiet ? 'rgba(26,26,26,0.15)' : '#e2e8f0';
  const baseStroke = isQuiet ? 'rgba(26,26,26,0.12)' : '#e2e8f0';
  const legendColors = isQuiet
    ? ['#f0efea', '#cfcdc2', '#8f8d82', '#4a4a4a', '#1a1a1a']
    : ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a'];

  const handleCountryClick = (geo: any) => {
    const countryName = geo.properties.name;
    const count = countryData[countryName] || 0;

    if (count > 0) {
      setTooltip({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        content: `${count} participant${count > 1 ? 's' : ''}`,
        country: countryName,
        flag: getCountryFlagCode(countryName),
        count,
      });
      if (isMobile) setTimeout(() => setTooltip(null), 3000);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<SVGPathElement, MouseEvent>, geo: any) => {
    if (isMobile) return;
    const countryName = geo.properties.name;
    const count = countryData[countryName] || 0;

    if (count > 0) {
      setTooltip({
        x: event.clientX,
        y: event.clientY,
        content: `${count} participant${count > 1 ? 's' : ''}`,
        country: countryName,
        flag: getCountryFlagCode(countryName),
        count,
      });
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) setTooltip(null);
  };

  return (
    <div className={containerClass}>
      {/* Header */}
      {isQuiet ? (
        <div className="px-9 pt-9 pb-3">
          <h3
            className="m-0 text-[22px]"
            style={{
              fontFamily: "'Playfair Display Variable', Georgia, serif",
              fontWeight: 500,
              color: '#1a1a1a',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}
          >
            Global reach
          </h3>
          <p
            className="m-0 mt-2"
            style={{
              fontFamily: "'Inter Variable', system-ui, sans-serif",
              fontSize: 12,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#4a4a4a',
            }}
          >
            {isMobile ? 'Tap a highlighted country' : 'Hover a highlighted country'}
          </p>
        </div>
      ) : (
        <div className="px-6 pt-6 pb-2">
          <h3 className="text-xl font-bold text-gray-900 text-center">Global Reach</h3>
          <p className="text-sm text-gray-500 text-center mt-1">
            {isMobile ? 'Tap on a highlighted country' : 'Hover over a highlighted country'}
          </p>
        </div>
      )}

      {/* Map Container */}
      <div className={mapBgClass}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 120, center: [0, 20] }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup>
            <Geographies geography={geoUrl}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo) => {
                  const countryName = geo.properties.name;
                  const value = countryData[countryName] || 0;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={getColorIntensity(value)}
                      stroke={baseStroke}
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: {
                          fill: value > 0 ? hoverActiveFill : hoverInactiveFill,
                          stroke: value > 0 ? hoverActiveStroke : hoverInactiveStroke,
                          strokeWidth: value > 0 ? 1 : 0.5,
                          cursor: value > 0 ? 'pointer' : 'default',
                          outline: 'none',
                        },
                        pressed: { outline: 'none' },
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
          className={`fixed z-50 ${isQuiet ? 'bg-[#fafaf7] border border-[rgba(26,26,26,0.15)] px-4 py-3 pointer-events-none' : 'bg-white border border-gray-200 rounded-xl shadow-2xl px-4 py-3 pointer-events-none'} ${
            isMobile ? 'left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2' : ''
          }`}
          style={!isMobile ? { left: tooltip.x + 12, top: tooltip.y - 56 } : {}}
        >
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 w-8 h-6 overflow-hidden border ${isQuiet ? 'border-[rgba(26,26,26,0.15)]' : 'border-gray-200 rounded'}`}>
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
                    parent.className = `flex-shrink-0 w-8 h-6 flex items-center justify-center text-lg border ${isQuiet ? 'border-[rgba(26,26,26,0.15)]' : 'border-gray-200 rounded'}`;
                  }
                }}
              />
            </div>
            <div>
              <div className={isQuiet ? 'text-[#1a1a1a] text-sm' : 'font-semibold text-gray-900 text-sm'} style={isQuiet ? { fontFamily: "'Playfair Display Variable', Georgia, serif", fontWeight: 500 } : {}}>{tooltip.country}</div>
              <div className={isQuiet ? 'text-[#4a4a4a] text-xs tracking-wider uppercase' : 'text-blue-600 font-medium text-sm'} style={isQuiet ? { fontFamily: "'Inter Variable', system-ui, sans-serif" } : {}}>{tooltip.content}</div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className={isQuiet ? 'px-9 py-5 flex items-center justify-center gap-3' : 'px-6 py-4 flex items-center justify-center gap-3'}>
        <span className={isQuiet ? 'text-[10px] tracking-widest uppercase text-[#4a4a4a]' : 'text-xs text-gray-400 font-medium'}>Fewer</span>
        <div className={isQuiet ? 'flex h-[6px] w-32 overflow-hidden border border-[rgba(26,26,26,0.1)]' : 'flex h-3 w-28 rounded-full overflow-hidden border border-gray-200'}>
          {legendColors.map((color, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span className={isQuiet ? 'text-[10px] tracking-widest uppercase text-[#4a4a4a]' : 'text-xs text-gray-400 font-medium'}>More</span>
      </div>
    </div>
  );
}
