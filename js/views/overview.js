// ==============================================================================
// DATARYWORKS EXPENSE TRACKER - OVERVIEW VIEW
// ==============================================================================

import { chartManager } from '../charts.js';
import { supabaseService } from '../supabase.js';

export function renderOverview(state) {
  if (!state.overviewTrendYear) state.overviewTrendYear = state.selectedYear || 2026;
  if (!state.overviewCashFlowYear) state.overviewCashFlowYear = state.selectedYear || 2026;

  const allTrx = state.transactions || [];

  // Data User untuk Widget Profil Kanan Atas
  const user = supabaseService.currentUser;
  const role = user?.user_metadata?.role || 'user';
  const isAdmin = role === 'admin';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest User';
  const userPlan = isAdmin ? 'Admin Plan 👑' : (user ? 'Free Plan' : 'Mode Lokal / Demo');
  const avatarInitial = userName.charAt(0).toUpperCase();

  // 1. Rentang Tanggal Transaksi Dinamis
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  let dateRangeText = 'sejak awal pencatatan hingga saat ini';
  if (allTrx.length > 0) {
    const dates = allTrx.map(t => new Date(t.date || t.created_at)).filter(d => !isNaN(d));
    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      
      const minStr = `${monthNames[minDate.getMonth()]} ${minDate.getFullYear()}`;
      const maxStr = `${monthNames[maxDate.getMonth()]} ${maxDate.getFullYear()}`;
      dateRangeText = `sejak <strong>${minStr}</strong> hingga <strong>${maxStr}</strong>`;
    }
  }

  // 2. Hitung KPI All-Time
  const totalIncome = allTrx
    .filter(t => (t.type || '').toLowerCase() === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = allTrx
    .filter(t => (t.type || '').toLowerCase() === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalSaving = allTrx
    .filter(t => ['saving', 'goal'].includes((t.type || '').toLowerCase()))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const remaining = totalIncome - totalExpense - totalSaving;
  const savingsRate = totalIncome > 0 ? ((totalSaving / totalIncome) * 100) : 0;

  const kpi = {
    totalIncome,
    totalExpense,
    totalSaving,
    remaining,
    savingsRate,
    totalTransactionsCount: allTrx.length
  };

  // 3. 5 Transaksi Pengeluaran Terbesar
  const topTransactions = allTrx
    .filter(t => (t.type || '').toLowerCase() === 'expense')
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
    .slice(0, 5);

  const highestExpenseItem = topTransactions.length > 0 ? topTransactions[0] : null;
  let highestExpenseDetailText = '-';
  if (highestExpenseItem) {
    const formattedDate = new Date(highestExpenseItem.date || highestExpenseItem.created_at)
      .toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const itemName = highestExpenseItem.item || highestExpenseItem.item_name || 'Pengeluaran';
    
    highestExpenseDetailText = `${state.formatRupiah(highestExpenseItem.amount)} <span class="block text-[10px] text-slate-500 font-normal mt-0.5">${itemName} (${formattedDate})</span>`;
  }

  // 4. Daftar Tahun Unik
  const availableYears = [...new Set(allTrx.map(t => {
    const d = t.date || t.created_at;
    return d ? parseInt(d.toString().substring(0, 4), 10) : null;
  }).filter(Boolean))].sort((a, b) => b - a);

  if (availableYears.length === 0) availableYears.push(2026, 2025, 2024);

  // Data Tren Bulanan
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthlyTrendData = months.map((monthName, index) => {
    const monthIndex = index + 1;

    const monthTrx = allTrx.filter(t => {
      const dateVal = t.date || t.created_at;
      if (!dateVal) return false;

      const dateStr = dateVal.toString().substring(0, 10);
      const parts = dateStr.split('-');
      if (parts.length < 2) return false;

      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);

      if (state.overviewTrendYear !== 'all' && y !== Number(state.overviewTrendYear)) return false;
      return m === monthIndex;
    });

    const income = monthTrx.filter(t => (t.type || '').toLowerCase() === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const expense = monthTrx.filter(t => (t.type || '').toLowerCase() === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const saving = monthTrx.filter(t => ['saving', 'goal'].includes((t.type || '').toLowerCase())).reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return { month: monthName, income, expense, saving };
  });

  // Data Arus Kas Chart
  const cashFlowYearTrx = allTrx.filter(t => {
    if (state.overviewCashFlowYear === 'all') return true;
    const dateVal = t.date || t.created_at;
    if (!dateVal) return false;
    const y = parseInt(dateVal.toString().substring(0, 4), 10);
    return y === Number(state.overviewCashFlowYear);
  });

  const cfIncome = cashFlowYearTrx.filter(t => (t.type || '').toLowerCase() === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const cfExpense = cashFlowYearTrx.filter(t => (t.type || '').toLowerCase() === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const cfSaving = cashFlowYearTrx.filter(t => ['saving', 'goal'].includes((t.type || '').toLowerCase())).reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const cashFlowChartData = {
    totalIncome: cfIncome,
    totalExpense: cfExpense,
    totalSaving: cfSaving,
    remaining: cfIncome - cfExpense - cfSaving
  };

  // Status Kesehatan Keuangan
  let healthBadge = { text: 'Sangat Sehat 🟢', bg: 'bg-emerald-100', color: 'text-emerald-800', border: 'border-emerald-300' };
  if (kpi.remaining < 0) {
    healthBadge = { text: 'Defisit 🔴', bg: 'bg-rose-100', color: 'text-rose-800', border: 'border-rose-300' };
  } else if (kpi.savingsRate < 10) {
    healthBadge = { text: 'Perlu Ditingkatkan 🟡', bg: 'bg-amber-100', color: 'text-amber-800', border: 'border-amber-300' };
  }

  // Burn Rate
  const burnRate = kpi.totalIncome > 0 ? Math.min(100, Math.round((kpi.totalExpense / kpi.totalIncome) * 100)) : 0;
  let burnRateColor = 'bg-emerald-600';
  if (burnRate > 80) burnRateColor = 'bg-rose-600';
  else if (burnRate > 50) burnRateColor = 'bg-amber-500';

  const container = document.getElementById('main-view-content');
  if (!container) return;

  container.innerHTML = `
    <!-- HEADER BAR -->
    <div class="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-300 gap-4">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-black text-slate-900 tracking-tight">RINGKASAN UTAMA (OVERVIEW)</h1>
        <span class="px-2.5 py-0.5 text-xs font-bold rounded-full border ${healthBadge.bg} ${healthBadge.color} ${healthBadge.border} shadow-sm">
          Status: ${healthBadge.text}
        </span>
      </div>

      <!-- AKSIONAL KANAN ATAS: USER PROFILE + TAMBAH TRANSAKSI -->
      <div class="flex items-center gap-3">
        <!-- TOMBOL TAMBAH TRANSAKSI -->
        <button id="btn-top-add-transaction" class="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center gap-2">
          <i data-lucide="plus-circle" class="w-4 h-4"></i>
          Tambah Transaksi
        </button>

        <!-- WIDGET USER LOGIN / PROFIL DINAMIS -->
        <div id="user-profile-widget" class="flex items-center gap-2.5 px-3 py-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div class="w-7 h-7 rounded-xl ${isAdmin ? 'bg-amber-500' : 'bg-emerald-800'} text-white font-bold text-xs flex items-center justify-center shrink-0">
            ${avatarInitial}
          </div>
          <div class="text-left hidden sm:block">
            <div class="text-xs font-bold text-slate-800 leading-none">${userName}</div>
            <div class="text-[10px] ${isAdmin ? 'text-amber-600 font-bold' : 'text-slate-400'} mt-0.5">${userPlan}</div>
          </div>

          ${user ? `
            <button id="btn-user-logout" class="ml-1 p-1 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50" title="Keluar / Logout">
              <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
            </button>
          ` : `
            <button id="btn-user-login" class="ml-1 px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition shadow-sm">
              Masuk
            </button>
          `}
        </div>
      </div>
    </div>

    <!-- BANNER CATATAN RENTANG WAKTU DATA -->
    <div class="mt-4 flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-medium shadow-sm">
      <i data-lucide="info" class="w-4 h-4 text-emerald-700 shrink-0"></i>
      <span>Rangkuman seluruh portofolio keuangan Anda ${dateRangeText}.</span>
    </div>

    <!-- 5 KARTU KPI UTAMA -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-4">
      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-emerald-600 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-white shrink-0 shadow-inner">
            <i data-lucide="wallet" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">PEMASUKAN</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${state.formatRupiah(kpi.totalIncome)}</div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-rose-600 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-inner">
            <i data-lucide="shopping-cart" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">PENGELUARAN</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${state.formatRupiah(kpi.totalExpense)}</div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-emerald-800 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-emerald-800 flex items-center justify-center text-white shrink-0 shadow-inner">
            <i data-lucide="piggy-bank" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">TABUNGAN</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${state.formatRupiah(kpi.totalSaving)}</div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-blue-600 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center text-white shrink-0 shadow-inner">
            <i data-lucide="briefcase" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">SISA UANG</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${state.formatRupiah(kpi.remaining)}</div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-amber-500 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-inner font-bold text-base">
            %
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">RASIO MENABUNG</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${kpi.savingsRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>

    <!-- BARIS 1: TREN & RINGKASAN ARUS KAS -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
      <div class="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex flex-col justify-between">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-slate-900 text-sm">Tren Pemasukan vs Pengeluaran</h3>
          <div class="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1">
            <span class="text-[11px] font-semibold text-slate-600">Tahun:</span>
            <select id="chart-trend-year-select" class="bg-transparent text-xs font-bold text-slate-800 focus:outline-none">
              <option value="all" ${state.overviewTrendYear === 'all' ? 'selected' : ''}>Semua Tahun</option>
              ${availableYears.map(y => `
                <option value="${y}" ${Number(state.overviewTrendYear) === Number(y) ? 'selected' : ''}>${y}</option>
              `).join('')}
            </select>
          </div>
        </div>
        <div class="h-60 w-full relative">
          <canvas id="overview-trend-chart"></canvas>
        </div>
      </div>

      <div class="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex flex-col justify-between">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-slate-900 text-sm">Ringkasan Arus Kas</h3>
          <div class="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1">
            <span class="text-[11px] font-semibold text-slate-600">Tahun:</span>
            <select id="chart-cashflow-year-select" class="bg-transparent text-xs font-bold text-slate-800 focus:outline-none">
              <option value="all" ${state.overviewCashFlowYear === 'all' ? 'selected' : ''}>Semua Tahun</option>
              ${availableYears.map(y => `
                <option value="${y}" ${Number(state.overviewCashFlowYear) === Number(y) ? 'selected' : ''}>${y}</option>
              `).join('')}
            </select>
          </div>
        </div>
        <div class="h-60 w-full relative">
          <canvas id="overview-cashflow-chart"></canvas>
        </div>
      </div>
    </div>

    <!-- BARIS 2: 5 TRANSAKSI TERTINGGI & RASIO PENGELUARAN -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 items-stretch">
      <div class="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-slate-900 text-sm">5 Transaksi Pengeluaran Terbesar Sepanjang Masa</h3>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs table-fixed">
              <thead>
                <tr class="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th class="pb-3 w-8">#</th>
                  <th class="pb-3 w-24">Tanggal</th>
                  <th class="pb-3">Item</th>
                  <th class="pb-3 w-24">Kategori</th>
                  <th class="pb-3 w-28 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${topTransactions.length === 0 ? `
                  <tr>
                    <td colspan="5" class="py-8 text-center text-slate-400">Belum ada transaksi pengeluaran.</td>
                  </tr>
                ` : topTransactions.map((t, idx) => `
                  <tr class="hover:bg-slate-50 transition">
                    <td class="py-2.5 font-bold text-slate-900">
                      <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-800 text-white text-[10px] font-bold">${idx + 1}</span>
                    </td>
                    <td class="py-2.5 text-slate-600 whitespace-nowrap">${new Date(t.date || t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td class="py-2.5 font-semibold text-slate-800 truncate pr-2" title="${t.item || t.item_name}">${t.item || t.item_name}</td>
                    <td class="py-2.5">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                        ${t.category || t.category_name || 'Lainnya'}
                      </span>
                    </td>
                    <td class="py-2.5 text-right font-bold text-rose-600 whitespace-nowrap">-${state.formatRupiah(t.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 text-center">
          <button id="btn-view-all-transactions" class="text-xs font-bold text-emerald-800 hover:text-emerald-900 transition inline-flex items-center gap-1">
            Lihat semua transaksi &rarr;
          </button>
        </div>
      </div>

      <div class="lg:col-span-5 flex flex-col gap-5">
        <div class="bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80">
          <h3 class="font-bold text-slate-900 text-sm mb-3">Rasio Pengeluaran vs Pemasukan</h3>
          
          <div class="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div class="flex justify-between items-center text-xs mb-1.5 font-medium">
              <span class="text-slate-600">Total Pengeluaran / Total Pemasukan</span>
              <span class="font-bold text-slate-900">${burnRate}%</span>
            </div>
            <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div class="${burnRateColor} h-2 rounded-full transition-all duration-500" style="width: ${burnRate}%"></div>
            </div>
          </div>

          <div class="space-y-3 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-slate-600">Total Transaksi Dicatat</span>
              <span class="font-bold text-slate-900">${kpi.totalTransactionsCount} Transaksi</span>
            </div>
            <div class="flex items-start justify-between">
              <span class="text-slate-600">Pengeluaran Terbesar</span>
              <span class="font-bold text-slate-900 text-right">${highestExpenseDetailText}</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-bold text-slate-900 text-sm">Status Kekayaan Bersih</h3>
              <span class="px-2 py-0.5 text-[10px] font-bold ${healthBadge.bg} ${healthBadge.color} rounded-full border ${healthBadge.border}">${healthBadge.text}</span>
            </div>
            <div class="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>• Akumulasi total pemasukan Anda adalah <strong class="text-slate-900">${state.formatRupiah(kpi.totalIncome)}</strong>.</p>
              <p>• Akumulasi total belanja Anda mencapai <strong class="text-slate-900">${state.formatRupiah(kpi.totalExpense)}</strong>.</p>
              <p>• Total tabungan tersimpan sebesar <strong class="text-emerald-800 font-bold">${state.formatRupiah(kpi.totalSaving)}</strong>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- BARIS 3: KESIMPULAN -->
    <div class="bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 mt-5 flex items-start gap-4">
      <div class="w-10 h-10 rounded-full bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow">
        <i data-lucide="sparkles" class="w-5 h-5"></i>
      </div>
      <div>
        <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider">KESIMPULAN</h4>
        <p class="text-xs text-slate-600 mt-1 leading-relaxed">
          Secara keseluruhan sejak awal pencatatan, Anda memiliki kekayaan/sisa uang bersih sebesar <strong class="text-emerald-800 font-bold text-sm">${state.formatRupiah(kpi.remaining)}</strong> dan berhasil menyisihkan tabungan senilai <strong class="text-emerald-800 font-bold text-sm">${state.formatRupiah(kpi.totalSaving)}</strong> dengan rasio menabung rata-rata <strong class="text-slate-900 font-bold">${kpi.savingsRate.toFixed(1)}%</strong>. Pertahankan manajemen finansial yang baik ini!
        </p>
      </div>
    </div>

    <!-- BARIS 4: PANDUAN KRITERIA KESEHATAN FINANSIAL -->
    <div class="bg-slate-200/70 rounded-2xl p-4 border border-slate-300 shadow-sm mt-4">
      <div class="flex items-center gap-2 mb-2.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
        <i data-lucide="help-circle" class="w-4 h-4 text-emerald-800"></i>
        <span>ACUAN KRITERIA INDIKATOR KESEHATAN FINANSIAL</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div class="p-3 bg-white rounded-xl border border-slate-300 shadow-sm">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-emerald-800">Sangat Sehat 🟢</span>
            <span class="text-[10px] text-slate-500 font-semibold">Kondisi Ideal</span>
          </div>
          <p class="text-slate-600 text-[11px] leading-relaxed">
            Sisa uang bersih positif (&gt; 0) dan rasio menabung akumulatif <strong>&ge; 10%</strong> dari total pemasukan.
          </p>
        </div>

        <div class="p-3 bg-white rounded-xl border border-slate-300 shadow-sm">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-amber-800">Perlu Ditingkatkan 🟡</span>
            <span class="text-[10px] text-slate-500 font-semibold">Waspada Alokasi</span>
          </div>
          <p class="text-slate-600 text-[11px] leading-relaxed">
            Sisa uang bersih masih positif, tetapi rasio menabung akumulatif <strong>&lt; 10%</strong> dari total pemasukan.
          </p>
        </div>

        <div class="p-3 bg-white rounded-xl border border-slate-300 shadow-sm">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-rose-800">Defisit 🔴</span>
            <span class="text-[10px] text-slate-500 font-semibold">Evaluasi Total</span>
          </div>
          <p class="text-slate-600 text-[11px] leading-relaxed">
            Total akumulasi pengeluaran &amp; alokasi tabungan melebihi total pemasukan (Sisa uang <strong>&lt; 0</strong>).
          </p>
        </div>
      </div>
    </div>
  `;

  // Listener Switch Tahun Chart
  document.getElementById('chart-trend-year-select')?.addEventListener('change', (e) => {
    state.overviewTrendYear = e.target.value;
    renderOverview(state);
  });

  document.getElementById('chart-cashflow-year-select')?.addEventListener('change', (e) => {
    state.overviewCashFlowYear = e.target.value;
    renderOverview(state);
  });

  // Render Chart
  setTimeout(() => {
    if (chartManager) {
      chartManager.renderOverviewTrend('overview-trend-chart', monthlyTrendData);
      chartManager.renderCashFlowSummary('overview-cashflow-chart', cashFlowChartData);
    }
    if (window.lucide) window.lucide.createIcons();
  }, 50);
}