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

// 盆栽尺寸單位（含鹿角蕨等非傳統盆栽的栽培方式）
export const POT_UNITS = ["cm", "吋", "上板", "水苔球", "生蠔殼"];

// 植物狀態
export const PLANT_STATUS = [
  { value: "alive", label: "健在" },
  { value: "weak", label: "狀況不佳" },
  { value: "sold", label: "已售出" },
  { value: "dead", label: "已淘汰/死亡" },
];

// 還算「活著、需要澆水/照顧」的狀態（跟已售出/已死亡區分開）
export const ALIVE_STATUSES = ["alive", "weak"];

// 植物來源類型（買入／分株／自撿／贈品，可自行輸入其他文字）
export const ACQUISITION_TYPES = ["買入", "分株", "自撿", "贈品"];

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

// 堆肥常見材料的碳氮比參考值（C:N，例如 76.7 代表 76.7:1，一般常用參考範圍的中間值，僅供估算）
export const COMPOST_MATERIAL_PRESETS = [
  { name: "乾稻草", cn_ratio: 76.7 },
  { name: "乾落葉", cn_ratio: 50 },
  { name: "木屑", cn_ratio: 200 },
  { name: "稻殼", cn_ratio: 90 },
  { name: "紙張/瓦楞紙", cn_ratio: 143.3 },
  { name: "咖啡渣", cn_ratio: 22.5 },
  { name: "廚餘(果皮菜葉)", cn_ratio: 6 },
  { name: "新鮮草/綠肥", cn_ratio: 5 },
  { name: "雞糞", cn_ratio: 4.3 },
  { name: "牛糞", cn_ratio: 13.3 },
  { name: "豬糞", cn_ratio: 9 },
  { name: "米糠", cn_ratio: 17.4 },
  { name: "豆渣", cn_ratio: 6.7 },
  { name: "自訂材料", cn_ratio: 0 },
];
