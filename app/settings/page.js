"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const CONFIRM_PHRASE = "刪除所有資料";
// 刪除密碼：從環境變數讀取，請在 .env.local（或部署平台的環境變數設定）裡設定
// NEXT_PUBLIC_DELETE_PASSWORD=你自訂的密碼
// 注意：因為是純前端專案，這只能擋住不知道密碼的測試者手滑誤刪，
// 不是真正的後端驗證，懂得打開瀏覽器開發者工具看原始碼的人還是看得到密碼，
// 如果資料非常重要，建議另外定期備份。
const DELETE_PASSWORD = process.env.NEXT_PUBLIC_DELETE_PASSWORD || "";

// 依「先刪子表、再刪父表」的順序，把所有資料表清空。
// Supabase 的 delete() 一定要搭配 filter，這裡用「不等於一個不可能出現的值」
// 來達到「刪除全部」的效果（uuid 主鍵用假的 uuid，text 主鍵用不可能出現的字串）。
const IMPOSSIBLE_UUID = "00000000-0000-0000-0000-000000000000";
const TABLES_IN_ORDER = [
  { name: "plant_photos", pk: "id", type: "uuid" },
  { name: "plant_events", pk: "id", type: "uuid" },
  { name: "finance_entries", pk: "id", type: "uuid" },
  { name: "inventory_logs", pk: "id", type: "uuid" },
  { name: "compost_materials", pk: "id", type: "uuid" },
  { name: "plants", pk: "id", type: "uuid" },
  { name: "inventory_items", pk: "id", type: "uuid" },
  { name: "fertilizers", pk: "id", type: "uuid" },
  { name: "compost_bins", pk: "id", type: "uuid" },
  { name: "fields", pk: "id", type: "uuid" },
  { name: "sellers", pk: "id", type: "uuid" },
  { name: "app_settings", pk: "key", type: "text" },
];

export default function SettingsPage() {
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState(null);

  const passwordOk = DELETE_PASSWORD ? password === DELETE_PASSWORD : true;
  const canDelete = confirmText.trim() === CONFIRM_PHRASE && passwordOk;

  async function handleDeleteAll() {
    if (!canDelete) return;
    if (!confirm("真的要刪除全部資料嗎？植物、資材、財務紀錄、賣家、場域等全部都會清空，且無法復原！")) return;
    if (!confirm("再次確認：這是最後一次提醒，按下確定後所有資料將立即永久刪除。")) return;

    setDeleting(true);
    setResult(null);
    const errors = [];
    for (const t of TABLES_IN_ORDER) {
      const filterValue = t.type === "uuid" ? IMPOSSIBLE_UUID : "__never_matches__";
      const { error } = await supabase.from(t.name).delete().neq(t.pk, filterValue);
      if (error) errors.push(`${t.name}：${error.message}`);
    }
    setDeleting(false);
    setConfirmText("");
    setPassword("");
    if (errors.length) {
      setResult({ error: true, message: "部分資料刪除失敗：\n" + errors.join("\n") });
    } else {
      setResult({ error: false, message: "所有資料已刪除完成。" });
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      <h1 className="text-xl font-bold text-leaf-900">系統設定</h1>

      <div className="card border-red-300 bg-red-50">
        <h2 className="font-bold text-red-700 mb-1">⚠️ 危險區：一鍵刪除所有資料</h2>
        <p className="text-sm text-red-700/90 mb-3">
          這會清空植物、照片紀錄、事件歷程、財務總帳、資材庫存與異動紀錄、肥料、堆肥箱與材料、場域、賣家、以及系統設定，
          全部無法復原。請注意：儲存在 Supabase Storage（plant-photos）裡的照片檔案本身不會被刪除，只會刪除資料庫裡的照片紀錄，
          如需一併清空請另外到 Supabase 後台的 Storage 清除。
        </p>
        <label className="block text-sm text-red-700 mb-1">
          請輸入「{CONFIRM_PHRASE}」以啟用刪除按鈕：
        </label>
        <input
          className="input w-full mb-3"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={CONFIRM_PHRASE}
        />

        {DELETE_PASSWORD ? (
          <>
            <label className="block text-sm text-red-700 mb-1">請輸入刪除密碼：</label>
            <input
              className="input w-full mb-3"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密碼"
            />
          </>
        ) : (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
            尚未設定刪除密碼，目前任何人只要打對上面那句話就能刪除全部資料。若要開放給別人測試，
            建議到 .env.local（或部署平台的環境變數）加上 NEXT_PUBLIC_DELETE_PASSWORD=你的密碼，再重新部署。
          </p>
        )}

        <button
          className={`btn-danger ${!canDelete || deleting ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={handleDeleteAll}
          disabled={!canDelete || deleting}
        >
          {deleting ? "刪除中..." : "🗑 永久刪除所有資料"}
        </button>

        {result && (
          <div
            className={`text-sm border rounded-lg p-2 mt-3 whitespace-pre-line ${
              result.error ? "bg-red-100 border-red-300 text-red-800" : "bg-leaf-50 border-leaf-200 text-leaf-800"
            }`}
          >
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
