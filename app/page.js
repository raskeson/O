"use client";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { SPECIES_OPTIONS, POT_UNITS, PLANT_STATUS, ACQUISITION_TYPES, ALIVE_STATUSES } from "@/lib/constants";
import PlantCard from "@/components/PlantCard";
import BatchTableForm from "@/components/BatchTableForm";
import ImportCsvModal from "@/components/ImportCsvModal";
import { formatMoney, waterUrgency, speciesLabel } from "@/lib/utils";

export default function Dashboard() {
  const [plants, setPlants] = useState([]);
  const [fields, setFields] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [covers, setCovers] = useState({});
  const [financeEntries, setFinanceEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAddSeller, setShowAddSeller] = useState(false);
  const [showImportSellers, setShowImportSellers] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null);
  const [sellTarget, setSellTarget] = useState(null);
  const [filterField, setFilterField] = useState("");
  const [filterSpecies, setFilterSpecies] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("alive");
  const [sellerFilter, setSellerFilter] = useState("");
  const [search, setSearch] = useState("");
  const [configError, setConfigError] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [{ data: p, error: pe }, { data: f }, { data: fin }, { data: sl }] = await Promise.all([
      supabase.from("plants").select("*").order("created_at", { ascending: false }),
      supabase.from("fields").select("*"),
      supabase.from("finance_entries").select("type,amount"),
      supabase.from("sellers").select("*").order("name"),
    ]);
    if (pe) setConfigError(true);
    setPlants(p || []);
    setFields(f || []);
    setFinanceEntries(fin || []);
    setSellers(sl || []);
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

  // 種類選單：用「顯示用的種類」去重（自訂種類會顯示自訂名稱而非「其他（自訂）」）
  const speciesList = useMemo(() => {
    const set = new Set(plants.map((p) => speciesLabel(p)));
    return [...set].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  }, [plants]);

  // 分類選單：跟「種類」分開的細分類欄位（例如鹿角蕨的親本分類 willinckii/veitchii）
  const categoryList = useMemo(() => {
    const set = new Set(plants.map((p) => p.category).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  }, [plants]);

  // 今天該澆水（含已逾期）的健在植株
  const dueToWater = useMemo(
    () => plants.filter((p) => ALIVE_STATUSES.includes(p.status) && ["overdue", "today"].includes(waterUrgency(p).level)),
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
    const alive = plants.filter((p) => ALIVE_STATUSES.includes(p.status));
    const dead = plants.filter((p) => p.status === "dead");
    const totalInvested = alive.reduce((s, p) => s + (Number(p.cost) || 0), 0);
    const totalMarketValue = alive.reduce((s, p) => s + (Number(p.estimated_value) || 0), 0);
    const s = { purchase: 0, sale: 0, expense: 0, income: 0 };
    financeEntries.forEach((e) => (s[e.type] = (s[e.type] || 0) + Number(e.amount)));
    const realizedProfit = s.sale + s.income - s.purchase - s.expense;
    return { totalInvested, totalMarketValue, realizedProfit, aliveCount: alive.length, deadCount: dead.length };
  }, [plants, financeEntries]);

  const filtered = plants.filter((p) => {
    if (filterField && p.field_id !== filterField) return false;
    if (filterSpecies && speciesLabel(p) !== filterSpecies) return false;
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (sellerFilter && p.seller !== sellerFilter) return false;
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
    { key: "category", label: "分類（選填，如鹿角蕨的原種分類 willinckii/veitchii）", width: 140 },
    { key: "parentage", label: "親本（選填，如雜交組合 willinckii × veitchii）", width: 180 },
    {
      key: "acquisition_type",
      label: "來源類型（選填）",
      type: "select",
      options: ACQUISITION_TYPES.map((t) => ({ value: t, label: t })),
      width: 110,
    },
    { key: "field_id", label: "場域", type: "select", options: fields.map((f) => ({ value: f.id, label: f.name })), width: 140 },
    {
      key: "seller",
      label: sellers.length ? "賣家/來源（如清單沒有，先按上方「＋新增賣家」）" : "賣家/來源（尚未建立賣家，請先按上方「＋新增賣家」）",
      type: "select",
      options: sellers.map((s) => ({ value: s.name, label: s.name })),
      width: 140,
    },
    { key: "acquired_date", label: "取得日期", type: "date", width: 150 },
    { key: "cost", label: "購入成本", type: "number", width: 100 },
    { key: "pot_diameter", label: "盆徑", type: "number", width: 90 },
    { key: "pot_unit", label: "單位", type: "select", options: POT_UNITS.map((u) => ({ value: u, label: u })), width: 90 },
    { key: "water_frequency_days", label: "澆水頻率(天)", type: "number", width: 110 },
    { key: "care_note", label: "性質備註(如：乾/耐旱)", width: 160 },
    { key: "estimated_value", label: "估計市價", type: "number", width: 100 },
  ];

  async function insertPlantsAndFinance(payload) {
    if (!payload.length) return { message: "沒有可匯入的資料（請確認名稱欄位不是空的）。", error: true, count: 0 };
    const { data, error } = await supabase.from("plants").insert(payload).select();
    if (error) {
      return { message: "新增失敗：" + error.message, error: true, count: 0 };
    }
    const created = data || [];
    // 自動把出現過的賣家加入賣家清單，之後可在「依賣家查看」用到（比照資材庫存的作法）
    const sellerNames = [...new Set(created.map((p) => p.seller).filter(Boolean))];
    if (sellerNames.length) {
      await supabase.from("sellers").upsert(
        sellerNames.map((name) => ({ name })),
        { onConflict: "name", ignoreDuplicates: true }
      );
    }
    // 有成本則同步寫入財務總帳
    const financeRows = (data || [])
      .filter((p) => p.cost)
      .map((p) => ({ type: "purchase", plant_id: p.id, amount: p.cost, category: "購入成本", entry_date: p.acquired_date || new Date().toISOString().slice(0, 10) }));
    if (financeRows.length) await supabase.from("finance_entries").insert(financeRows);
    loadAll();
    return { count: data?.length || 0, financeCount: financeRows.length };
  }

  async function handleAddPlants(rows) {
    const payload = rows
      .filter((r) => r.name)
      .map((r) => ({
        name: r.name,
        tag_uid: r.tag_uid || null,
        species: r.species || null,
        custom_species: r.custom_species || null,
        category: r.category || null,
        parentage: r.parentage || null,
        acquisition_type: r.acquisition_type || null,
        field_id: r.field_id || null,
        seller: r.seller || null,
        acquired_date: r.acquired_date || null,
        cost: r.cost ? Number(r.cost) : 0,
        pot_diameter: r.pot_diameter ? Number(r.pot_diameter) : null,
        pot_unit: r.pot_unit || "cm",
        water_frequency_days: r.water_frequency_days ? Number(r.water_frequency_days) : null,
        care_note: r.care_note || null,
        estimated_value: r.estimated_value ? Number(r.estimated_value) : 0,
        status: "alive",
      }));
    const res = await insertPlantsAndFinance(payload);
    if (res.error) alert(res.message);
  }

  const importColumns = [
    "name", "tag_uid", "species", "custom_species", "category", "parentage", "acquisition_type", "field_name", "seller", "acquired_date",
    "cost", "estimated_value", "pot_diameter", "pot_unit", "water_frequency_days",
    "care_note", "status", "notes",
  ];
  const importExample = [
    "薄荷", "", "香草類", "", "", "", "買入", "後陽台", "丁（旋轉花市）", "2026-01-15",
    "60", "80", "5", "吋", "3",
    "喜濕", "alive", "",
  ];

  async function handleImportPlants(csvRows) {
    const fieldByName = new Map(fields.map((f) => [f.name.trim().toLowerCase(), f.id]));
    let unmatchedField = 0;
    const payload = csvRows
      .filter((r) => r.name && r.name.trim())
      .map((r) => {
        let fieldId = null;
        if (r.field_name && r.field_name.trim()) {
          fieldId = fieldByName.get(r.field_name.trim().toLowerCase()) || null;
          if (!fieldId) unmatchedField += 1;
        }
        const status = ["alive", "weak", "sold", "dead"].includes((r.status || "").trim()) ? r.status.trim() : "alive";
        return {
          name: r.name.trim(),
          tag_uid: r.tag_uid?.trim() || null,
          species: r.species?.trim() || null,
          custom_species: r.custom_species?.trim() || null,
          category: r.category?.trim() || null,
          parentage: r.parentage?.trim() || null,
          acquisition_type: r.acquisition_type?.trim() || null,
          field_id: fieldId,
          seller: r.seller?.trim() || null,
          acquired_date: r.acquired_date?.trim() || null,
          cost: r.cost ? Number(r.cost) || 0 : 0,
          estimated_value: r.estimated_value ? Number(r.estimated_value) || 0 : 0,
          pot_diameter: r.pot_diameter ? Number(r.pot_diameter) || null : null,
          pot_unit: r.pot_unit?.trim() || "cm",
          water_frequency_days: r.water_frequency_days ? Number(r.water_frequency_days) || null : null,
          care_note: r.care_note?.trim() || null,
          status,
          notes: r.notes?.trim() || null,
        };
      });
    const res = await insertPlantsAndFinance(payload);
    if (res.error) return res;
    let message = `成功匯入 ${res.count} 株植物`;
    if (res.financeCount) message += `，其中 ${res.financeCount} 筆有購入成本，已同步記入財務總帳`;
    if (unmatchedField) message += `。有 ${unmatchedField} 筆的「場域」名稱在系統裡找不到對應場域，已設為未設定，之後可以用「搬家」功能手動指定`;
    return { message: message + "。" };
  }

  async function handleAddSeller(rows) {
    const payload = rows.filter((r) => r.name).map((r) => ({ name: r.name, notes: r.notes || null }));
    if (!payload.length) return;
    const { error } = await supabase.from("sellers").upsert(payload, { onConflict: "name" });
    if (error) {
      alert("新增賣家失敗：" + error.message);
      return;
    }
    loadAll();
  }

  const sellerImportColumns = ["name", "notes"];
  const sellerImportExample = ["南屯花市", "較貴、品種多"];

  async function handleImportSellers(csvRows) {
    const payload = csvRows
      .filter((r) => r.name && r.name.trim())
      .map((r) => ({ name: r.name.trim(), notes: r.notes?.trim() || null }));
    if (!payload.length) return { message: "沒有可匯入的資料（請確認名稱欄位不是空的）。", error: true };
    const { error } = await supabase.from("sellers").upsert(payload, { onConflict: "name" });
    if (error) return { message: "匯入賣家失敗：" + error.message, error: true };
    loadAll();
    return { message: `成功匯入/更新 ${payload.length} 位賣家。` };
  }

  async function handleDeleteSeller(seller) {
    if (!confirm(`確定刪除賣家「${seller.name}」？（已使用此賣家的植物紀錄不會被刪除）`)) return;
    await supabase.from("sellers").delete().eq("id", seller.id);
    if (sellerFilter === seller.name) setSellerFilter("");
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

  const [deathTarget, setDeathTarget] = useState(null);

  async function handleMarkDead(rows) {
    const row = rows[0];
    await supabase.from("plants").update({ status: "dead", death_reason: row.death_reason || null }).eq("id", deathTarget.id);
    await supabase.from("plant_events").insert({ plant_id: deathTarget.id, type: "death", note: row.death_reason || null });
    setDeathTarget(null);
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
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            📥 匯入 CSV
          </button>
          <button className="btn-secondary" onClick={() => setShowAddSeller(true)}>
            ＋ 新增賣家
          </button>
          <button className="btn-secondary" onClick={() => setShowImportSellers(true)}>
            📥 匯入賣家 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <div className="card">
          <div className="text-xs text-gray-500">目前在庫（不含死亡）</div>
          <div className="font-bold text-lg text-leaf-900">{summary.aliveCount} 盆</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500">死傷數量</div>
          <div className="font-bold text-lg text-red-600">{summary.deadCount} 盆</div>
        </div>
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
        <select className="input w-36" value={filterSpecies} onChange={(e) => setFilterSpecies(e.target.value)}>
          <option value="">所有種類</option>
          {speciesList.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="input w-36" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">所有分類</option>
          {categoryList.map((c) => (
            <option key={c} value={c}>
              {c}
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
        <select className="input w-40" value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)}>
          <option value="">所有賣家/來源</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        {sellerFilter && (
          <button
            className="text-red-500 text-xs"
            onClick={() => {
              const s = sellers.find((x) => x.name === sellerFilter);
              if (s) handleDeleteSeller(s);
            }}
          >
            🗑 刪除此賣家
          </button>
        )}
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
              onDeath={setDeathTarget}
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

      {deathTarget && (
        <BatchTableForm
          title={`標記死亡：${deathTarget.name}`}
          columns={[{ key: "death_reason", label: "死亡原因（選填，會直接顯示在卡片上）", type: "textarea", width: 220 }]}
          onSubmit={handleMarkDead}
          onClose={() => setDeathTarget(null)}
          submitLabel="確認標記死亡"
        />
      )}

      {showImport && (
        <ImportCsvModal
          title="匯入植物 CSV"
          templateColumns={importColumns}
          exampleRow={importExample}
          onImport={handleImportPlants}
          onClose={() => setShowImport(false)}
        />
      )}

      {showAddSeller && (
        <BatchTableForm
          title="新增/更新賣家（同名會更新備註）"
          columns={[
            { key: "name", label: "賣家名稱", required: true, width: 140 },
            { key: "notes", label: "備註（例如：CP值低、出貨快）", type: "textarea", width: 200 },
          ]}
          onSubmit={handleAddSeller}
          onClose={() => setShowAddSeller(false)}
          submitLabel="全部儲存"
        />
      )}

      {showImportSellers && (
        <ImportCsvModal
          title="匯入賣家 CSV"
          templateColumns={sellerImportColumns}
          exampleRow={sellerImportExample}
          onImport={handleImportSellers}
          onClose={() => setShowImportSellers(false)}
        />
      )}
    </div>
  );
}
