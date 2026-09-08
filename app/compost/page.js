"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { COMPOST_MATERIAL_PRESETS } from "@/lib/constants";
import { calcCN, cnRatioAdvice } from "@/lib/utils";
import BatchTableForm from "@/components/BatchTableForm";
import dayjs from "dayjs";

export default function CompostPage() {
  const [bins, setBins] = useState([]);
  const [materials, setMaterials] = useState([]); // all, filtered client-side by bin
  const [showAddBin, setShowAddBin] = useState(false);
  const [materialTarget, setMaterialTarget] = useState(null); // bin to add material to

  async function load() {
    const [{ data: b, error: be }, { data: m, error: me }] = await Promise.all([
      supabase.from("compost_bins").select("*").order("created_at", { ascending: false }),
      supabase.from("compost_materials").select("*"),
    ]);
    if (be) console.error("載入堆肥箱失敗：", be.message);
    if (me) console.error("載入堆肥材料失敗：", me.message);
    setBins(b || []);
    setMaterials(m || []);
  }
  useEffect(() => {
    load();
  }, []);

  const binColumns = [
    { key: "name", label: "堆肥箱名稱", required: true, width: 140 },
    { key: "started_at", label: "開始日期", type: "date", width: 150 },
    { key: "notes", label: "備註", width: 200 },
  ];

  async function handleAddBin(rows) {
    const payload = rows.filter((r) => r.name).map((r) => ({ name: r.name, started_at: r.started_at || new Date().toISOString().slice(0, 10), notes: r.notes || null }));
    if (!payload.length) return;
    const { error } = await supabase.from("compost_bins").insert(payload);
    if (error) {
      alert("新增堆肥箱失敗：" + error.message);
      return;
    }
    load();
  }

  async function handleDeleteBin(bin) {
    if (!confirm(`確定刪除堆肥箱「${bin.name}」？`)) return;
    const { error } = await supabase.from("compost_bins").delete().eq("id", bin.id);
    if (error) {
      alert("刪除失敗：" + error.message);
      return;
    }
    load();
  }

  const materialColumns = [
    {
      key: "preset",
      label: "材料（可選預設或自訂後修改右側碳氮比）",
      type: "select",
      options: COMPOST_MATERIAL_PRESETS.map((p) => ({ value: p.name, label: p.name })),
      width: 180,
    },
    { key: "name", label: "材料名稱（自訂）", width: 140 },
    { key: "weight", label: "重量(kg)", type: "number", required: true, width: 90 },
    { key: "cn_ratio", label: "碳氮比 C:N（例如 30 或 30:1）", type: "text", placeholder: "30:1", width: 130 },
  ];

  // 解析「30」「30:1」「30比1」這類輸入，回傳單一數字（N 那邊視為 1）
  function parseCnRatio(input) {
    if (input === "" || input == null) return null;
    const str = String(input).trim().replace("比", ":").replace("：", ":");
    const parts = str.split(":");
    const num = Number(parts[0]);
    if (!Number.isFinite(num) || num <= 0) return null;
    if (parts.length > 1) {
      const denom = Number(parts[1]);
      if (Number.isFinite(denom) && denom > 0) return num / denom;
    }
    return num;
  }

  async function handleAddMaterial(rows) {
    const payload = rows
      .filter((r) => r.weight)
      .map((r) => {
        const preset = COMPOST_MATERIAL_PRESETS.find((p) => p.name === r.preset);
        const parsed = parseCnRatio(r.cn_ratio);
        return {
          bin_id: materialTarget.id,
          name: r.name || r.preset || "未命名材料",
          weight: Number(r.weight),
          cn_ratio: parsed != null ? parsed : preset?.cn_ratio || 0,
        };
      })
      .filter((p) => p.cn_ratio > 0);
    if (!payload.length) {
      alert("沒有可新增的材料：請確認重量與碳氮比都有填。");
      return;
    }
    const { error } = await supabase.from("compost_materials").insert(payload);
    if (error) {
      alert("新增材料失敗：" + error.message + "\n\n如果訊息提到 cn_ratio 找不到欄位，代表資料庫還沒更新，請到 Supabase 執行 schema.sql 裡「既有資料庫要升級」的那幾行 SQL。");
      return;
    }
    setMaterialTarget(null);
    load();
  }

  async function handleDeleteMaterial(m) {
    const { error } = await supabase.from("compost_materials").delete().eq("id", m.id);
    if (error) {
      alert("刪除失敗：" + error.message);
      return;
    }
    load();
  }

  async function handleFinishBin(bin) {
    const binMaterials = materials.filter((m) => m.bin_id === bin.id);
    const totalWeight = binMaterials.reduce((s, m) => s + Number(m.weight), 0);
    if (!totalWeight) {
      alert("此堆肥箱尚無材料紀錄");
      return;
    }
    if (!confirm(`確定要開箱「${bin.name}」，把 ${totalWeight}kg 自製有機肥轉入資材庫存嗎？開箱後這個堆肥箱會歸零，可以馬上開始下一輪。`))
      return;

    const { data: existing } = await supabase.from("inventory_items").select("*").eq("name", "自製有機肥").maybeSingle();
    if (existing) {
      await supabase.from("inventory_items").update({ qty: Number(existing.qty) + totalWeight }).eq("id", existing.id);
      await supabase.from("inventory_logs").insert({ item_id: existing.id, delta: totalWeight, reason: `堆肥箱「${bin.name}」熟成開箱轉入` });
    } else {
      const { data: created } = await supabase
        .from("inventory_items")
        .insert({ name: "自製有機肥", category: "堆肥/介質", qty: totalWeight, unit: "kg" })
        .select()
        .single();
      if (created) await supabase.from("inventory_logs").insert({ item_id: created.id, delta: totalWeight, reason: `堆肥箱「${bin.name}」熟成開箱轉入` });
    }
    // 開箱後歸零：清空這箱的材料紀錄，狀態回到 active、開始日期重設為今天，這個箱子就能馬上重新利用
    await supabase.from("compost_materials").delete().eq("bin_id", bin.id);
    await supabase
      .from("compost_bins")
      .update({ status: "active", started_at: new Date().toISOString().slice(0, 10) })
      .eq("id", bin.id);
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-leaf-900">堆肥監測與庫存轉化</h1>
        <button className="btn-primary" onClick={() => setShowAddBin(true)}>
          ＋ 新增堆肥箱
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bins.map((bin) => {
          const binMaterials = materials.filter((m) => m.bin_id === bin.id);
          const cn = calcCN(binMaterials);
          const days = dayjs().diff(dayjs(bin.started_at), "day");
          const totalWeight = binMaterials.reduce((s, m) => s + Number(m.weight), 0);
          return (
            <div key={bin.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-leaf-900">
                    {bin.name} {bin.status === "completed" && <span className="text-xs text-blue-600">（已完成/已轉入庫存）</span>}
                  </div>
                  <div className="text-xs text-gray-500">
                    開始於 {bin.started_at}（第 {days} 天）
                  </div>
                </div>
                <button className="btn-danger text-xs px-2 py-1" onClick={() => handleDeleteBin(bin)}>
                  🗑 刪除
                </button>
              </div>

              <div className="mt-2 text-sm">
                <div>總重量：{totalWeight} kg</div>
                <div>
                  C/N 比：{cn ? cn.toFixed(1) : "尚無資料"}{" "}
                  {cn && <span className="text-xs text-gray-500">（{cnRatioAdvice(cn)}）</span>}
                </div>
                {cn && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    發酵預測：{cn >= 25 && cn <= 35 ? "約 4~8 週可望完成熟化" : cn < 25 ? "偏濕氮多，建議調整後約需 8~12 週" : "偏乾碳多，分解較慢，約需 10~16 週"}
                  </div>
                )}
              </div>

              <div className="mt-2 space-y-1 text-xs">
                {binMaterials.map((m) => (
                  <div key={m.id} className="flex justify-between border-b border-leaf-100 pb-0.5">
                    <span>
                      {m.name}・{m.weight}kg・C:N {m.cn_ratio}:1
                    </span>
                    <button className="text-red-500" onClick={() => handleDeleteMaterial(m)}>
                      移除
                    </button>
                  </div>
                ))}
                {!binMaterials.length && <div className="text-gray-400">尚無材料</div>}
              </div>

              <div className="flex gap-2 mt-3">
                <button className="btn-secondary text-xs px-2 py-1" onClick={() => setMaterialTarget(bin)}>
                  ＋ 新增材料
                </button>
                <button className="btn-secondary text-xs px-2 py-1" onClick={() => handleFinishBin(bin)}>
                  ✅ 熟成開箱（轉入庫存並歸零）
                </button>
              </div>
            </div>
          );
        })}
        {!bins.length && <div className="text-sm text-gray-400">尚無堆肥箱，點右上角新增。</div>}
      </div>

      {showAddBin && (
        <BatchTableForm title="新增堆肥箱" columns={binColumns} onSubmit={handleAddBin} onClose={() => setShowAddBin(false)} submitLabel="全部新增" />
      )}
      {materialTarget && (
        <BatchTableForm
          title={`新增材料：${materialTarget.name}`}
          columns={materialColumns}
          onSubmit={handleAddMaterial}
          onClose={() => setMaterialTarget(null)}
          submitLabel="全部新增"
        />
      )}
    </div>
  );
}
