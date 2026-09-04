// 內建常見物種選單（可在表單中選「其他」自行輸入）
export const SPECIES_OPTIONS = [
  "多肉植物",
  "仙人掌",
  "空氣鳳梨",
  "沙漠玫瑰",
  "山防風",
  "塊根植物",
  "龜背芋",
  "花燭 Anthurium",
  "蔓綠絨 Philodendron",
  "秋海棠",
  "蕨類",
  "蘭花",
  "多肉玫瑰石蓮",
  "生石花",
  "松類 / 針葉樹",
  "草花 / 一年生",
  "其他（自訂）",
];

// 台灣縣市（對應中央氣象署 F-C0032-001 鄉鎮天氣預報 locationName）
export const TAIWAN_CITIES = [
  "臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市",
  "基隆市", "新竹市", "新竹縣", "苗栗縣", "彰化縣", "南投縣",
  "雲林縣", "嘉義市", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣",
  "臺東縣", "澎湖縣", "金門縣", "連江縣",
];

// 盆栽尺寸單位
export const POT_UNITS = ["cm", "吋"];

// 植物狀態
export const PLANT_STATUS = [
  { value: "alive", label: "健在" },
  { value: "sold", label: "已售出" },
  { value: "dead", label: "已淘汰/死亡" },
];

// 照片分類
export const PHOTO_CATEGORIES = [
  { value: "growth", label: "成長紀錄" },
  { value: "condition", label: "品相/患部" },
  { value: "medicine", label: "用藥對比" },
];

// 財務分類
export const FINANCE_TYPES = [
  { value: "purchase", label: "購入成本" },
  { value: "sale", label: "出售收入" },
  { value: "expense", label: "其他支出" },
  { value: "income", label: "其他收入" },
];

// 堆肥常見材料的碳氮參考值（%，乾重基準，一般常用參考範圍的中間值，僅供估算）
export const COMPOST_MATERIAL_PRESETS = [
  { name: "乾稻草", carbon_pct: 46, nitrogen_pct: 0.6 },
  { name: "乾落葉", carbon_pct: 50, nitrogen_pct: 1.0 },
  { name: "木屑", carbon_pct: 50, nitrogen_pct: 0.25 },
  { name: "稻殼", carbon_pct: 45, nitrogen_pct: 0.5 },
  { name: "紙張/瓦楞紙", carbon_pct: 43, nitrogen_pct: 0.3 },
  { name: "咖啡渣", carbon_pct: 45, nitrogen_pct: 2.0 },
  { name: "廚餘(果皮菜葉)", carbon_pct: 15, nitrogen_pct: 2.5 },
  { name: "新鮮草/綠肥", carbon_pct: 20, nitrogen_pct: 4.0 },
  { name: "雞糞", carbon_pct: 15, nitrogen_pct: 3.5 },
  { name: "牛糞", carbon_pct: 20, nitrogen_pct: 1.5 },
  { name: "豬糞", carbon_pct: 18, nitrogen_pct: 2.0 },
  { name: "米糠", carbon_pct: 40, nitrogen_pct: 2.3 },
  { name: "豆渣", carbon_pct: 30, nitrogen_pct: 4.5 },
  { name: "自訂材料", carbon_pct: 0, nitrogen_pct: 0 },
];
