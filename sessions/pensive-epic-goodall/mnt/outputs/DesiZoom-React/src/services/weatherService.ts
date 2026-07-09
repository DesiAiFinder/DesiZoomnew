import type { WeatherData } from '../types';

export async function fetchWeather(city: string, apiKey: string): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=imperial`
    );
    if (!res.ok) return null;
    const d = await res.json();
    return {
      city: d.name,
      temp: Math.round(d.main.temp),
      feels_like: Math.round(d.main.feels_like),
      description: d.weather[0].description,
      icon: `https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png`,
      humidity: d.main.humidity,
      wind_speed: Math.round(d.wind.speed),
    };
  } catch {
    return null;
  }
}
