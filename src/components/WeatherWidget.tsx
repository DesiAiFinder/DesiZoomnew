import { useEffect, useState } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { fetchWeather } from '../services/weatherService';
import { env } from '../config/env';
import type { WeatherData } from '../types';

export default function WeatherWidget() {
  const { city } = useLocation();
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    if (!env.openWeatherKey) return;
    fetchWeather(city, env.openWeatherKey).then(setWeather);
  }, [city]);

  if (!weather || !env.openWeatherKey) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 12, padding: '10px 16px', color: 'white',
    }}>
      <img src={weather.icon} alt={weather.description} style={{ width: 40, height: 40 }} />
      <div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{weather.temp}°F</div>
        <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'capitalize' }}>{weather.description}</div>
      </div>
      <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 12, fontSize: 11, opacity: 0.75, lineHeight: 1.7 }}>
        <div>💧 {weather.humidity}%</div>
        <div>🌬️ {weather.wind_speed} mph</div>
      </div>
    </div>
  );
}
