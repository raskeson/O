"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FINANCE_TYPES } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";
import BatchTableForm from "@/components/BatchTableForm";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function FinancePage() {
  const [entries, setEntries] = useState([]);
  const [plants, setPlants] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    const [{ data: e }, { data: p }, { data: inv }] = await Promise.all([
      supabase.from("finance_entries").select("*").order("entry_date", { ascending: false }),
      supabase.from("plants").select("id,name"),
      supabase.from("inventory_items").select("qty,price"),
    ]);
    setEntries(e || []);
    setPlants(p || []);
    setInventoryItems(inv || []);
  }

  const inventoryValue = useMemo(
    () => inventoryItems.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0),
    [inventoryItems]
  );
  useEffect(() => {
    load();
  }, []);

  const plantMap = Object.fromEntries(plants.map((p) => [p.id, p.name]));

  const summary = useMemo(() => {
    const s = { purchase: 0, sale: 0, expense: 0, income: 0 };
    entries.forEach((e) => (s[e.type] = (s[e.type] || 0) + Number(e.amount)));
    const profit = s.sale + s.income - s.purchase - s.expense;
    return { ...s, profit };
  }, [entries]);

  const monthlyChart = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const month = (e.entry_date || "").slice(0, 7);
      if (!month) return;
      if (!map[month]) map[month] = { month, 收入: 0, 支出: 0 };
      if (e.type === "sale" || e.type === "income") map[month].收入 += Number(e.amount);
      else map[month].支出 += Number(e.amount);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [entries]);

  const columns = [
    { key: "type", label: "類型", type: "select", required: true, options: FINANCE_TYPES, width: 110 },
    { key: "plant_id", label: "關聯植物（選填）", type: "select", options: plants.map((p) => ({ value: p.id, label: p.name })), width: 140 },
    { key: "amount", label: "金額", type: "number", required: true, width: 100 },
    { key: "category", label: "分類/項目", width: 140 },
    { key: "entry_date", label: "日期", type: "date", width: 150 },
    { key: "note", label: "備註", width: 180 },
  ];

  async function handleAdd(rows) {
    const payload = rows
      .filter((r) => r.type && r.amount)
      .map((r) => ({
        type: r.type,
        plant_id: r.plant_id || null,
        amount: Number(r.amount),
        category: r.category || null,
        entry_date: r.entry_date || new Date().toISOString().slice(0, 10),
        note: r.note || null,
      }));
    if (!payload.length) return;
    await supabase.from("finance_entries").insert(payload);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("確定刪除這筆紀錄？")) return;
    await supabase.from("finance_entries").delete().eq("id", id);
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-leaf-900">財務總帳</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          ＋ 新增紀錄（表格批次輸入）
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="購入成本" value={formatMoney(summary.purchase)} />
        <Stat label="出售收入" value={formatMoney(summary.sale)} />
        <Stat label="其他支出" value={formatMoney(summary.expense)} />
        <Stat label="其他收入" value={formatMoney(summary.income)} />
        <Stat label="已實現純利" value={formatMoney(summary.profit)} highlight={summary.profit >= 0 ? "pos" : "neg"} />
        <Stat label="資材庫存價值（計入成本）" value={formatMoney(inventoryValue)} />
      </div>

      <div className="card">
        <h2 className="font-bold text-leaf-900 mb-2">每月收支</h2>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="收入" fill="#5a9147" />
              <Bar dataKey="支出" fill="#c4884f" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h2 className="font-bold text-leaf-900 mb-2">明細</h2>
        {entries.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {entries.map((e) => {
              const isIncome = e.type === "sale" || e.type === "income";
              return (
                <div key={e.id} className="card flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isIncome ? "bg-leaf-100 text-leaf-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {FINANCE_TYPES.find((t) => t.value === e.type)?.label || e.type}
                    </span>
                    <span className={`font-bold ${isIncome ? "text-leaf-700" : "text-gray-700"}`}>
                      {isIncome ? "+" : "-"}
                      {formatMoney(e.amount)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">{e.entry_date}</div>
                  {e.plant_id && <div className="text-xs text-gray-600">🌱 {plantMap[e.plant_id] || "-"}</div>}
                  {e.category && <div className="text-xs text-gray-600">分類：{e.category}</div>}
                  {e.note && <div className="text-xs text-gray-500">{e.note}</div>}
                  <button
                    className="text-red-500 text-xs mt-1 self-end hover:underline"
                    onClick={() => handleDelete(e.id)}
                  >
                    刪除
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card text-center text-gray-400 py-3">尚無資料</div>
        )}
      </div>

      {showAdd && (
        <BatchTableForm
          title="新增財務紀錄"
          columns={columns}
          onSubmit={handleAdd}
          onClose={() => setShowAdd(false)}
          submitLabel="全部新增"
        />
      )}
    </div>
  );
}

function Stat({ label, value, highlight }) {
  const color = highlight === "pos" ? "text-leaf-700" : highlight === "neg" ? "text-red-600" : "text-leaf-900";
  return (
    <div className="card">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`font-bold text-lg ${color}`}>{value}</div>
    </div>
  );
}
