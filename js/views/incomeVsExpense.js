// ==============================================================================
// DATARYWORKS EXPENSE TRACKER - INCOME VS EXPENSE VIEW (FIXED 'ALL YEARS' FILTER)
// ==============================================================================

import { chartManager } from '../charts.js';
import { supabaseService } from '../supabase.js';

export function renderIncomeVsExpense(state) {
  // 1. Dapatkan daftar transaksi yang sudah difilter berdasarkan Tahun & Bulan (dukung 'all')
  const isAllYears = state.selectedYear === 'all';
  const selectedYearNum = Number(state.selectedYear);
  const selectedMonthNum = Number(state.selectedMonth);

  // Data User & Status Langganan untuk Widget Profil Kanan Atas
  const user = supabaseService.currentUser;
  const subInfo = state.getSubscriptionInfo();
  const isAdmin = subInfo.isAdmin;
  const canEdit = subInfo.canEdit;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest User';

  let userPlan = 'Mode Lokal / Demo';
  let planColorClass = 'text-slate-400';
  if (isAdmin) {
    userPlan = 'Admin Plan 👑';
    planColorClass = 'text-amber-600 font-bold';
  } else if (subInfo.isPremium) {
    userPlan = 'Premium ✨';
    planColorClass = 'text-emerald-600 font-bold';
  } else if (subInfo.isTrial) {
    userPlan = subInfo.daysLeft != null ? `Free Trial • ${subInfo.daysLeft} hari lagi` : 'Free Trial';
    planColorClass = 'text-blue-600 font-semibold';
  } else if (subInfo.isExpired) {
    userPlan = '🔒 Read-only';
    planColorClass = 'text-rose-600 font-bold';
  }

  const avatarInitial = userName.charAt(0).toUpperCase();

  // Filter transaksi fleksibel
  const filteredTransactions = (state.transactions || []).filter(t => {
    const rawDate = t.date || t.created_at;
    if (!rawDate) return false;

    const d = new Date(rawDate);
    const y = d.getFullYear();
    const m = d.getMonth() + 1; // 1 - 12

    return y === selectedYearNum && m === selectedMonthNum;
  });

  // Hitung ulang breakdown kategori berdasarkan transaksi yang sudah difilter
  const getBreakdownForFiltered = (type) => {
    const trxs = filteredTransactions.filter(t => (t.type || '').toLowerCase() === type);
    const total = trxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const catMap = {};
    trxs.forEach(t => {
      const cat = t.category || t.category_name || 'Others';
      catMap[cat] = (catMap[cat] || 0) + Number(t.amount || 0);
    });

    const colors = type === 'income' 
      ? ['#047857', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']
      : ['#047857', '#10b981', '#f59e0b', '#e11d48', '#8b5cf6', '#64748b'];

    return Object.keys(catMap).map((catName, idx) => ({
      name: catName,
      amount: catMap[catName],
      percentage: total > 0 ? Number(((catMap[catName] / total) * 100).toFixed(1)) : 0,
      color: colors[idx % colors.length]
    })).sort((a, b) => b.amount - a.amount);
  };

  const incomeBreakdown = getBreakdownForFiltered('income');
  const expenseBreakdown = getBreakdownForFiltered('expense');

  // Hitung KPI Khusus Halaman Ini
  const totalIncome = incomeBreakdown.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = expenseBreakdown.reduce((sum, i) => sum + i.amount, 0);
  const totalSaving = filteredTransactions
    .filter(t => (t.type || '').toLowerCase() === 'saving' || t.category === 'Saving Goals' || t.category_name === 'Saving Goals')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const remaining = totalIncome - totalExpense - totalSaving;
  const savingsRate = totalIncome > 0 ? (totalSaving / totalIncome) * 100 : 0;

  // Nama bulan Bahasa Indonesia & Format Teks Periode Rapi
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const activeMonthName = monthNames[selectedMonthNum - 1] || 'Semua Bulan';
  
  // Teks Periode Rapi (Menghindari "Januari all")
  const periodText = isAllYears ? `${activeMonthName} (Semua Tahun)` : `${activeMonthName} ${state.selectedYear}`;

  // Kategori Pemasukan & Pengeluaran Terbesar
  const topIncomeCat = incomeBreakdown.length > 0 ? incomeBreakdown[0].name : '-';
  const topExpenseCat = expenseBreakdown.length > 0 ? expenseBreakdown[0].name : '-';
  const topExpensePercent = expenseBreakdown.length > 0 ? expenseBreakdown[0].percentage : 0;

  // Build Datasets Tren Historis Pemasukan & Pengeluaran (Stacked Bar)
  const buildStackedTrend = (type, colors) => {
    const existingCats = [...new Set(
      (state.transactions || [])
        .filter(t => (t.type || '').toLowerCase() === type)
        .map(t => t.category || t.category_name)
        .filter(Boolean)
    )];

    const categories = existingCats.length > 0 ? existingCats : (type === 'income' ? ['Gaji', 'Freelance'] : ['Harian', 'Gaya Hidup']);

    return categories.map((cat, idx) => {
      const monthlyValues = Array.from({ length: 12 }, (_, monthIdx) => {
        const targetMonth = monthIdx + 1;
        const rawSum = (state.transactions || [])
          .filter(t => {
            const rawDate = t.date || t.created_at;
            if (!rawDate) return false;

            const d = new Date(rawDate);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;

            const yearMatches = isAllYears || y === selectedYearNum;
            const categoryMatches = (t.category || t.category_name || '').toLowerCase() === cat.toLowerCase();
            const typeMatches = (t.type || '').toLowerCase() === type;

            return yearMatches && m === targetMonth && typeMatches && categoryMatches;
          })
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        return rawSum / 1000000;
      });

      return {
        label: cat,
        data: monthlyValues,
        backgroundColor: colors[idx % colors.length]
      };
    });
  };

  const incomeColors = ['#047857', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
  const expenseColors = ['#047857', '#10b981', '#f59e0b', '#e11d48', '#8b5cf6', '#64748b'];

  const incomeTrendDatasets = buildStackedTrend('income', incomeColors);
  const expenseTrendDatasets = buildStackedTrend('expense', expenseColors);

  const container = document.getElementById('main-view-content');
  if (!container) return;

  container.innerHTML = `
    <!-- HEADER BAR -->
    <div class="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-300 gap-4">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-black text-slate-900 tracking-tight">PEMASUKAN VS PENGELUARAN</h1>
        <span class="px-2.5 py-0.5 text-xs font-bold text-emerald-800 bg-emerald-100/90 rounded-full border border-emerald-300 shadow-sm">
          ${periodText}
        </span>
      </div>

      <!-- AKSIONAL KANAN ATAS: USER PROFILE + TAMBAH TRANSAKSI -->
      <div class="flex items-center gap-3">
        ${canEdit ? `
          <button id="btn-top-add-transaction" class="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center gap-2">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            Tambah Transaksi
          </button>
        ` : `
          <button id="btn-top-add-transaction" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-500 rounded-2xl text-xs font-bold shadow-sm transition flex items-center gap-2 text-left" title="Berlangganan untuk menggunakan fitur ini">
            <i data-lucide="lock" class="w-4 h-4 shrink-0"></i>
            <span class="leading-tight">
              <span class="block">Tambah Transaksi</span>
              <span class="block text-[9px] font-normal opacity-80">Berlangganan untuk pakai fitur ini</span>
            </span>
          </button>
        `}

        <!-- WIDGET USER LOGIN / PROFIL DINAMIS -->
        <div id="user-profile-widget" class="flex items-center gap-2.5 px-3 py-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div class="w-7 h-7 rounded-xl ${isAdmin ? 'bg-amber-500' : 'bg-emerald-800'} text-white font-bold text-xs flex items-center justify-center shrink-0">
            ${avatarInitial}
          </div>
          <div class="text-left hidden sm:block">
            <div class="text-xs font-bold text-slate-800 leading-none">${userName}</div>
            <div class="text-[10px] ${planColorClass} mt-0.5">${userPlan}</div>
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

    <!-- BANNER CATATAN RENTANG WAKTU FILTER -->
    <div class="mt-4 flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-medium shadow-sm">
      <i data-lucide="info" class="w-4 h-4 text-emerald-700 shrink-0"></i>
      <span>Analisis rasio dan distribusi arus kas bulanan untuk periode <strong>${periodText}</strong>.</span>
    </div>

    <!-- 5 KARTU KPI UTAMA -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-4">
      <!-- 1. Pemasukan -->
      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-emerald-600 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-white shrink-0 shadow-inner">
            <i data-lucide="wallet" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">PEMASUKAN</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${state.formatRupiah(totalIncome)}</div>
          </div>
        </div>
      </div>

      <!-- 2. Pengeluaran -->
      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-rose-600 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-inner">
            <i data-lucide="shopping-cart" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">PENGELUARAN</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${state.formatRupiah(totalExpense)}</div>
          </div>
        </div>
      </div>

      <!-- 3. Tabungan -->
      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-emerald-800 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-emerald-800 flex items-center justify-center text-white shrink-0 shadow-inner">
            <i data-lucide="piggy-bank" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">TABUNGAN</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${state.formatRupiah(totalSaving)}</div>
          </div>
        </div>
      </div>

      <!-- 4. Sisa Uang -->
      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-blue-600 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center text-white shrink-0 shadow-inner">
            <i data-lucide="briefcase" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">SISA UANG</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${state.formatRupiah(remaining)}</div>
          </div>
        </div>
      </div>

      <!-- 5. Rasio Menabung -->
      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-amber-500 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-inner font-bold text-base">
            %
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">RASIO MENABUNG</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${savingsRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>

    <!-- BARIS 1: PROPORSI KATEGORI PEMASUKAN & PENGELUARAN (DONUT CHARTS) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
      <!-- 1. Rincian Pemasukan -->
      <div class="bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex flex-col justify-between">
        <h3 class="font-bold text-slate-900 text-sm tracking-tight mb-3">Rincian Pemasukan (${periodText})</h3>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <div class="sm:col-span-5 h-48 relative flex items-center justify-center">
            <canvas id="income-donut-chart"></canvas>
          </div>

          <div class="sm:col-span-7 overflow-x-auto">
            <table class="w-full text-left text-[11px]">
              <thead>
                <tr class="text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                  <th class="pb-2 font-bold">Kategori</th>
                  <th class="pb-2 font-bold text-right">Jumlah</th>
                  <th class="pb-2 font-bold text-right">% Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${incomeBreakdown.length === 0 ? `
                  <tr><td colspan="3" class="py-6 text-center text-slate-400">Belum ada transaksi pemasukan.</td></tr>
                ` : incomeBreakdown.map(item => `
                  <tr>
                    <td class="py-1.5 flex items-center gap-1.5 font-semibold text-slate-800">
                      <span class="w-2.5 h-2.5 rounded-full shadow-sm shrink-0" style="background-color: ${item.color}"></span>
                      ${item.name}
                    </td>
                    <td class="py-1.5 text-right font-bold text-slate-900">${state.formatRupiah(item.amount)}</td>
                    <td class="py-1.5 text-right font-medium text-slate-500">${item.percentage}%</td>
                  </tr>
                `).join('')}
                <tr class="border-t-2 border-slate-300 font-extrabold text-slate-900">
                  <td class="pt-2">TOTAL</td>
                  <td class="pt-2 text-right text-emerald-800">${state.formatRupiah(totalIncome)}</td>
                  <td class="pt-2 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 2. Rincian Pengeluaran -->
      <div class="bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex flex-col justify-between">
        <h3 class="font-bold text-slate-900 text-sm tracking-tight mb-3">Rincian Pengeluaran (${periodText})</h3>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <div class="sm:col-span-5 h-48 relative flex items-center justify-center">
            <canvas id="expense-donut-chart"></canvas>
          </div>

          <div class="sm:col-span-7 overflow-x-auto">
            <table class="w-full text-left text-[11px]">
              <thead>
                <tr class="text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                  <th class="pb-2 font-bold">Kategori</th>
                  <th class="pb-2 font-bold text-right">Jumlah</th>
                  <th class="pb-2 font-bold text-right">% Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${expenseBreakdown.length === 0 ? `
                  <tr><td colspan="3" class="py-6 text-center text-slate-400">Belum ada transaksi pengeluaran.</td></tr>
                ` : expenseBreakdown.map(item => `
                  <tr>
                    <td class="py-1.5 flex items-center gap-1.5 font-semibold text-slate-800">
                      <span class="w-2.5 h-2.5 rounded-full shadow-sm shrink-0" style="background-color: ${item.color}"></span>
                      ${item.name}
                    </td>
                    <td class="py-1.5 text-right font-bold text-slate-900">${state.formatRupiah(item.amount)}</td>
                    <td class="py-1.5 text-right font-medium text-slate-500">${item.percentage}%</td>
                  </tr>
                `).join('')}
                <tr class="border-t-2 border-slate-300 font-extrabold text-slate-900">
                  <td class="pt-2">TOTAL</td>
                  <td class="pt-2 text-right text-rose-600">${state.formatRupiah(totalExpense)}</td>
                  <td class="pt-2 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- BARIS 2: TREN HISTORIS PEMASUKAN VS PENGELUARAN (STACKED BAR CHARTS) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
      <!-- 1. Tren Pemasukan -->
      <div class="bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex flex-col justify-between">
        <h3 class="font-bold text-slate-900 text-sm tracking-tight mb-3">
          Tren Pemasukan <span class="text-slate-500 font-normal text-xs">&nbsp;(${isAllYears ? 'Semua Tahun' : state.selectedYear})</span>
        </h3>
        <div class="h-60 w-full relative">
          <canvas id="income-trend-chart"></canvas>
        </div>
        <div class="mt-3 flex items-center gap-2 text-xs text-slate-700 bg-slate-100/90 p-2.5 rounded-xl border border-slate-200">
          <i data-lucide="info" class="w-4 h-4 text-emerald-700 shrink-0"></i>
          <span>Sumber pemasukan utama periode ini berasal dari kategori <strong class="text-emerald-900">${topIncomeCat}</strong>.</span>
        </div>
      </div>

      <!-- 2. Tren Pengeluaran -->
      <div class="bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex flex-col justify-between">
        <h3 class="font-bold text-slate-900 text-sm tracking-tight mb-3">
          Tren Pengeluaran <span class="text-slate-500 font-normal text-xs">&nbsp;(${isAllYears ? 'Semua Tahun' : state.selectedYear})</span>
        </h3>
        <div class="h-60 w-full relative">
          <canvas id="expense-trend-chart"></canvas>
        </div>
        <div class="mt-3 flex items-center gap-2 text-xs text-slate-700 bg-slate-100/90 p-2.5 rounded-xl border border-slate-200">
          <i data-lucide="info" class="w-4 h-4 text-emerald-700 shrink-0"></i>
          <span>Pengeluaran terbesar periode ini didominasi oleh kategori <strong class="text-rose-700">${topExpenseCat}</strong>.</span>
        </div>
      </div>
    </div>

    <!-- BARIS 3: RINGKASAN INSIGHT PERIODE INI -->
    <div class="bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 mt-5 flex items-start gap-4">
      <div class="w-10 h-10 rounded-full bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow">
        <i data-lucide="lightbulb" class="w-5 h-5"></i>
      </div>
      <div>
        <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider">RINGKASAN INSIGHT PERIODE INI</h4>
        <p class="text-xs text-slate-600 mt-1 leading-relaxed">
          Total pemasukan Anda untuk periode <strong class="text-slate-900 font-bold">${periodText}</strong> adalah <strong class="text-slate-900 font-bold">${state.formatRupiah(totalIncome)}</strong> dengan sumber pendapatan utama berasal dari kategori <strong class="text-emerald-800 font-bold">${topIncomeCat}</strong>. Sementara itu, total pengeluaran mencapai <strong class="text-slate-900 font-bold">${state.formatRupiah(totalExpense)}</strong> yang didominasi oleh kategori <strong class="text-rose-600 font-bold">${topExpenseCat}</strong> (${topExpensePercent}% dari total pengeluaran).
        </p>
      </div>
    </div>
  `;

  // Render Charts
  setTimeout(() => {
    if (chartManager) {
      chartManager.renderSubcategoryDonut('income-donut-chart', incomeBreakdown, '', state.formatRupiah(totalIncome));
      chartManager.renderSubcategoryDonut('expense-donut-chart', expenseBreakdown, '', state.formatRupiah(totalExpense));

      chartManager.renderStackedBarChart('income-trend-chart', incomeTrendDatasets);
      chartManager.renderStackedBarChart('expense-trend-chart', expenseTrendDatasets);
    }

    if (window.lucide) window.lucide.createIcons();
  }, 50);
}