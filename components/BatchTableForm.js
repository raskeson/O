"use client";
import { useState } from "react";

/**
 * 通用表格式輸入視窗。
 * columns: [{ key, label, type: 'text'|'number'|'date'|'select'|'textarea', options?: [{value,label}] , width?, required? }]
 * initialRows: 預設列（可留空陣列，使用者自行按「新增一列」）
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
    cols.forEach((c) => (r[c.key] = c.type === "number" ? "" : ""));
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl mt-8 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg text-leaf-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="overflow-x-auto border border-leaf-100 rounded-xl">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} style={{ minWidth: c.width || 120 }}>
                    {c.label}
                    {c.required && <span className="text-red-500">*</span>}
                  </th>
                ))}
                <th style={{ minWidth: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      <Cell col={c} value={row[c.key]} onChange={(v) => updateCell(idx, c.key, v)} />
                    </td>
                  ))}
                  <td>
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="移除此列"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-3">
          <button onClick={addRow} className="btn-secondary text-sm">
            ＋ 新增一列
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
        rows={1}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={col.placeholder}
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
      step={col.type === "number" ? "any" : undefined}
    />
  );
}
