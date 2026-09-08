-- ============================================
-- 植物管理系統 Supabase Schema
-- 在 Supabase 專案的 SQL Editor 貼上整份執行一次即可
-- ============================================

create extension if not exists "uuid-ossp";

-- 場域（可自行新增刪除）
create table if not exists fields (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  city text, -- 對應中央氣象署縣市名稱，用於天氣/避難清單查詢
  attributes jsonb default '{}'::jsonb, -- 自訂環境屬性 如日照/遮蔭/排水
  created_at timestamptz default now()
);

-- 植物個體
create table if not exists plants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  species text,
  custom_species text,
  field_id uuid references fields(id) on delete set null,
  acquired_date date,
  cost numeric default 0,
  estimated_value numeric default 0,
  pot_diameter numeric,
  pot_unit text default 'cm',
  status text default 'alive', -- alive / sold / dead
  care_note text, -- 性質描述，如「乾;每兩天澆水一次」
  water_frequency_days int,
  last_watered date,
  sale_price numeric,
  sale_date date,
  mother_id uuid references plants(id) on delete set null,
  father_id uuid references plants(id) on delete set null,
  parent_split_from uuid references plants(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);

-- 照片紀錄（成長相簿 / 品相履歷 / 患部用藥對比）
create table if not exists plant_photos (
  id uuid primary key default uuid_generate_v4(),
  plant_id uuid references plants(id) on delete cascade,
  url text not null,
  category text default 'growth', -- growth / condition / medicine
  note text,
  taken_at timestamptz default now()
);

-- 事件歷程：換盆 / 搬家 / 拆分 / 配種 / 出售
create table if not exists plant_events (
  id uuid primary key default uuid_generate_v4(),
  plant_id uuid references plants(id) on delete cascade,
  type text not null,
  detail jsonb default '{}'::jsonb,
  event_date date default current_date,
  note text,
  created_at timestamptz default now()
);

-- 財務總帳
create table if not exists finance_entries (
  id uuid primary key default uuid_generate_v4(),
  type text not null, -- purchase / sale / expense / income
  plant_id uuid references plants(id) on delete set null,
  amount numeric not null,
  category text,
  note text,
  entry_date date default current_date,
  created_at timestamptz default now()
);

-- 資材庫存
create table if not exists inventory_items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,
  qty numeric default 0,
  unit text default '個',
  seller text,
  price numeric,
  rating int,
  notes text,
  created_at timestamptz default now()
);

create table if not exists inventory_logs (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references inventory_items(id) on delete cascade,
  delta numeric not null,
  reason text,
  plant_id uuid references plants(id) on delete set null,
  created_at timestamptz default now()
);

-- 肥料（可自行增減）
create table if not exists fertilizers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  npk text,
  notes text,
  created_at timestamptz default now()
);

