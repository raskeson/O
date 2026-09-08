"use client";
import { useState } from "react";
import { supabase, PHOTO_BUCKET } from "@/lib/supabaseClient";
import { PHOTO_CATEGORIES } from "@/lib/constants";

export default function PhotoUploader({ plantId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("growth");
  const [uploading, setUploading] = useState(false);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${plantId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) {
        alert("上傳失敗：" + upErr.message + "\n請確認 Supabase Storage 已建立 plant-photos 公開 bucket。");
        return;
      }
      const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
      await supabase.from("plant_photos").insert({
        plant_id: plantId,
        url: data.publicUrl,
        note: note || null,
        category,
        taken_at: new Date().toISOString(),
      });
      setFile(null);
      setPreview(null);
      setNote("");
      onUploaded();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border border-dashed border-leaf-300 rounded-xl p-3 flex flex-col gap-2 bg-leaf-50/50">
      <div className="flex items-center gap-3 flex-wrap">
        <input type="file" accept="image/*" onChange={handleFile} className="text-sm" />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="preview" className="w-16 h-16 object-cover rounded-lg border" />
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        <select className="input w-40" value={category} onChange={(e) => setCategory(e.target.value)}>
          {PHOTO_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          className="input flex-1 min-w-[160px]"
          placeholder="備註（例如：新葉展開、噴藥後第3天...）"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn-primary" onClick={handleUpload} disabled={!file || uploading}>
          {uploading ? "上傳中..." : "上傳照片"}
        </button>
      </div>
    </div>
  );
}
