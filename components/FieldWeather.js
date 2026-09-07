"use client";
import { useEffect, useState } from "react";

export default function FieldWeather({ city, plantsInField = [] }) {
  const [weather, setWeather] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!city) return;
    fetch(`/api/weather?city=${encodeURIComponent(city)}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setWeather(d)))
      .catch((e) => setErr(e.message));
  }, [city]);

  if (!city) return <div className="text-xs text-gray-400">尚未設定縣市，無法查詢天氣</div>;
  if (err) return <div className="text-xs text-red-500">{err}</div>;
  if (!weather) return <div className="text-xs text-gray-400">查詢天氣中...</div>;

  const next = weather.periods?.[0];
  const current = weather.current;

  return (
    <div className="text-xs space-y-1.5">
      {current ? (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="px-2 py-0.5 rounded bg-leaf-100 font-semibold text-leaf-800">
            🌡️ 目前 {current.temp.toFixed(1)}°C
          </span>
          {current.humidity != null && <span className="px-2 py-0.5 rounded bg-leaf-50">濕度 {current.humidity}%</span>}
          {current.weather && <span className="px-2 py-0.5 rounded bg-leaf-50">{current.weather}</span>}
          <span className="text-gray-400">
            測站：{current.stationName}・{current.obsTime ? new Date(current.obsTime).toLocaleTimeString("zh-TW") : ""}
          </span>
        </div>
      ) : (
        <div className="text-gray-400">此縣市暫無即時測站觀測資料</div>
      )}
      {next && (
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-0.5 rounded bg-leaf-50">{next.wx}</span>
          <span className="px-2 py-0.5 rounded bg-leaf-50">預報 {next.minT}~{next.maxT}°C</span>
          <span className="px-2 py-0.5 rounded bg-leaf-50">降雨機率 {next.pop}%</span>
        </div>
      )}
      {(weather.alerts?.heavyRain || weather.alerts?.coldSnap) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mt-1">
          <div className="font-semibold text-amber-800">
            {weather.alerts.heavyRain && "⚠️ 未來預報有豪雨風險　"}
            {weather.alerts.coldSnap && "🥶 未來預報有低溫寒流風險"}
          </div>
          <div className="text-amber-700 mt-1">建議移入避難的植株：</div>
          <ul className="list-disc list-inside text-amber-700">
            {plantsInField.length ? (
              plantsInField.map((p) => <li key={p.id}>{p.name}</li>)
            ) : (
              <li>此場域目前無植株</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
