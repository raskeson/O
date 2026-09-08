"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TAIWAN_CITIES, ALIVE_STATUSES } from "@/lib/constants";
import BatchTableForm from "@/components/BatchTableForm";
import FieldWeather from "@/components/FieldWeather";

export default function FieldsPage() {
  const [fields, setFields] = useState([]);
  const [plants, setPlants] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    const [{ data: f }, { data: p }] = await Promise.all([
      supabase.from("fields").select("*").order("created_at"),
      supabase.from("plants").select("id,name,field_id").in("status", ALIVE_STATUSES),
    ]);
    setFields(f || []);
    setPlants(p || []);
  }
  useEffect(() => {
    load();
  }, []);

  const columns = [
    { key: "name", label: "場域名稱", required: true, width: 140 },
    { key: "city", label: "對應縣市（天氣查詢用）", type: "select", options: TAIWAN_CITIES.map((c) => ({ value: c, label: c })), width: 150 },
    { key: "attributes_text", label: "環境屬性（日照/遮蔭/排水...自由文字）", width: 220 },
  ];

  async function handleAdd(rows) {
    const payload = rows
      .filter((r) => r.name)
      .map((r) => ({ name: r.name, city: r.city || null, attributes: { note: r.attributes_text || "" } }));
    if (!payload.length) return;
    const { error } = await supabase.from("fields").insert(payload);
    if (error) alert("新增失敗：" + error.message);
    load();
  }

  async function handleDelete(field) {
    if (!confirm(`確定要刪除場域「${field.name}」嗎？其中植物會變成未設定場域。`)) return;
    await supabase.from("fields").delete().eq("id", field.id);
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-leaf-900">場域管理</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          ＋ 新增場域（表格批次輸入）
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((f) => {
          const plantsInField = plants.filter((p) => p.field_id === f.id);
          return (
            <div key={f.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-leaf-900">{f.name}</div>
                  <div className="text-xs text-gray-500">{f.city || "未設定縣市"}</div>
                  {f.attributes?.note && <div className="text-xs text-gray-600 mt-1">屬性：{f.attributes.note}</div>}
                  <div className="text-xs text-gray-500 mt-1">植株數：{plantsInField.length}</div>
                </div>
                <button className="btn-danger text-xs px-2 py-1" onClick={() => handleDelete(f)}>
                  🗑 刪除
                </button>
              </div>
              <div className="mt-2 pt-2 border-t border-leaf-100">
                <FieldWeather city={f.city} plantsInField={plantsInField} />
              </div>
            </div>
          );
        })}
        {!fields.length && <div className="text-sm text-gray-400">尚無場域，點右上角新增。</div>}
      </div>

      {showAdd && (
        <BatchTableForm
          title="新增場域"
          columns={columns}
          onSubmit={handleAdd}
          onClose={() => setShowAdd(false)}
          submitLabel="全部新增"
        />
      )}
    </div>
  );
}
