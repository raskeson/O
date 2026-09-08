import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  // 不要中斷整個 app，讓畫面可以顯示提示訊息
  console.warn("尚未設定 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(url || "https://placeholder.supabase.co", key || "placeholder");

export const PHOTO_BUCKET = "plant-photos";
