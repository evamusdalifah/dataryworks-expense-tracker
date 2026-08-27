# 📊 DataryWorks - Personal Expense Tracker Dashboard

Web App Manajemen Keuangan Pribadi (Expense Tracker) dengan 4 menu analisis lengkap, visualisasi grafik interaktif, input transaksi 3-arah (*Hybrid: Income, Expense, Saving/Investment*), filter dinamis, ekspor PDF & CSV, serta kesiapan integrasi cloud database **Supabase**.

---

## 🚀 Cara Menjalankan Aplikasi di Laptop (1-Click)

### Cara 1: Menggunakan File `.bat` (Paling Mudah)
1. Buka folder `expense-tracker-app`.
2. Klik ganda (**Double-click**) file `run_app.bat`.
3. Browser kamu akan langsung terbuka otomatis di `http://localhost:8000`.

### Cara 2: Lewat Terminal / Command Prompt
Jalankan perintah berikut di dalam folder project:
```bash
python -m http.server 8000
```
Lalu buka browser di: [http://localhost:8000](http://localhost:8000)

---

## 🌟 4 Menu Utama Dashboard

1. **Overview**:
   - 5 Kartu KPI Utama (*Total Income, Total Expense, Total Saving, Remaining Cash, Savings Rate %*).
   - Grafik Tren Tahunan (*Income vs Expense vs Saving line chart*).
   - Donut Chart Pengeluaran per Kategori (*Daily, Lifestyle, Needs, Social, Unexpected, Others*).
   - Grafik Waterfall *Cash Flow Summary*.
   - Kartu *Spending Summary* & *Spending Insights*.
   - Tabel *Top 5 Highest Expense Transactions*.

2. **Income vs Expense**:
   - 4 Kartu KPI (*Total Income, Total Expense, Net Cash Flow, Savings Rate*).
   - Donut Chart & Tabel Perbandingan Pemasukan (*Salary, Freelance, Business, Investment, Others*).
   - Donut Chart & Tabel Perbandingan Pengeluaran (*Daily, Lifestyle, Needs, Social, Unexpected, Others*).
   - Stacked Bar Charts bulanan untuk Income dan Expense.
   - Tabel *Top 5 Highest Expense Transactions* & Banner *Summary Insight*.

3. **Category Analysis (Deep-Dive)**:
   - 5 Kartu KPI Kategori Terpilih (*Total Expense, Selected Category Expense, % of Total Expense, Average Transaction, Total Transactions*).
   - Donut Chart Subkategori (misal pada Daily: *Food 45%, Fuel 25%, Groceries 20%, Other Daily Needs 10%*).
   - Stacked Bar Chart tren subkategori bulanan.
   - Tabel *Top 5 Transactions for Selected Category* lengkap dengan metode pembayaran.
   - *Spending Insights* & *Summary Insight*.

4. **Saving Goals (Wealth Tracker)**:
   - 4 Kartu KPI (*Total Saved, Total Goal Target, Overall Progress %, Active Goals*).
   - Radial Gauge Chart *Overall Goal Progress*.
   - Daftar Target Tabungan (*Liburan ke Jepang, Dana Rumah, Dana Pendidikan, Dana Darurat*) dengan progress bar & badge status (*On Track / Behind*).
   - Area Chart *Savings Over Time* (Pertumbuhan tabungan kumulatif).
   - Donut Chart *Savings Contribution This Month*.
   - Tabel *Recent Savings Contributions*.

---

## ⚡ Fitur Interaktif & CRUD

- **Modal `+ Add Transaction`**: Input transaksi dengan 3 pilihan tab (`[Income]`, `[Expense]`, `[Tabung / Invest]`), auto-format Rupiah, dan dropdown subkategori dinamis.
- **Modal `+ Add Saving Goal`**: Tambah target tabungan baru lengkap dengan target nominal, deadline, dan ikon.
- **Modal `Setor Tabungan`**: Tambah setoran berkala ke target tabungan.
- **Modal `View All Transactions`**: Lihat semua riwayat transaksi dengan search bar realtime, filter, dan tombol hapus transaksi.
- **Ekspor PDF & CSV**: Download laporan bulanan dalam format PDF siap cetak atau CSV untuk Excel.

---

## 🗄️ Menghubungkan ke Supabase (Kapan Saja)

Aplikasi ini sudah dirancang **Dual-Mode** (bisa berjalan offline dengan LocalStorage / Demo Seed Data, dan siap disambungkan ke Supabase):

1. Buat project baru gratis di [supabase.com](https://supabase.com).
2. Buka menu **SQL Editor** di Supabase.
3. Buka file `supabase_setup.sql` yang ada di folder ini, copy seluruh isinya, paste ke SQL Editor Supabase, lalu klik **Run**.
4. Di web app DataryWorks, klik tombol **"Connect Supabase"** di bagian bawah sidebar.
5. Masukkan **Project URL** dan **Anon Key** Supabase kamu, lalu klik **Simpan & Sambungkan**.
6. Web app otomatis tersambung ke database cloud Supabase!
