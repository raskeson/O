"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { SPECIES_OPTIONS, POT_UNITS, PLANT_STATUS } from "@/lib/constants";
import { speciesLabel, potSizeLabel, formatMoney, genTagUid, waterUrgency } from "@/lib/utils";
import PhotoUploader from "@/components/PhotoUploader";
import BatchTableForm from "@/components/BatchTableForm";

export default function PlantDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [plant, setPlant] = useState(null);
  const [fields, setFields] = useState([]);
  const [allPlants, setAllPlants] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [events, setEvents] = useState([]);
  const [invItems, setInvItems] = useState([]);
  const [showRepot, setShowRepot] = useState(false);
  const [showBreed, setShowBreed] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const load = useCallback(async () => {
    const { data: pl } = await supabase.from("plants").select("*").eq("id", id).single();
    setPlant(pl);
    const [{ data: f }, { data: ap }, { data: ph }, { data: ev }, { data: inv }] = await Promise.all([
      supabase.from("fields").select("*"),
      supabase.from("plants").select("id,name").neq("id", id),
      supabase.from("plant_photos").select("*").eq("plant_id", id).order("taken_at", { ascending: false }),
      supabase.from("plant_events").select("*").eq("plant_id", id).order("event_date", { ascending: false }),
      supabase.from("inventory_items").select("*"),
    ]);
    setFields(f || []);
    setAllPlants(ap || []);
    setPhotos(ph || []);
    setEvents(ev || []);
    setInvItems(inv || []);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // 血統：母株/父株 + 由此株生出的子代
  const [children, setChildren] = useState([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("plants")
        .select("id,name")
        .or(`mother_id.eq.${id},father_id.eq.${id},parent_split_from.eq.${id}`);
      setChildren(data || []);
    })();
  }, [id, events]);

  async function handleRepot(rows) {
    const row = rows[0];
    const oldSize = potSizeLabel(plant);
    await supabase
      .from("plants")
      .update({ pot_diameter: Number(row.pot_diameter), pot_unit: row.pot_unit || "cm" })
      .eq("id", id);
    await supabase.from("plant_events").insert({
      plant_id: id,
      type: "repot",
      detail: { from: oldSize, to: `${row.pot_diameter} ${row.pot_unit}` },
      note: row.note || null,
    });
    // 換盆自動扣庫存（若有選擇使用的資材）
    if (row.inventory_item_id && row.inventory_qty) {
      const item = invItems.find((i) => i.id === row.inventory_item_id);
      if (item) {
        const delta = -Math.abs(Number(row.inventory_qty));
        await supabase.from("inventory_items").update({ qty: Number(item.qty) + delta }).eq("id", item.id);
        await supabase.from("inventory_logs").insert({ item_id: item.id, delta, reason: `換盆使用（${plant.name}）`, plant_id: id });
      }
    }
    setShowRepot(false);
    load();
  }

  async function handleBreed(rows) {
    const row = rows[0];
    const { data: child } = await supabase
      .from("plants")
      .insert({
        name: row.name,
        species: plant.species,
        custom_species: plant.custom_species,
        field_id: plant.field_id,
        mother_id: row.pair_role === "mother" ? id : row.partner_id || null,
        father_id: row.pair_role === "father" ? id : row.partner_id || null,
        acquired_date: row.acquired_date || new Date().toISOString().slice(0, 10),
        status: "alive",
        cost: 0,
        care_note: plant.care_note,
        water_frequency_days: plant.water_frequency_days,
      })
      .select()
      .single();
    await supabase.from("plant_events").insert({
      plant_id: id,
      type: "breed",
      detail: { child_id: child?.id, partner_id: row.partner_id },
      note: row.note || null,
    });
    setShowBreed(false);
    load();
  }

  async function handleSplit(rows) {
    const row = rows[0];
    await supabase.from("plants").insert({
      name: row.name,
      species: plant.species,
      custom_species: plant.custom_species,
      field_id: plant.field_id,
      parent_split_from: id,
      acquired_date: new Date().toISOString().slice(0, 10),
      status: "alive",
      cost: 0, // 切盆拆分預設 0 成本
      pot_diameter: row.pot_diameter ? Number(row.pot_diameter) : null,
      pot_unit: row.pot_unit || "cm",
      care_note: plant.care_note,
      water_frequency_days: plant.water_frequency_days,
    });
    await supabase.from("plant_events").insert({ plant_id: id, type: "split", note: row.note || null });
    setShowSplit(false);
    load();
  }

  async function markWatered() {
    await supabase.from("plants").update({ last_watered: new Date().toISOString().slice(0, 10) }).eq("id", id);
    load();
  }

  async function handleMarkDead() {
    if (!confirm(`確定要將「${plant.name}」標記為死亡嗎？標記後會移到「已淘汰」清單。`)) return;
    await supabase.from("plants").update({ status: "dead" }).eq("id", id);
    await supabase.from("plant_events").insert({ plant_id: id, type: "death" });
    load();
  }

  const [tagCopied, setTagCopied] = useState(false);

  async function handleGenerateTag() {
    if (plant.tag_uid && !confirm("此植株已經有標籤了，確定要換一組新的嗎？舊標籤貼紙將失效。")) return;
    const tag = genTagUid();
    await supabase.from("plants").update({ tag_uid: tag }).eq("id", id);
    load();
  }

  async function handleCopyTag() {
    try {
      await navigator.clipboard.writeText(plant.tag_uid);
      setTagCopied(true);
      setTimeout(() => setTagCopied(false), 1500);
    } catch {
      alert(plant.tag_uid);
    }
  }

  const editColumns = [
    { key: "name", label: "名稱", width: 140 },
    { key: "tag_uid", label: "UID（可自行輸入修改）", width: 140 },
    { key: "species", label: "種類", type: "select", options: SPECIES_OPTIONS.map((s) => ({ value: s, label: s })), width: 160 },
    { key: "custom_species", label: "自訂種類", width: 140 },
    { key: "field_id", label: "場域", type: "select", options: fields.map((f) => ({ value: f.id, label: f.name })), width: 140 },
    { key: "status", label: "狀態", type: "select", options: PLANT_STATUS, width: 100 },
    { key: "water_frequency_days", label: "澆水頻率(天)", type: "number", width: 110 },
    { key: "care_note", label: "性質備註", width: 160 },
    { key: "estimated_value", label: "估計市價", type: "number", width: 110 },
    { key: "notes", label: "其他筆記", width: 200 },
  ];

  async function handleEdit(rows) {
    const row = rows[0];
    await supabase
      .from("plants")
      .update({
        name: row.name,
        tag_uid: row.tag_uid || null,
        species: row.species || null,
        custom_species: row.custom_species || null,
        field_id: row.field_id || null,
        status: row.status || "alive",
        water_frequency_days: row.water_frequency_days ? Number(row.water_frequency_days) : null,
        care_note: row.care_note || null,
        estimated_value: row.estimated_value ? Number(row.estimated_value) : 0,
        notes: row.notes || null,
      })
      .eq("id", id);
    setEditMode(false);
    load();
  }

  if (!plant) return <div className="text-sm text-gray-500">載入中...</div>;

  const fieldName = fields.find((f) => f.id === plant.field_id)?.name;

  return (
    <div className="flex flex-col gap-5">
      <button onClick={() => router.push("/")} className="text-sm text-leaf-700 hover:underline w-fit">
        ← 回植物圖鑑
      </button>

      <div className="card">
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-leaf-900">{plant.name}</h1>
            <div className="text-sm text-gray-500">{speciesLabel(plant)}・場域：{fieldName || "未設定"}</div>
            <div className="flex items-center gap-2 mt-1">
              {plant.tag_uid ? (
                <button
                  onClick={handleCopyTag}
                  className="text-xs font-mono px-2 py-0.5 rounded bg-leaf-100 text-leaf-800 hover:bg-leaf-200"
                  title="點擊複製標籤編號"
                >
                  🏷 {plant.tag_uid} {tagCopied ? "已複製 ✓" : "（點擊複製）"}
                </button>
              ) : (
                <span className="text-xs text-gray-400">尚未產生 UID 標籤</span>
              )}
              <button onClick={handleGenerateTag} className="text-xs text-leaf-700 hover:underline">
                {plant.tag_uid ? "🔄 重新產生標籤" : "🏷 產生 UID 標籤"}
              </button>
            </div>
          </div>
          <button className="btn-secondary" onClick={() => setEditMode(true)}>
            ✎ 編輯基本資料
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
          <Stat label="目前盆栽尺寸" value={potSizeLabel(plant)} />
          <Stat label="購入成本" value={formatMoney(plant.cost)} />
          <Stat label="估計市價" value={formatMoney(plant.estimated_value)} />
          <Stat label="取得日期" value={plant.acquired_date || "-"} />
          <Stat label="性質" value={plant.care_note || "未設定"} />
          {plant.status === "alive" && <Stat label="澆水狀態" value={`💧 ${waterUrgency(plant).label}`} />}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {plant.status === "alive" && (
            <button className="btn-secondary" onClick={markWatered}>
              💧 記錄已澆水
            </button>
          )}
          <button className="btn-secondary" onClick={() => setShowRepot(true)}>
            🪴 換盆
          </button>
          <button className="btn-secondary" onClick={() => setShowSplit(true)}>
            ✂️ 切盆拆分
          </button>
          <button className="btn-secondary" onClick={() => setShowBreed(true)}>
            🌸 配種／登記血統
          </button>
          {plant.status === "alive" && (
            <button className="btn-danger" onClick={handleMarkDead}>
              🥀 標記死亡
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold text-leaf-900 mb-2">血統親緣</h2>
        <div className="text-sm space-y-1">
          <div>母株：{allPlants.find((p) => p.id === plant.mother_id)?.name || "-"}</div>
          <div>父株：{allPlants.find((p) => p.id === plant.father_id)?.name || "-"}</div>
          <div>拆分自：{allPlants.find((p) => p.id === plant.parent_split_from)?.name || "-"}</div>
          <div>
            子代／衍生植株：
            {children.length ? (
              children.map((c) => (
                <a key={c.id} href={`/plants/${c.id}`} className="text-leaf-700 hover:underline mr-2">
                  {c.name}
                </a>
              ))
            ) : (
              "尚無"
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold text-leaf-900 mb-2">成長相簿 / 照片履歷</h2>
        <PhotoUploader plantId={id} onUploaded={load} />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <div key={p.id} className="rounded-xl overflow-hidden border border-leaf-100">
              <img src={p.url} alt="" className="w-full h-32 object-cover" />
              <div className="p-2 text-xs text-gray-500">
                <div>{new Date(p.taken_at).toLocaleString("zh-TW")}</div>
                {p.note && <div className="text-gray-700 mt-0.5">{p.note}</div>}
              </div>
            </div>
          ))}
          {!photos.length && <div className="text-sm text-gray-400 col-span-full">尚無照片</div>}
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold text-leaf-900 mb-2">事件歷程</h2>
        <div className="text-sm space-y-2">
          {events.map((e) => (
            <div key={e.id} className="border-b border-leaf-100 pb-1">
              <span className="text-gray-400 mr-2">{e.event_date}</span>
              <span className="font-medium">{eventLabel(e.type)}</span>
              {e.note && <span className="text-gray-500 ml-2">{e.note}</span>}
            </div>
          ))}
          {!events.length && <div className="text-gray-400">尚無紀錄</div>}
        </div>
      </div>

      {showRepot && (
        <BatchTableForm
          title={`換盆：${plant.name}（目前 ${potSizeLabel(plant)}）`}
          columns={[
            { key: "pot_diameter", label: "新盆徑", type: "number", required: true, width: 100 },
            { key: "pot_unit", label: "單位", type: "select", options: POT_UNITS.map((u) => ({ value: u, label: u })), width: 90 },
            {
              key: "inventory_item_id",
              label: "使用資材（選填，自動扣庫存）",
              type: "select",
              options: invItems.map((i) => ({ value: i.id, label: `${i.name}（庫存${i.qty}${i.unit}）` })),
              width: 180,
            },
            { key: "inventory_qty", label: "用量", type: "number", width: 90 },
            { key: "note", label: "備註", width: 200 },
          ]}
          onSubmit={handleRepot}
          onClose={() => setShowRepot(false)}
          submitLabel="確認換盆"
        />
      )}

      {showSplit && (
        <BatchTableForm
          title={`切盆拆分：${plant.name}（新植株成本自動設為 0）`}
          columns={[
            { key: "name", label: "新植株名稱", required: true, width: 140 },
            { key: "pot_diameter", label: "盆徑", type: "number", width: 90 },
            { key: "pot_unit", label: "單位", type: "select", options: POT_UNITS.map((u) => ({ value: u, label: u })), width: 90 },
            { key: "note", label: "備註", width: 200 },
          ]}
          onSubmit={handleSplit}
          onClose={() => setShowSplit(false)}
          submitLabel="確認拆分"
        />
      )}

      {showBreed && (
        <BatchTableForm
          title={`配種／登記血統：${plant.name}`}
          columns={[
            { key: "name", label: "新子代名稱", required: true, width: 140 },
            {
              key: "pair_role",
              label: `${plant.name} 的角色`,
              type: "select",
              options: [
                { value: "mother", label: "母株" },
                { value: "father", label: "父株" },
              ],
              width: 100,
            },
            { key: "partner_id", label: "配對植株", type: "select", options: allPlants.map((p) => ({ value: p.id, label: p.name })), width: 140 },
            { key: "acquired_date", label: "登記日期", type: "date", width: 150 },
            { key: "note", label: "備註", width: 180 },
          ]}
          onSubmit={handleBreed}
          onClose={() => setShowBreed(false)}
          submitLabel="登記配種結果"
        />
      )}

      {editMode && (
        <BatchTableForm
          title={`編輯：${plant.name}`}
          columns={editColumns}
          initialRows={[
            {
              name: plant.name,
              tag_uid: plant.tag_uid,
              species: plant.species,
              custom_species: plant.custom_species,
              field_id: plant.field_id,
              status: plant.status,
              water_frequency_days: plant.water_frequency_days,
              care_note: plant.care_note,
              estimated_value: plant.estimated_value,
              notes: plant.notes,
            },
          ]}
          onSubmit={handleEdit}
          onClose={() => setEditMode(false)}
          submitLabel="儲存變更"
        />
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-leaf-50 rounded-lg p-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium text-leaf-900">{value}</div>
    </div>
  );
}

function eventLabel(type) {
  return { repot: "🪴 換盆", move: "🚚 搬家", split: "✂️ 切盆拆分", breed: "🌸 配種", sale: "💰 出售", death: "🥀 標記死亡" }[type] || type;
}
