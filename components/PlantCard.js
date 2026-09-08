"use client";
import Link from "next/link";
import { speciesLabel, potSizeLabel, waterUrgency, formatMoney } from "@/lib/utils";

const urgencyColor = {
  overdue: "bg-red-100 text-red-700",
  today: "bg-amber-100 text-amber-700",
  ok: "bg-leaf-50 text-leaf-700",
  done: "bg-leaf-100 text-leaf-700",
  none: "bg-gray-100 text-gray-500",
};

const statusColor = {
  alive: "bg-leaf-100 text-leaf-800",
  sold: "bg-blue-100 text-blue-700",
  dead: "bg-gray-200 text-gray-600",
};
const statusLabel = { alive: "健在", sold: "已售出", dead: "已死亡" };

export default function PlantCard({ plant, fieldName, coverPhoto, onMove, onSell, onDeath, onDelete }) {
  const urgency = waterUrgency(plant);
  return (
    <div className="card flex flex-col gap-2">
      <div className="flex gap-3">
        <div className="w-20 h-20 rounded-xl bg-leaf-50 overflow-hidden flex-shrink-0 border border-leaf-100">
          {coverPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPhoto} alt={plant.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">🌱</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/plants/${plant.id}`} className="font-semibold text-leaf-900 hover:underline truncate">
              {plant.name}
            </Link>
            <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor[plant.status] || ""}`}>
              {statusLabel[plant.status] || plant.status}
            </span>
            {plant.tag_uid && (
              <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-gray-100 text-gray-500">{plant.tag_uid}</span>
            )}
          </div>
          <div className="text-xs text-gray-500 truncate">{speciesLabel(plant)}</div>
          <div className="text-xs text-gray-500">場域：{fieldName || "未設定"}</div>
          {plant.seller && <div className="text-xs text-gray-500">賣家/來源：{plant.seller}</div>}
          <div className="text-xs text-gray-500">盆栽：{potSizeLabel(plant)}</div>
          <div className="text-xs text-gray-700 mt-0.5">
            購入 {formatMoney(plant.cost)}　市價 {formatMoney(plant.estimated_value)}
          </div>
        </div>
      </div>

      {plant.status === "alive" && (
        <div className={`text-xs px-2 py-1 rounded-lg w-fit ${urgencyColor[urgency.level]}`}>
          💧 {urgency.label}
          {plant.care_note ? <span className="ml-1 opacity-70">・{plant.care_note}</span> : null}
        </div>
      )}

      {plant.status === "sold" && (
        <div className="text-xs px-2 py-1 rounded-lg w-fit bg-blue-50 text-blue-700">
          已於 {plant.sale_date} 售出 {formatMoney(plant.sale_price)}
        </div>
      )}

      {plant.status === "dead" && (
        <div className="text-xs px-2 py-1 rounded-lg w-fit bg-gray-100 text-gray-500">
          🥀 已標記死亡{plant.death_reason ? `・原因：${plant.death_reason}` : ""}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-1">
        <Link href={`/plants/${plant.id}`} className="btn-secondary text-xs px-2 py-1">
          詳情/相簿/血統
        </Link>
        {plant.status === "alive" && (
          <>
            <button onClick={() => onMove(plant)} className="btn-secondary text-xs px-2 py-1">
              🚚 搬家
            </button>
            <button onClick={() => onSell(plant)} className="btn-secondary text-xs px-2 py-1">
              💰 出售
            </button>
            <button onClick={() => onDeath(plant)} className="btn-secondary text-xs px-2 py-1">
              🥀 死亡
            </button>
          </>
        )}
        <button onClick={() => onDelete(plant)} className="btn-danger text-xs px-2 py-1">
          🗑 刪除
        </button>
      </div>
    </div>
  );
}
