"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { speciesLabel, potSizeLabel, waterUrgency } from "@/lib/utils";

const urgencyOrder = { overdue: 0, today: 1, ok: 2, none: 3 };
const urgencyColor = {
  overdue: "bg-red-100 text-red-700 border-red-200",
  today: "bg-amber-100 text-amber-700 border-amber-200",
  ok: "bg-leaf-50 text-leaf-700 border-leaf-200",
  none: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function CustodyPage() {
  const [enabled, setEnabled] = useState(false);
  const [plants, setPlants] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: setting }, { data: p }, { data: f }] = await Promise.all([
      supabase.from("app_settings").select("*").eq("key", "custody_mode").maybeSingle(),
      supabase.from("plants").select("*").eq("status", "alive"),
      supabase.from("fields").select("*"),
    ]);
    setEnabled(!!setting?.value?.enabled);
    setPlants(p || []);
    setFields(f || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function toggleCustody() {
    const next = !enabled;
    await supabase.from("app_settings").upsert({ key: "custody_mode", value: { enabled: next }, updated_at: new Date().toISOString() });
    setEnabled(next);
  }

  const fieldMap = Object.fromEntries(fields.map((f) => [f.id, f.name]));
  const sorted = [...plants].sort((a, b) => {
    const ua = urgencyOrder[waterUrgency(a).level];
    const ub = urgencyOrder[waterUrgency(b).level];
    return ua - ub;
  });

  if (loading) return <div className="text-sm text-gray-500">載入中...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-leaf-900">出差託管模式</h1>
          <p className="text-sm text-gray-500">開啟後，把這個網址分享給幫忙照顧植物的人即可，不需要帳號。</p>
        </div>
        <button onClick={toggleCustody} className={enabled ? "btn-secondary" : "btn-primary"}>
          {enabled ? "🔴 關閉託管模式" : "🟢 一鍵開啟託管模式"}
        </button>
      </div>

      {!enabled ? (
        <div className="card text-sm text-gray-500">目前託管模式未開啟，託管清單暫不顯示。屋主外出前請按上方按鈕開啟。</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sorted.map((p) => {
            const urgency = waterUrgency(p);
            return (
              <div key={p.id} className={`rounded-xl border p-3 ${urgencyColor[urgency.level]}`}>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs opacity-80">
                  {speciesLabel(p)}・場域：{fieldMap[p.field_id] || "未設定"}・盆栽：{potSizeLabel(p)}
                </div>
                <div className="text-sm mt-1 font-medium">💧 {urgency.label}</div>
                {p.care_note && <div className="text-xs mt-1">🌿 性質：{p.care_note}</div>}
              </div>
            );
          })}
          {!sorted.length && <div className="text-gray-400 text-sm">目前沒有健在的植物需要照顧</div>}
        </div>
      )}
    </div>
  );
}
