"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import BatchTableForm from "@/components/BatchTableForm";
import { formatMoney, potVolumeLiters } from "@/lib/utils";
import { POT_UNITS } from "@/lib/constants";

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [ferts, setFerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddFert, setShowAddFert] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [showConvert, setShowConvert] = useState(false);
  const [sortBy, setSortBy] = useState("recent"); // recent | rating

  async function load() {
    const [{ data: it }, { data: fz }, { data: lg }] = await Promise.all([
      supabase.from("inventory_items").select("*").order("created_at", { ascending: false }),
      supabase.from("fertilizers").select("*").order("created_at", { ascending: false }),
      supabase.from("inventory_logs").select("*, inventory_items(name)").order("created_at", { ascending: false }).limit(20),
    ]);
    setItems(it || []);
    setFerts(fz || []);
    setLogs(lg || []);
  }
  useEffect(() => {
    load();
  }, []);

  const itemColumns = [
    { key: "name", label: "資材名稱", required: true, width: 140 },
    { key: "category", label: "分類", width: 100 },
    { key: "qty", label: "目前庫存量", type: "number", width: 100 },
    { key: "unit", label: "單位", width: 80 },
    { key: "seller", label: "購買處/賣家", width: 140 },
    { key: "price", label: "單價", type: "number", width: 90 },
    { key: "rating", label: "賣家評分(1-5)", type: "number", width: 100 },
    { key: "notes", label: "備註", width: 160 },
  ];

  async function handleAddItem(rows) {
    const payload = rows
      .filter((r) => r.name)
      .map((r) => ({
        name: r.name,
        category: r.category || null,
        qty: r.qty ? Number(r.qty) : 0,
        unit: r.unit || "個",
        seller: r.seller || null,
        price: r.price ? Number(r.price) : null,
        rating: r.rating ? Number(r.rating) : null,
        notes: r.notes || null,
      }));
    if (!payload.length) return;
    const { data: created, error } = await supabase.from("inventory_items").insert(payload).select();
    if (error) {
      alert("新增資材失敗：" + error.message);
      return;
    }
    // 有單價與數量的話，直接把這筆採購併入財務總帳的「其他支出」
    const financeRows = (created || [])
      .filter((it) => Number(it.qty) > 0 && Number(it.price) > 0)
      .map((it) => ({
        type: "expense",
        amount: Number(it.qty) * Number(it.price),
        category: "資材採購",
        note: `${it.name}（${it.qty}${it.unit} × ${formatMoney(it.price)}）`,
        entry_date: new Date().toISOString().slice(0, 10),
      }));
    if (financeRows.length) {
      const { error: financeError } = await supabase.from("finance_entries").insert(financeRows);
      if (financeError) alert("資材已新增，但自動記帳失敗：" + financeError.message);
    }
    load();
  }

  async function handleDeleteItem(item) {
    if (!confirm(`確定刪除資材「${item.name}」？`)) return;
    await supabase.from("inventory_items").delete().eq("id", item.id);
    load();
  }

  async function handleAdjust(rows) {
    const row = rows[0];
    const delta = Number(row.delta);
    if (!delta) return;
    const item = adjustTarget;
    const { error: qtyError } = await supabase.from("inventory_items").update({ qty: Number(item.qty) + delta }).eq("id", item.id);
    if (qtyError) {
      alert("調整庫存失敗：" + qtyError.message);
      return;
    }
    await supabase.from("inventory_logs").insert({ item_id: item.id, delta, reason: row.reason || "手動調整" });
    // 入庫且有單價時，這筆補貨也算一筆支出，併入財務總帳
    if (delta > 0 && Number(item.price) > 0) {
      const { error: financeError } = await supabase.from("finance_entries").insert({
        type: "expense",
        amount: delta * Number(item.price),
        category: "資材採購",
        note: `${item.name} 補貨（${delta}${item.unit} × ${formatMoney(item.price)}）`,
        entry_date: new Date().toISOString().slice(0, 10),
      });
      if (financeError) alert("庫存已調整，但自動記帳失敗：" + financeError.message);
    }
    setAdjustTarget(null);
    load();
  }

  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
    return 0; // 已經是依 created_at desc 從資料庫拿出來的
  });

  // 換盆規格轉換：例如「10盆 1吋 換 6吋盆」，自動扣減對應數量的盆器，
  // 以及依盆器體積差換算出的介質用量（公升，向上取整方便對照庫存單位）
  async function handleConvert(rows) {
    const row = rows[0];
    const qty = Number(row.qty);
    const potItem = items.find((i) => i.id === row.pot_item_id);
    const mediumItem = items.find((i) => i.id === row.medium_item_id);
    if (!qty || !potItem) {
      alert("請填寫數量並選擇對應的盆器資材");
      return;
    }
    const newVol = potVolumeLiters(row.new_diameter, row.new_unit || "cm");
    const oldVol = row.old_diameter ? potVolumeLiters(row.old_diameter, row.old_unit || "cm") : 0;
    const mediumPerPot = Math.max(newVol - oldVol, 0);
    const mediumTotal = Math.round(mediumPerPot * qty * 10) / 10;

    await supabase.from("inventory_items").update({ qty: Number(potItem.qty) - qty }).eq("id", potItem.id);
    await supabase.from("inventory_logs").insert({
      item_id: potItem.id,
      delta: -qty,
      reason: `換盆轉換：${qty} 盆${row.old_diameter ? `（${row.old_diameter}${row.old_unit || "cm"}→` : "（→"}${row.new_diameter}${row.new_unit || "cm"}）`,
    });

    if (mediumItem && mediumTotal > 0) {
      await supabase.from("inventory_items").update({ qty: Number(mediumItem.qty) - mediumTotal }).eq("id", mediumItem.id);
      await supabase.from("inventory_logs").insert({
        item_id: mediumItem.id,
        delta: -mediumTotal,
        reason: `換盆轉換：${qty} 盆換至 ${row.new_diameter}${row.new_unit || "cm"} 所需介質（約估）`,
      });
    }
    setShowConvert(false);
    load();
  }

  const fertColumns = [
    { key: "name", label: "肥料名稱", required: true, width: 140 },
    { key: "npk", label: "肥料比例(N-P-K)", width: 120 },
    { key: "notes", label: "備註/用法", width: 200 },
  ];

  async function handleAddFert(rows) {
    const payload = rows.filter((r) => r.name).map((r) => ({ name: r.name, npk: r.npk || null, notes: r.notes || null }));
    if (!payload.length) return;
    await supabase.from("fertilizers").insert(payload);
    load();
  }

  async function handleDeleteFert(f) {
    if (!confirm(`確定刪除肥料「${f.name}」？`)) return;
    await supabase.from("fertilizers").delete().eq("id", f.id);
    load();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-leaf-900">資材庫存與賣家比價</h1>
          <p className="text-xs text-gray-500 mt-0.5">新增資材時若有填「數量」與「單價」，會自動記一筆支出到財務總帳；補貨（調整庫存為正數）同樣會自動入帳。</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-secondary" onClick={() => setShowConvert(true)}>
            🔁 換盆規格轉換
          </button>
          <button className="btn-primary" onClick={() => setShowAddItem(true)}>
            ＋ 新增資材（表格批次輸入）
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">排序：</span>
        <select className="input w-40" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="recent">最近新增</option>
          <option value="rating">賣家評分（高→低）</option>
        </select>
      </div>

      {sortedItems.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedItems.map((it) => (
            <div key={it.id} className="card flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <div className="font-semibold text-leaf-900">{it.name}</div>
                {it.rating ? <span className="text-amber-500 text-sm">{"⭐".repeat(it.rating)}</span> : null}
              </div>
              {it.category && <div className="text-xs text-gray-500">分類：{it.category}</div>}
              <div className="text-sm font-medium text-leaf-800">
                庫存：{it.qty} {it.unit}
              </div>
              {it.seller && <div className="text-xs text-gray-500">賣家：{it.seller}</div>}
              {it.price != null && <div className="text-xs text-gray-500">單價：{formatMoney(it.price)}</div>}
              {it.notes && <div className="text-xs text-gray-500">{it.notes}</div>}
              <div className="flex gap-2 mt-1">
                <button className="btn-secondary text-xs px-2 py-1" onClick={() => setAdjustTarget(it)}>
                  調整庫存
                </button>
                <button className="btn-danger text-xs px-2 py-1" onClick={() => handleDeleteItem(it)}>
                  🗑 刪除
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center text-gray-400 py-3">尚無資材</div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-leaf-900">肥料</h2>
        <button className="btn-secondary" onClick={() => setShowAddFert(true)}>
          ＋ 新增肥料（表格批次輸入）
        </button>
      </div>
      {ferts.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ferts.map((f) => (
            <div key={f.id} className="card flex flex-col gap-1">
              <div className="font-semibold text-leaf-900">{f.name}</div>
              {f.npk && <div className="text-xs text-gray-500">比例：{f.npk}</div>}
              {f.notes && <div className="text-xs text-gray-500">{f.notes}</div>}
              <button className="btn-danger text-xs px-2 py-1 self-end mt-1" onClick={() => handleDeleteFert(f)}>
                🗑 刪除
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center text-gray-400 py-3">尚無肥料</div>
      )}

      <div className="card">
        <h2 className="font-bold text-leaf-900 mb-2">最近庫存異動</h2>
        <div className="text-sm space-y-1">
          {logs.map((l) => (
            <div key={l.id}>
              {new Date(l.created_at).toLocaleString("zh-TW")}・{l.inventory_items?.name}：
              <span className={l.delta > 0 ? "text-leaf-700" : "text-red-600"}>
                {l.delta > 0 ? "+" : ""}
                {l.delta}
              </span>{" "}
              （{l.reason}）
            </div>
          ))}
          {!logs.length && <div className="text-gray-400">尚無紀錄</div>}
        </div>
      </div>

      {showAddItem && (
        <BatchTableForm title="新增資材" columns={itemColumns} onSubmit={handleAddItem} onClose={() => setShowAddItem(false)} submitLabel="全部新增" />
      )}
      {showAddFert && (
        <BatchTableForm title="新增肥料" columns={fertColumns} onSubmit={handleAddFert} onClose={() => setShowAddFert(false)} submitLabel="全部新增" />
      )}
      {adjustTarget && (
        <BatchTableForm
          title={`調整庫存：${adjustTarget.name}（目前 ${adjustTarget.qty} ${adjustTarget.unit}）`}
          columns={[
            { key: "delta", label: "異動量（+入庫 / -扣除）", type: "number", required: true, width: 120, allowNegative: true },
            { key: "reason", label: "原因", width: 200 },
          ]}
          onSubmit={handleAdjust}
          onClose={() => setAdjustTarget(null)}
          submitLabel="確認調整"
        />
      )}
      {showConvert && (
        <BatchTableForm
          title="換盆規格轉換（例如：10 盆 1吋 換 6吋盆，自動扣減盆器與估算介質用量）"
          columns={[
            { key: "qty", label: "換盆數量", type: "number", required: true, width: 90 },
            { key: "old_diameter", label: "原盆徑（選填，用於估算介質差）", type: "number", width: 130 },
            { key: "old_unit", label: "原單位", type: "select", options: POT_UNITS.map((u) => ({ value: u, label: u })), width: 90 },
            { key: "new_diameter", label: "新盆徑", type: "number", required: true, width: 100 },
            { key: "new_unit", label: "新單位", type: "select", options: POT_UNITS.map((u) => ({ value: u, label: u })), width: 90 },
            {
              key: "pot_item_id",
              label: "扣減的盆器資材",
              type: "select",
              required: true,
              options: items.map((i) => ({ value: i.id, label: `${i.name}（庫存${i.qty}${i.unit}）` })),
              width: 180,
            },
            {
              key: "medium_item_id",
              label: "扣減的介質資材（選填，單位需為公升）",
              type: "select",
              options: items.map((i) => ({ value: i.id, label: `${i.name}（庫存${i.qty}${i.unit}）` })),
              width: 200,
            },
          ]}
          onSubmit={handleConvert}
          onClose={() => setShowConvert(false)}
          submitLabel="確認轉換並扣庫存"
        />
      )}
    </div>
  );
}
