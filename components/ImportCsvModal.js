"use client";
import { useState } from "react";
import Papa from "papaparse";

/**
 * 通用 CSV 匯入視窗。
 * templateColumns: string[] - CSV 應包含的欄位名稱（會用來產生範本與提示）
 * exampleRow: string[] (選填) - 範本 CSV 裡的示範資料列，跟 templateColumns 對應
 * onImport(rows): async function，rows 是 { [欄位]: 字串 } 的陣列，回傳 { message } 顯示匯入結果
 */
export default function ImportCsvModal({ title, templateColumns, exampleRow, onImport, onClose }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [parseError, setParseError] = useState("");

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setParseError("");
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => setRows(res.data),
      error: (err) => setParseError("讀取 CSV 失敗：" + err.message),
    });
  }

  function downloadTemplate() {
    const header = templateColumns.join(",");
    const example = exampleRow ? exampleRow.join(",") : "";
    const csv = "\uFEFF" + [header, example].filter(Boolean).join("\n"); // 加 BOM 讓 Excel 開啟中文不亂碼
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}-範本.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportClick() {
    if (!rows?.length) return;
    setImporting(true);
    try {
      const res = await onImport(rows);
      setResult(res || { message: "匯入完成。" });
    } catch (err) {
      setResult({ message: "匯入失敗：" + err.message, error: true });
    } finally {
      setImporting(false);
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

        <div className="text-xs text-gray-500 mb-2">CSV 第一列須為欄位名稱，建議包含：{templateColumns.join("、")}</div>
        <button onClick={downloadTemplate} className="btn-secondary text-xs mb-3">
          📄 下載空白範本 CSV
        </button>

        <input type="file" accept=".csv" onChange={handleFile} className="text-sm mb-3 block" />

        {parseError && <div className="text-sm text-red-600 mb-3">{parseError}</div>}

        {rows && !parseError && (
          <div className="text-sm text-leaf-700 mb-3">
            已讀取「{fileName}」，共 {rows.length} 筆資料，按下方按鈕確認匯入。
          </div>
        )}

        {result && (
          <div className={`text-sm border rounded-lg p-2 mb-3 ${result.error ? "bg-red-50 border-red-200 text-red-700" : "bg-leaf-50 border-leaf-200 text-leaf-800"}`}>
            {result.message}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-sm">
            關閉
          </button>
          <button onClick={handleImportClick} disabled={!rows?.length || importing} className="btn-primary text-sm">
            {importing ? "匯入中..." : `確認匯入 ${rows?.length || 0} 筆`}
          </button>
        </div>
      </div>
    </div>
  );
}
