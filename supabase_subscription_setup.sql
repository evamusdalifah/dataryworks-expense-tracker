-- ==============================================================================
-- DATARYWORKS EXPENSE TRACKER - SUBSCRIPTION & TRIAL SYSTEM SETUP
-- Jalankan seluruh script ini di Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. TABEL SUBSCRIPTIONS
-- Menyimpan status langganan tiap user: trial / premium / expired
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'trial' check (status in ('trial', 'premium', 'expired')),
  trial_end_date timestamptz not null default (now() + interval '30 days'),
  premium_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Users can view own subscription" on public.subscriptions;
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- 2. TRIGGER: OTOMATIS BUAT BARIS TRIAL 30 HARI SAAT USER BARU MENDAFTAR
create or replace function public.handle_new_user_subscription()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, status, trial_end_date)
  values (new.id, 'trial', now() + interval '30 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute procedure public.handle_new_user_subscription();

-- 3. TABEL LOG KONFIRMASI PEMBAYARAN
-- Setiap kali user klik "Konfirmasi Pembayaran", tercatat di sini sebagai cadangan
-- selain notifikasi WhatsApp yang kamu terima.
create table if not exists public.payment_confirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  user_name text,
  method text,
  sender_account text,
  submitted_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected'))
);

alter table public.payment_confirmations enable row level security;

drop policy if exists "Users can insert own payment confirmation" on public.payment_confirmations;
create policy "Users can insert own payment confirmation"
  on public.payment_confirmations for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own payment confirmations" on public.payment_confirmations;
create policy "Users can view own payment confirmations"
  on public.payment_confirmations for select
  using (auth.uid() = user_id);

-- ==============================================================================
-- CARA MENGAKTIFKAN PREMIUM SETELAH KAMU VERIFIKASI PEMBAYARAN DI WHATSAPP:
--
-- 1. Buka Supabase Dashboard -> Table Editor -> tabel "subscriptions"
-- 2. Cari baris dengan user_id yang sesuai (cocokkan lewat tabel "payment_confirmations"
--    yang punya kolom user_email supaya gampang dicari)
-- 3. Ubah kolom:
--      status         -> premium
--      premium_until  -> tanggal hari ini + 1 bulan (format: 2026-09-30 23:59:59+00)
-- 4. Simpan. User akan otomatis melihat status "Premium" saat halaman di-reload
--    atau paling lambat saat sesi mereka di-refresh (setiap kali app.init() jalan).
-- 5. (Opsional) Ubah juga status di "payment_confirmations" jadi "approved" agar
--    tercatat rapi.
-- ==============================================================================