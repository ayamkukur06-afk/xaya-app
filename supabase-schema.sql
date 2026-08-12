-- =========================================================
-- XAYA — supabase-schema.sql
-- Jalankan seluruh isi file ini SATU KALI di:
-- Dashboard Supabase > project kamu > SQL Editor > New query
-- =========================================================

-- Tabel daftar pengguna: nama panggilan, kapan terakhir online,
-- status banned, dan kapan terakhir di-kick oleh admin.
create table if not exists xaya_ayam_users (
  username    text primary key,
  last_seen   timestamptz not null default now(),
  banned      boolean not null default false,
  kicked_at   timestamptz,
  created_at  timestamptz not null default now()
);

-- Tabel pesan chat antar pengguna (bukan chat dengan AI XAYA).
create table if not exists xaya_ayam_messages (
  id          bigint generated always as identity primary key,
  from_user   text not null,
  to_user     text not null,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists xaya_ayam_messages_pair_idx
  on xaya_ayam_messages (least(from_user, to_user), greatest(from_user, to_user), created_at);

-- Aktifkan Row Level Security lalu buat kebijakan yang
-- mengizinkan akses publik lewat anon key (karena XAYA tidak
-- punya sistem login/akun sungguhan — semua pengunjung memakai
-- anon key yang sama).
--
-- CATATAN JUJUR: karena tidak ada login sungguhan, kebijakan di
-- bawah ini TIDAK BISA membedakan "pengguna A" dari "pengguna B"
-- di sisi server — semua yang boleh dibaca/ditulis lewat
-- SUPABASE_ANON_KEY bisa dibaca/ditulis oleh siapa pun yang
-- memegang key itu (termasuk isi pesan chat pengguna lain, dan
-- kolom banned/kicked_at). Tombol admin di aplikasi hanyalah
-- pembatas tampilan, bukan pembatas akses data yang sesungguhnya.
alter table xaya_ayam_users enable row level security;
alter table xaya_ayam_messages enable row level security;

create policy "public read users" on xaya_ayam_users
  for select using (true);
create policy "public upsert users" on xaya_ayam_users
  for insert with check (true);
create policy "public update users" on xaya_ayam_users
  for update using (true);

create policy "public read messages" on xaya_ayam_messages
  for select using (true);
create policy "public insert messages" on xaya_ayam_messages
  for insert with check (true);

-- Aktifkan Realtime supaya perubahan (pesan baru, status
-- online, ban/kick) langsung terlihat tanpa reload halaman.
alter publication supabase_realtime add table xaya_ayam_users;
alter publication supabase_realtime add table xaya_ayam_messages;
