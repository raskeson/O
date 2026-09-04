# 🌿 植物照護管理系統

給收藏/繁殖植物用的個人管理系統：植物圖鑑與血統、成長相簿、場域天氣避難、財務總帳、資材庫存比價、堆肥監測、出差託管清單。

資料存在 Supabase（雲端資料庫＋照片雲端空間），所以可以跨裝置使用，也可以把「出差託管」頁面的網址分享給幫你顧植物的人。

下面的步驟完全不需要在自己電腦上寫程式，只需要瀏覽器操作 GitHub、Supabase、Vercel 三個網站即可。

---

## ⚠️ 舊專案更新這一版時要做的事

這一版新增了「UID 標籤」欄位，需要在 Supabase 多跑一行 SQL：

1. 到你的 Supabase 專案 → **SQL Editor** → **New query**
2. 貼上並執行：
   ```sql
   alter table plants add column if not exists tag_uid text;
   ```
3. 存檔後把整個專案資料夾重新上傳到 GitHub（覆蓋舊檔），Vercel 會自動重新部署。

（如果你是全新專案、還沒建過資料表，直接照第二步整份貼 `supabase/schema.sql` 執行就好，這行已經包含在裡面了。）

---

## 第一步：把這份專案放上 GitHub

1. 到 https://github.com 註冊/登入帳號。
2. 右上角「+」→「New repository」，取個名字（例如 `plant-care-system`），設為 Private 或 Public 都可以，建立空的 repository（不要勾選自動加 README，因為我們自己有）。
3. 進入剛建立的 repository，點 **「uploading an existing file」**（或 Add file → Upload files）。
4. 把你收到的這整個資料夾**裡面的所有檔案與子資料夾**拖進去上傳（保留資料夾結構，例如 `app/`、`components/`、`lib/`、`supabase/` 都要一起上傳）。
5. 下方填寫 commit message（例如「first commit」），按 **Commit changes**。

> 之後我如果再幫你改程式，你只要把改過的檔案重新上傳覆蓋（GitHub 會問你要不要 overwrite），或用同樣方式上傳新檔案即可，一樣不需要本機開發環境。

---

## 第二步：建立 Supabase 資料庫（免費）

1. 到 https://supabase.com 註冊/登入，點 **New project**。
2. 幫專案取名、設一組資料庫密碼（記下來，之後用不太到但要留存）、選擇離台灣近的 region（例如 Singapore），建立專案（約需 1~2 分鐘初始化）。
3. 左側選單點 **SQL Editor** → **New query**，把本專案 `supabase/schema.sql` 這個檔案的**全部內容**貼進去，按 **Run**。這會建立所有需要的資料表。
4. 左側選單點 **Storage** → **Create a new bucket**，Bucket name 輸入 `plant-photos`，**Public bucket 打勾（一定要打開，否則照片無法顯示）**，建立。
5. 左側選單點 **Project Settings → API**，把以下兩個值記下來，等一下會用到：
   - **Project URL**（例如 `https://xxxxx.supabase.co`）
   - **anon public** 這組 API Key（一長串文字）

---

## 第三步：申請中央氣象署開放資料 API 授權碼（免費）

1. 到 https://opendata.cwa.gov.tw 註冊會員（信箱認證即可）。
2. 登入後點右上角「會員中心」，裡面會有一組**授權碼（Authorization Key）**，格式類似 `CWA-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`，複製起來。

---

## 第四步：用 Vercel 部署

1. 到 https://vercel.com 用 GitHub 帳號登入。
2. 點 **Add New → Project**，選擇你剛剛建立的 GitHub repository，點 **Import**。
3. 在 **Environment Variables** 區塊，新增以下三筆（Name / Value）：

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | 第二步記下的 Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 第二步記下的 anon public key |
   | `CWA_API_KEY` | 第三步申請到的授權碼 |

4. 按 **Deploy**，等 1~2 分鐘完成後就會拿到一個 `xxx.vercel.app` 的網址，這就是你的系統了。

> 之後只要你在 GitHub 上更新檔案，Vercel 會自動重新部署，不需要再手動按一次。

---

## 功能對照表

| 分類 | 功能 |
|---|---|
| 植物圖鑑 | 表格批次新增植物、內建種類選單＋自訂、場域分組、目前盆栽尺寸、編輯、刪除 |
| 血統與繁殖 | 配種登記（自動記錄父/母株）、切盆拆分（新植株成本自動歸零）、血統/子代查詢 |
| 相簿與履歷 | 直接上傳照片到雲端、分類（成長/品相患部/用藥對比）、上傳時間＋備註 |
| 場域與氣候 | 場域可自行新增刪除、串接中央氣象署即時預報、豪雨/寒流自動列出該場域需避難的植株 |
| 財務總帳 | 購入成本自動入帳、出售後自動轉入財務、手動收支紀錄、每月收支圖表、損益總覽 |
| 資材與肥料 | 資材/肥料皆可自行新增刪除、賣家與評分比較、庫存手動調整、換盆可直接扣庫存 |
| 堆肥監測 | 堆肥箱增減、材料自由配置（含常見材料碳氮參考值）、自動估算 C/N 比與發酵預測、完成後一鍵轉入資材庫存 |
| 出差託管 | 一鍵開關託管模式、依澆水急迫度排序的 Web 託管清單（含每株的性質/澆水頻率），把網址分享給代顧的人即可 |

## 已知限制（之後可以再請我加強）

- 目前沒有登入/密碼保護，任何人拿到你的 Vercel 網址都能看到與編輯資料（包含託管清單本來就設計成公開分享）。如果需要加上密碼保護，之後可以再告訴我。
- 中央氣象署 API 目前使用「今明36小時預報」判斷豪雨/寒流風險，屬於一般預報等級，正式豪大雨/低溫特報仍建議自行留意氣象署官方警特報。
- 堆肥的 C/N 比是用你輸入的材料重量與碳氮百分比估算，發酵預測為經驗法則參考值，非精準科學數據。
