import dayjs from "dayjs";

// 依照材料清單計算加權碳氮比 (C/N)，邏輯與坊間堆肥 C/N 比計算機相同：
// 先算出每項材料的「純碳重」與「純氮重」，加總後相除
export function calcCN(materials) {
  if (!materials || materials.length === 0) return null;
  let totalC = 0;
  let totalN = 0;
  materials.forEach((m) => {
    const weight = Number(m.weight) || 0;
    const c = Number(m.carbon_pct) || 0;
    const n = Number(m.nitrogen_pct) || 0;
    totalC += weight * (c / 100);
    totalN += weight * (n / 100);
  });
  if (totalN === 0) return null;
  return totalC / totalN;
}

export function cnRatioAdvice(cn) {
  if (cn === null) return "尚無足夠資料";
  if (cn < 20) return "偏低（氮多）：可能發臭、太濕，建議添加乾料（稻草/落葉/木屑）";
  if (cn > 35) return "偏高（碳多）：分解會較慢，建議添加氮源（廚餘/雞糞/咖啡渣）";
  return "理想範圍（約25~35），適合微生物分解發酵";
}

export function speciesLabel(plant) {
  if (!plant) return "";
  if (plant.species === "其他（自訂）" || !plant.species) {
    return plant.custom_species || "未分類";
  }
  return plant.species;
}

export function potSizeLabel(plant) {
  if (!plant?.pot_diameter) {
    // 盆徑留空但單位/規格欄位有填文字型的規格（如「上板」「地生」），直接顯示該文字
    return plant?.pot_unit ? plant.pot_unit : "未記錄";
  }
  return `${plant.pot_diameter} ${plant.pot_unit || "cm"}`;
}

export function nextWaterDate(plant) {
  if (!plant.water_frequency_days) return null;
  const base = plant.last_watered ? dayjs(plant.last_watered) : dayjs(plant.created_at);
  return base.add(plant.water_frequency_days, "day");
}

export function waterUrgency(plant) {
  if (plant.last_watered && dayjs(plant.last_watered).isSame(dayjs(), "day")) {
    return { label: "今天已澆水", level: "done" };
  }
  const next = nextWaterDate(plant);
  if (!next) return { label: "未設定澆水頻率", level: "none" };
  const diff = next.diff(dayjs(), "day");
  if (diff < 0) return { label: `已逾期 ${Math.abs(diff)} 天`, level: "overdue" };
  if (diff === 0) return { label: "今天要澆水", level: "today" };
  return { label: `${diff} 天後澆水`, level: "ok" };
}

export function formatMoney(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 });
}

export function uid() {
  return crypto.randomUUID();
}

// 手動產生一組人類可讀的 UID 標籤，用於實體標籤/吊牌列印，可隨時重新產生
export function genTagUid() {
  const rand = crypto.randomUUID().split("-")[0].toUpperCase();
  return `PLT-${rand}`;
}

// 概估圓盆體積（公升），假設盆高約為盆徑的 0.85 倍，僅供介質用量換算估算使用
const CM_PER_INCH = 2.54;
export function potVolumeLiters(diameter, unit = "cm") {
  const d = Number(diameter);
  if (!d) return 0;
  const diameterCm = unit === "吋" ? d * CM_PER_INCH : d;
  const radiusCm = diameterCm / 2;
  const heightCm = diameterCm * 0.85;
  const volumeCm3 = Math.PI * radiusCm * radiusCm * heightCm;
  return volumeCm3 / 1000; // cm^3 -> 公升
}
