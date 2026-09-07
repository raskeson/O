"use client";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { SPECIES_OPTIONS, POT_UNITS, PLANT_STATUS } from "@/lib/constants";
import PlantCard from "@/components/PlantCard";
import BatchTableForm from "@/components/BatchTableForm";
import { formatMoney, waterUrgency } from "@/lib/utils";

export default function Dashboard() {
  const [plants, setPlants] = useState([]);
  const [fields, setFields] = useState([]);
  const [covers, setCovers] = useState({});
  const [financeEntries, setFinanceEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null);
  const [sellTarget, setSellTarget] = useState(null);
  const [filterField, setFilterField] = useState("");
  const [filterStatus, setFilterStatus] = useState("alive");
  const [search, setSearch] = useState("");
  const [configError, setConfigError] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [{ data: p, error: pe }, { data: f }, { data: fin }] = await Promise.all([
      supabase.from("plants").select("*").order("created_at", { ascending: false }),
      supabase.from("fields").select("*"),
      supabase.from("finance_entries").select("type,amount"),
    ]);
    if (pe) setConfigError(true);
    setPlants(p || []);
    setFields(f || []);
    setFinanceEntries(fin || []);
    if (p && p.length) {
      const { data: photos } = await supabase
        .from("plant_photos")
        .select("plant_id,url,taken_at")
        .in(
          "plant_id",
          p.map((x) => x.id)
        )
        .order("taken_at", { ascending: false });
      const map = {};
      (photos || []).forEach((ph) => {
        if (!map[ph.plant_id]) map[ph.plant_id] = ph.url;
      });
      setCovers(map);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const fieldMap = useMemo(() => Object.fromEntries(fields.map((f) => [f.id, f.name])), [fields]);

  // 今天該澆水（含已逾期）的健在植株
  const dueToWater = useMemo(
    () => plants.filter((p) => p.status === "alive" && ["overdue", "today"].includes(waterUrgency(p).level)),
    [plants]
  );

  async function handleWaterAllDue() {
    if (!dueToWater.length) return;
    if (!confirm(`確定要把 ${dueToWater.length} 株今天該澆水的植物，一次標記為今天已澆水嗎？`)) return;
    const ids = dueToWater.map((p) => p.id);
    const { error } = await supabase
      .from("plants")
      .update({ last_watered: new Date().toISOString().slice(0, 10) })
      .in("id", ids);
    if (error) {
      alert("一鍵澆水失敗：" + error.message);
      return;
    }
    loadAll();
  }

  // 總投入金額：所有健在植株的購入成本加總
  // 估計市價：所有健在植株的估計市價加總
  // 已實現純利：實際發生的財務紀錄（出售+其他收入 - 購入+其他支出）
  const summary = useMemo(() => {
    const alive = plants.filter((p) => p.status === "alive");
    const totalInvested = alive.reduce((s, p) => s + (Number(p.cost) || 0), 0);
    const totalMarketValue = alive.reduce((s, p) => s + (Number(p.estimated_value) || 0), 0);
    const s = { purchase: 0, sale: 0, expense: 0, income: 0 };
    financeEntries.forEach((e) => (s[e.type] = (s[e.type] || 0) + Number(e.amount)));
    const realizedProfit = s.sale + s.income - s.purchase - s.expense;
    return { totalInvested, totalMarketValue, realizedProfit };
  }, [plants, financeEntries]);

  const filtered = plants.filter((p) => {
    if (filterField && p.field_id !== filterField) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      const hit = p.name?.toLowerCase().includes(kw) || p.tag_uid?.toLowerCase().includes(kw);
      if (!hit) return false;
    }
    return true;
  });

  const plantColumns = [
    { key: "name", label: "名稱", required: true, width: 140 },
    { key: "tag_uid", label: "UID（選填，可自訂；留空可稍後在詳情頁設定）", width: 140 },
    { key: "species", label: "種類", type: "select", options: SPECIES_OPTIONS.map((s) => ({ value: s, label: s })), width: 160 },
    { key: "custom_species", label: "自訂種類(選其他時填)", width: 140 },
    { key: "field_id", label: "場域", type: "select", options: fields.map((f) => ({ value: f.id, label: f.name })), width: 140 },
    { key: "acquired_date", label: "取得日期", type: "date", width: 150 },
    { key: "cost", label: "購入成本", type: "number", width: 100 },
    { key: "pot_diameter", label: "盆徑", type: "number", width: 90 },
    { key: "pot_unit", label: "單位", type: "select", options: POT_UNITS.map((u) => ({ value: u, label: u })), width: 90 },
    { key: "water_frequency_days", label: "澆水頻率(天)", type: "number", width: 110 },
    { key: "care_note", label: "性質備註(如：乾/耐旱)", width: 160 },
    { key: "estimated_value", label: "估計市價", type: "number", width: 100 },
  ];

  async function handleAddPlants(rows) {
    const payload = rows
      .filter((r) => r.name)
      .map((r) => ({
        name: r.name,
        tag_uid: r.tag_uid || null,
        species: r.species || null,
        custom_species: r.custom_species || null,
        field_id: r.field_id || null,
        acquired_date: r.acquired_date || null,
        cost: r.cost ? Number(r.cost) : 0,
        pot_diameter: r.pot_diameter ? Number(r.pot_diameter) : null,
        pot_unit: r.pot_unit || "cm",
        water_frequency_days: r.water_frequency_days ? Number(r.water_frequency_days) : null,
        care_note: r.care_note || null,
        estimated_value: r.estimated_value ? Number(r.estimated_value) : 0,
        status: "alive",
      }));
    if (!payload.length) return;
    const { data, error } = await supabase.from("plants").insert(payload).select();
    if (error) {
      alert("新增失敗：" + error.message);
      return;
    }
    // 有成本則同步寫入財務總帳
    const financeRows = (data || [])
      .filter((p) => p.cost)
      .map((p) => ({ type: "purchase", plant_id: p.id, amount: p.cost, category: "購入成本", entry_date: p.acquired_date || new Date().toISOString().slice(0, 10) }));
    if (financeRows.length) await supabase.from("finance_entries").insert(financeRows);
    loadAll();
  }

  async function handleMove(rows) {
    const row = rows[0];
    if (!row.field_id) return;
    await supabase.from("plants").update({ field_id: row.field_id }).eq("id", moveTarget.id);
    await supabase.from("plant_events").insert({
      plant_id: moveTarget.id,
      type: "move",
      detail: { from: moveTarget.field_id, to: row.field_id },
      note: row.note || null,
    });
    setMoveTarget(null);
    loadAll();
  }

  async function handleSell(rows) {
    const row = rows[0];
    await supabase
      .from("plants")
      .update({ status: "sold", sale_price: row.sale_price ? Number(row.sale_price) : 0, sale_date: row.sale_date || new Date().toISOString().slice(0, 10) })
      .eq("id", sellTarget.id);
    await supabase.from("finance_entries").insert({
      type: "sale",
      plant_id: sellTarget.id,
      amount: row.sale_price ? Number(row.sale_price) : 0,
      category: "出售收入",
      entry_date: row.sale_date || new Date().toISOString().slice(0, 10),
      note: row.note || null,
    });
    await supabase.from("plant_events").insert({ plant_id: sellTarget.id, type: "sale", note: row.note || null });
    setSellTarget(null);
    loadAll();
  }

  async function handleMarkDead(plant) {
    if (!confirm(`確定要將「${plant.name}」標記為死亡嗎？標記後會移到「已淘汰」清單。`)) return;
    await supabase.from("plants").update({ status: "dead" }).eq("id", plant.id);
    await supabase.from("plant_events").insert({ plant_id: plant.id, type: "death" });
    loadAll();
  }

  async function handleDelete(plant) {
    if (!confirm(`確定要刪除「${plant.name}」嗎？相關照片與紀錄也會一併刪除，此動作無法復原。`)) return;
    await supabase.from("plants").delete().eq("id", plant.id);
    loadAll();
  }

  if (configError) {
    return (
      <div className="card text-sm text-red-700 bg-red-50 border-red-200">
        尚未連接資料庫。請依照 README 設定 Supabase 專案，並在 Vercel 環境變數填入
        <code className="mx-1 bg-white px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> 與
        <code className="mx-1 bg-white px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>。
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="text-xl font-bold text-leaf-900">植物圖鑑</h1>
        <div className="flex gap-2 flex-wrap">
          <button
            className={`btn-secondary ${!dueToWater.length ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={handleWaterAllDue}
            disabled={!dueToWater.length}
          >
            💧 一鍵澆水（今日待澆 {dueToWater.length} 株）
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            ＋ 新增植物（表格批次輸入）
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="card">
          <div className="text-xs text-gray-500">總投入金額（健在植株）</div>
          <div className="font-bold text-lg text-leaf-900">{formatMoney(summary.totalInvested)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500">估計市價（健在植株）</div>
          <div className="font-bold text-lg text-leaf-900">{formatMoney(summary.totalMarketValue)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500">已實現純利</div>
          <div className={`font-bold text-lg ${summary.realizedProfit >= 0 ? "text-leaf-700" : "text-red-600"}`}>
            {formatMoney(summary.realizedProfit)}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          className="input w-48"
          placeholder="🔍 搜尋名稱或 UID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input w-40" value={filterField} onChange={(e) => setFilterField(e.target.value)}>
          <option value="">所有場域</option>
          {fields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select className="input w-32" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">所有狀態</option>
          {PLANT_STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">載入中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-500 text-sm">尚無植物資料，點右上角新增。</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PlantCard
              key={p.id}
              plant={p}
              fieldName={fieldMap[p.field_id]}
              coverPhoto={covers[p.id]}
              onMove={setMoveTarget}
              onSell={setSellTarget}
              onDeath={handleMarkDead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <BatchTableForm
          title="新增植物（可一次輸入多筆）"
          columns={plantColumns}
          onSubmit={handleAddPlants}
          onClose={() => setShowAdd(false)}
          submitLabel="全部新增"
        />
      )}

      {moveTarget && (
        <BatchTableForm
          title={`搬家：${moveTarget.name}`}
          columns={[
            { key: "field_id", label: "新場域", type: "select", required: true, options: fields.map((f) => ({ value: f.id, label: f.name })) },
            { key: "note", label: "備註", width: 200 },
          ]}
          onSubmit={handleMove}
          onClose={() => setMoveTarget(null)}
          submitLabel="確認搬家"
        />
      )}

      {sellTarget && (
        <BatchTableForm
          title={`出售：${sellTarget.name}`}
          columns={[
            { key: "sale_price", label: "售價", type: "number", required: true, width: 100 },
            { key: "sale_date", label: "出售日期", type: "date", width: 150 },
            { key: "note", label: "備註", width: 200 },
          ]}
          onSubmit={handleSell}
          onClose={() => setSellTarget(null)}
          submitLabel="確認出售"
        />
      )}
    </div>
  );
}
