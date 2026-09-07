import { NextResponse } from "next/server";

// 中央氣象署 開放資料平台 - 一般天氣預報-今明36小時預報 (F-C0032-001)
// 文件: https://opendata.cwa.gov.tw/dist/opendata-swagger.html
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const apiKey = process.env.CWA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "尚未設定 CWA_API_KEY，請至 opendata.cwa.gov.tw 申請免費會員授權碼並設定於環境變數。" },
      { status: 500 }
    );
  }
  if (!city) {
    return NextResponse.json({ error: "缺少 city 參數" }, { status: 400 });
  }

  const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001?Authorization=${apiKey}&locationName=${encodeURIComponent(
    city
  )}&elementName=Wx,PoP,MinT,MaxT,CI`;

  try {
    const res = await fetch(url, { next: { revalidate: 600 } }); // 快取10分鐘，避免超過流量限制
    const json = await res.json();

    const locationData = json?.records?.location?.[0];
    if (!locationData) {
      return NextResponse.json({ error: "查無此縣市的預報資料", raw: json }, { status: 404 });
    }

    const elements = {};
    (locationData.weatherElement || []).forEach((el) => {
      elements[el.elementName] = el.time;
    });

    const periods = (elements.Wx || []).map((t, idx) => ({
      start: t.startTime,
      end: t.endTime,
      wx: elements.Wx?.[idx]?.parameter?.parameterName,
      pop: Number(elements.PoP?.[idx]?.parameter?.parameterName ?? 0),
      minT: Number(elements.MinT?.[idx]?.parameter?.parameterName ?? null),
      maxT: Number(elements.MaxT?.[idx]?.parameter?.parameterName ?? null),
      comfort: elements.CI?.[idx]?.parameter?.parameterName,
    }));

    const heavyRain = periods.some((p) => p.pop >= 70);
    const coldSnap = periods.some((p) => p.minT !== null && p.minT <= 10);

    // 額外查詢「現在天氣觀測報告」(O-A0003-001) 取得該縣市測站的即時溫度，
    // 而不是只有預報的最高/最低區間
    let current = null;
    try {
      const obsUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0003-001?Authorization=${apiKey}`;
      const obsRes = await fetch(obsUrl, { next: { revalidate: 300 } }); // 快取5分鐘
      const obsJson = await obsRes.json();
      const stations = obsJson?.records?.Station || [];
      const candidates = stations.filter(
        (s) => s.GeoInfo?.CountyName === city && Number(s.WeatherElement?.AirTemperature) > -90
      );
      if (candidates.length) {
        const st = candidates[0];
        current = {
          stationName: st.StationName,
          obsTime: st.ObsTime?.DateTime,
          temp: Number(st.WeatherElement?.AirTemperature),
          humidity: Number(st.WeatherElement?.RelativeHumidity),
          weather: st.WeatherElement?.Weather,
        };
      }
    } catch {
      // 即時觀測查詢失敗不影響整體天氣預報結果，忽略即可
    }

    return NextResponse.json({
      city,
      current,
      periods,
      alerts: { heavyRain, coldSnap },
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: "氣象署 API 查詢失敗：" + err.message }, { status: 500 });
  }
}
