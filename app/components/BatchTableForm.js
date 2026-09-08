"use client";
import { useState } from "react";

/**
 * 通用表格式輸入視窗（直式卡片版）。
 * columns: [{ key, label, type: 'text'|'number'|'date'|'select'|'textarea', options?: [{value,label}],
 *             required?, allowNegative?, placeholder? }]
 * initialRows: 預設列（可留空陣列，使用者自行按「新增一筆」）
 * onSubmit(rows) : 送出時呼叫，rows 為使用者填好的陣列
 */
export default function BatchTableForm({
  title,
  columns,
  initialRows = [],
  onSubmit,
  onClose,
  submitLabel = "儲存",
  emptyRow,
}) {
  const [rows, setRows] = useState(initialRows.length ? initialRows : [emptyRow ? emptyRow() : blankRow(columns)]);
  const [saving, setSaving] = useState(false);

  function blankRow(cols) {
    const r = {};
    cols.forEach((c) => (r[c.key] = ""));
    return r;
  }

  function updateCell(idx, key, value) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow ? emptyRow() : blankRow(columns)]);
  }

  function removeRow(idx) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSubmit(rows);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mt-8 mb-8 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg text-leaf-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-3 max-h-[65vh] overflow-y-auto pr-1">
          {rows.map((row, idx) => (
            <div key={idx} className="border border-leaf-100 rounded-xl p-3 bg-leaf-50/40">
              {rows.length > 1 && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-leaf-700">第 {idx + 1} 筆</span>
                  <button
                    onClick={() => removeRow(idx)}
                    className="text-red-500 hover:text-red-700 text-xs"
                    title="移除此筆"
                  >
                    ✕ 移除
                  </button>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {columns.map((c) => (
                  <label key={c.key} className="flex flex-col gap-1 text-xs text-gray-600">
                    <span>
                      {c.label}
                      {c.required && <span className="text-red-500">*</span>}
                    </span>
                    <Cell col={c} value={row[c.key]} onChange={(v) => updateCell(idx, c.key, v)} />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-3">
          <button onClick={addRow} className="btn-secondary text-sm">
            ＋ 新增一筆
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">
              取消
            </button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary text-sm">
              {saving ? "儲存中..." : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({ col, value, onChange }) {
  if (col.type === "select") {
    return (
      <select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">請選擇</option>
        {col.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (col.type === "textarea") {
    return (
      <textarea
        className="input"
        rows={2}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={col.placeholder}
      />
    );
  }
  if (col.type === "number") {
    return (
      <input
        className="input"
        type="number"
        value={value ?? ""}
        min={col.allowNegative ? undefined : 0}
        onChange={(e) => {
          let v = e.target.value;
          if (!col.allowNegative) v = v.replace(/-/g, "");
          onChange(v);
        }}
        placeholder={col.placeholder}
        step="any"
      />
    );
  }
  return (
    <input
      className="input"
      type={col.type || "text"}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={col.placeholder}
    />
  );
}