-- 堆肥箱與材料
create table if not exists compost_bins (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  status text default 'active',
  started_at date default current_date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists compost_materials (
  id uuid primary key default uuid_generate_v4(),
  bin_id uuid references compost_bins(id) on delete cascade,
  name text not null,
  weight numeric not null,
  carbon_pct numeric not null,
  nitrogen_pct numeric not null,
  added_at date default current_date
);

-- 系統設定（用於「一鍵開啟託管模式」開關）
create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 索引
create index if not exists idx_plants_field on plants(field_id);
create index if not exists idx_photos_plant on plant_photos(plant_id);
create index if not exists idx_events_plant on plant_events(plant_id);
create index if not exists idx_finance_plant on finance_entries(plant_id);
create index if not exists idx_inventory_logs_item on inventory_logs(item_id);
create index if not exists idx_compost_materials_bin on compost_materials(bin_id);

-- ============================================
-- 這是單人使用的個人專案，先開放 anon 角色完整讀寫，
-- 之後若要加帳號登入，再把這些 policy 收緊即可。
-- ============================================
alter table fields enable row level security;
alter table plants enable row level security;
alter table plant_photos enable row level security;
alter table plant_events enable row level security;
alter table finance_entries enable row level security;
alter table inventory_items enable row level security;
alter table inventory_logs enable row level security;
alter table fertilizers enable row level security;
alter table compost_bins enable row level security;
alter table compost_materials enable row level security;
alter table app_settings enable row level security;

drop policy if exists "allow all fields" on fields;
create policy "allow all fields" on fields for all using (true) with check (true);
drop policy if exists "allow all plants" on plants;
create policy "allow all plants" on plants for all using (true) with check (true);
drop policy if exists "allow all plant_photos" on plant_photos;
create policy "allow all plant_photos" on plant_photos for all using (true) with check (true);
drop policy if exists "allow all plant_events" on plant_events;
create policy "allow all plant_events" on plant_events for all using (true) with check (true);
drop policy if exists "allow all finance_entries" on finance_entries;
create policy "allow all finance_entries" on finance_entries for all using (true) with check (true);
drop policy if exists "allow all inventory_items" on inventory_items;
create policy "allow all inventory_items" on inventory_items for all using (true) with check (true);
drop policy if exists "allow all inventory_logs" on inventory_logs;
create policy "allow all inventory_logs" on inventory_logs for all using (true) with check (true);
drop policy if exists "allow all fertilizers" on fertilizers;
create policy "allow all fertilizers" on fertilizers for all using (true) with check (true);
drop policy if exists "allow all compost_bins" on compost_bins;
create policy "allow all compost_bins" on compost_bins for all using (true) with check (true);
drop policy if exists "allow all compost_materials" on compost_materials;
create policy "allow all compost_materials" on compost_materials for all using (true) with check (true);
drop policy if exists "allow all app_settings" on app_settings;
create policy "allow all app_settings" on app_settings for all using (true) with check (true);

-- ============================================
-- 更新：手動 UID 標籤欄位（若你是舊專案，只要單獨執行這一行 alter 即可，
-- 新專案直接整份貼上執行也沒問題，因為有 if not exists）
-- ============================================
alter table plants add column if not exists tag_uid text;

-- ============================================
-- Storage：另外到 Supabase 後台 Storage 建立一個名為 plant-photos 的
-- Public bucket（見 README 步驟）。
--
-- 重要：光把 bucket 設成 Public，只代表「別人可以讀取照片網址」，
-- 並不代表「網站可以上傳照片」——上傳一樣會被 Row Level Security 擋下
-- （錯誤訊息通常是 "new row violates row-level security policy"）。
-- 一定要額外執行下面這段，才能真正允許上傳／刪除照片：
-- ============================================
drop policy if exists "Public read access for plant-photos" on storage.objects;
create policy "Public read access for plant-photos"
  on storage.objects for select
  using ( bucket_id = 'plant-photos' );

drop policy if exists "Allow uploads to plant-photos" on storage.objects;
create policy "Allow uploads to plant-photos"
  on storage.objects for insert
  with check ( bucket_id = 'plant-photos' );

drop policy if exists "Allow updates to plant-photos" on storage.objects;
create policy "Allow updates to plant-photos"
  on storage.objects for update
  using ( bucket_id = 'plant-photos' );

drop policy if exists "Allow deletes to plant-photos" on storage.objects;
create policy "Allow deletes to plant-photos"
  on storage.objects for delete
  using ( bucket_id = 'plant-photos' );

-- ============================================
-- 更新：賣家清單（可自行新增、留存備註，供資材庫存的賣家欄位選用）
-- ============================================
create table if not exists sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  notes text,
  created_at timestamptz default now()
);
alter table sellers enable row level security;
drop policy if exists "allow all sellers" on sellers;
create policy "allow all sellers" on sellers for all using (true) with check (true);

-- ============================================
-- 更新：死亡原因欄位
-- ============================================
alter table plants add column if not exists death_reason text;

-- ============================================
-- 更新：植物的賣家/來源欄位（比照資材庫存的作法，存文字，
-- 新增/匯入植物時若出現新的賣家名稱，會自動加進 sellers 清單）
-- ============================================
alter table plants add column if not exists seller text;

-- ============================================
-- 更新：分類欄位（跟「種類」分開，用於品種內的細分類，
-- 例如鹿角蕨的親本分類 willinckii / veitchii 等，自由文字）
-- ============================================
alter table plants add column if not exists category text;
