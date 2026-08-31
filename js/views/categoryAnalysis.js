// ==============================================================================
// DATARYWORKS EXPENSE TRACKER - CATEGORY ANALYSIS VIEW
// ==============================================================================

import { chartManager } from '../charts.js';
import { supabaseService } from '../supabase.js';

export function renderCategoryAnalysis(state) {
  if (!state.analysisType) state.analysisType = 'expense';
  
  const currentType = state.analysisType;
  const currentCategory = state.selectedCategory || (currentType === 'income' ? 'Salary' : 'Daily');
  
  const catData = state.getCategoryAnalysisData(currentCategory, currentType);
  const subcatBreakdown = state.getSubcategoryBreakdown(currentCategory, currentType);
  const topSubcatTransactions = state.getTopCategoryTransactions(currentCategory, currentType, 5);

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const activeMonthName = monthNames[state.selectedMonth - 1] || '';

  const isIncome = currentType === 'income';
  const subcatColors = isIncome 
    ? ['#047857', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'] 
    : ['#047857', '#10b981', '#f59e0b', '#3b82f6', '#e11d48', '#8b5cf6', '#64748b'];

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

  const buildSubcatTrendDatasets = () => {
    const existingSubcats = [...new Set(
      state.transactions
        .filter(t => (t.type || '').toLowerCase() === currentType && (t.category || t.category_name || '').toLowerCase() === currentCategory.toLowerCase())
        .map(t => t.subcategory)
        .filter(Boolean)
    )];

    const subcategories = existingSubcats.length > 0 ? existingSubcats : ['Lainnya'];

    return subcategories.map((sub, idx) => {
      const monthlyValues = Array.from({ length: 12 }, (_, monthIdx) => {
        const targetMonth = monthIdx + 1;
        const rawSum = state.transactions
          .filter(t => {
            const rawDate = t.date || t.created_at;
            if (!rawDate) return false;

            const dateStr = rawDate.toString().substring(0, 10);
            const parts = dateStr.split('-');
            if (parts.length < 2) return false;

            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            return y === Number(state.selectedYear) && 
                   m === targetMonth && 
                   (t.type || '').toLowerCase() === currentType && 
                   (t.category || t.category_name || '').toLowerCase() === currentCategory.toLowerCase() &&
                   (t.subcategory || '').toLowerCase() === sub.toLowerCase();
          })
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        return rawSum / 1000000;
      });

      return {
        label: sub,
        data: monthlyValues,
        backgroundColor: subcatColors[idx % subcatColors.length]
      };
    });
  };

  const subcatTrendDatasets = buildSubcatTrendDatasets();

  const container = document.getElementById('main-view-content');
  if (!container) return;

  container.innerHTML = `
    <!-- HEADER BAR -->
    <div class="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-300 gap-4">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-black text-slate-900 tracking-tight">ANALISIS KATEGORI</h1>
        <span class="px-2.5 py-0.5 text-xs font-bold text-emerald-800 bg-emerald-100/90 rounded-full border border-emerald-300 shadow-sm">
          ${currentCategory} • ${activeMonthName} ${state.selectedYear}
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

    <!-- BANNER INFORMASI -->
    <div class="mt-4 flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-medium shadow-sm">
      <i data-lucide="info" class="w-4 h-4 text-emerald-700 shrink-0"></i>
      <span>Analisis alokasi dan histori subkategori <strong>${currentCategory}</strong> (${isIncome ? 'Pemasukan' : 'Pengeluaran'}) untuk periode <strong>${activeMonthName} ${state.selectedYear}</strong>.</span>
    </div>

    <!-- 4 KARTU KPI UTAMA -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 ${isIncome ? 'border-t-emerald-600' : 'border-t-rose-600'} shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full ${isIncome ? 'bg-emerald-700' : 'bg-rose-600'} flex items-center justify-center text-white shrink-0 shadow-inner">
            <i data-lucide="${isIncome ? 'wallet' : 'shopping-cart'}" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">TOTAL ${isIncome ? 'PEMASUKAN' : 'PENGELUARAN'} BULANAN</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${state.formatRupiah(catData.totalOverall)}</div>
          </div>
        </div>
        <div class="mt-2.5 flex items-center text-[11px] font-bold ${catData.overallGrowth <= 0 ? 'text-emerald-700' : 'text-rose-600'}">
          <span class="inline-flex items-center gap-0.5">
            <i data-lucide="${catData.overallGrowth <= 0 ? 'arrow-down-right' : 'arrow-up-right'}" class="w-3.5 h-3.5"></i>
            ${Math.abs(catData.overallGrowth).toFixed(1)}%
          </span>
          <span class="text-slate-400 ml-1 font-normal">vs Bulan Lalu</span>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-emerald-800 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-emerald-800 flex items-center justify-center text-white shrink-0 shadow-inner">
            <i data-lucide="pie-chart" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">${isIncome ? 'PEMASUKAN' : 'PENGELUARAN'} ${currentCategory.toUpperCase()}</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${state.formatRupiah(catData.categoryAmount)}</div>
          </div>
        </div>
        <div class="mt-2.5 flex items-center text-[11px] font-bold ${catData.categoryGrowth <= 0 ? 'text-emerald-700' : 'text-rose-600'}">
          <span class="inline-flex items-center gap-0.5">
            <i data-lucide="${catData.categoryGrowth <= 0 ? 'arrow-down-right' : 'arrow-up-right'}" class="w-3.5 h-3.5"></i>
            ${Math.abs(catData.categoryGrowth).toFixed(1)}%
          </span>
          <span class="text-slate-400 ml-1 font-normal">vs Bulan Lalu</span>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-amber-500 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-inner font-bold text-base">
            %
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">% DARI TOTAL ${isIncome ? 'PEMASUKAN' : 'PENGELUARAN'}</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${catData.percentOfTotal.toFixed(1)}%</div>
          </div>
        </div>
        <div class="mt-2.5 text-[11px] text-slate-500 font-medium">
          <span>Porsi terhadap total bulanan</span>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-blue-600 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center text-white shrink-0 shadow-inner">
            <i data-lucide="receipt" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">RATA-RATA TRANSAKSI</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${state.formatRupiah(Math.round(catData.avgTransaction))}</div>
          </div>
        </div>
        <div class="mt-2.5 text-[11px] text-slate-500 font-medium">
          <span>Rata-rata dari <strong>${catData.totalTransactions}</strong> transaksi</span>
        </div>
      </div>
    </div>

    <!-- BARIS 1: TREN HISTORIS SUBKATEGORI & TABEL RINCIAN -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 items-stretch">
      <div class="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex flex-col justify-between">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-slate-900 text-sm tracking-tight">
            Tren Subkategori ${currentCategory} <span class="text-slate-500 font-normal text-xs">&nbsp;(${state.selectedYear})</span>
          </h3>
        </div>
        <div class="h-64 w-full relative">
          <canvas id="subcategory-trend-chart"></canvas>
        </div>
        <div class="mt-3 flex items-center gap-2 text-xs text-slate-700 bg-slate-100/90 p-2.5 rounded-xl border border-slate-200">
          <i data-lucide="info" class="w-4 h-4 text-emerald-700 shrink-0"></i>
          <span>Kategori <strong>${currentCategory}</strong> menyumbang <strong class="text-slate-900">${catData.percentOfTotal.toFixed(1)}%</strong> dari total ${isIncome ? 'pemasukan' : 'pengeluaran'} Anda di bulan ${activeMonthName}.</span>
        </div>
      </div>

      <div class="lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex flex-col justify-between">
        <div>
          <h3 class="font-bold text-slate-900 text-sm tracking-tight mb-3">Rincian Subkategori (${activeMonthName})</h3>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-[11px]">
              <thead>
                <tr class="text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                  <th class="pb-2 font-bold">Subkategori</th>
                  <th class="pb-2 font-bold text-right">Jumlah</th>
                  <th class="pb-2 font-bold text-right">% Kat</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${subcatBreakdown.length === 0 ? `
                  <tr><td colspan="3" class="py-6 text-center text-slate-400">Belum ada data subkategori.</td></tr>
                ` : subcatBreakdown.map((item, idx) => `
                  <tr>
                    <td class="py-2.5 flex items-center gap-2 font-semibold text-slate-800">
                      <span class="w-2.5 h-2.5 rounded-full shadow-sm shrink-0" style="background-color: ${subcatColors[idx % subcatColors.length]}"></span>
                      ${item.name}
                    </td>
                    <td class="py-2.5 text-right font-bold text-slate-900">${state.formatRupiah(item.amount)}</td>
                    <td class="py-2.5 text-right font-medium text-slate-500">${item.percentage}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between font-extrabold text-xs text-slate-900">
          <span>TOTAL ${currentCategory.toUpperCase()}</span>
          <span class="${isIncome ? 'text-emerald-800' : 'text-rose-600'}">${state.formatRupiah(catData.categoryAmount)}</span>
        </div>
      </div>
    </div>

    <!-- BARIS 2: 5 TRANSAKSI TERTINGGI & INSIGHT -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 items-stretch">
      <div class="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex flex-col justify-between">
        <h3 class="font-bold text-slate-900 text-sm tracking-tight mb-3">5 Transaksi ${isIncome ? 'Pemasukan' : 'Pengeluaran'} Tertinggi (${currentCategory})</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs table-fixed">
            <thead>
              <tr class="text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                <th class="pb-3 w-8">#</th>
                <th class="pb-3 w-24">Tanggal</th>
                <th class="pb-3">Item</th>
                <th class="pb-3 w-28">Subkategori</th>
                <th class="pb-3 w-28 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${topSubcatTransactions.length === 0 ? `
                <tr><td colspan="5" class="py-8 text-center text-slate-400">Belum ada transaksi di kategori ${currentCategory}.</td></tr>
              ` : topSubcatTransactions.map((t, idx) => `
                <tr class="hover:bg-slate-50 transition">
                  <td class="py-2.5 font-bold text-slate-900">
                    <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-800 text-white text-[10px] font-bold">${idx + 1}</span>
                  </td>
                  <td class="py-2.5 text-slate-600 whitespace-nowrap">${new Date(t.date || t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</td>
                  <td class="py-2.5 font-semibold text-slate-800 truncate pr-2" title="${t.item || t.item_name}">${t.item || t.item_name}</td>
                  <td class="py-2.5">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">${t.subcategory || '-'}</span>
                  </td>
                  <td class="py-2.5 text-right font-bold ${isIncome ? 'text-emerald-800' : 'text-rose-600'} whitespace-nowrap">${isIncome ? '+' : '-'}${state.formatRupiah(t.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100 text-center">
          <button id="btn-view-all-transactions" class="text-xs font-bold text-emerald-800 hover:text-emerald-900 transition inline-flex items-center gap-1">
            Lihat semua transaksi &rarr;
          </button>
        </div>
      </div>

      <div class="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex flex-col justify-between">
        <h3 class="font-bold text-slate-900 text-sm tracking-tight mb-3">Insight Kategori (${currentCategory})</h3>
        <div class="space-y-3.5 text-xs">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold">
              <i data-lucide="pie-chart" class="w-3.5 h-3.5"></i>
            </div>
            <p class="text-slate-600 leading-tight">Total ${isIncome ? 'pemasukan' : 'pengeluaran'} kategori <strong class="text-slate-900">${currentCategory}</strong> pada bulan ${activeMonthName} adalah <strong class="text-slate-900 font-bold">${state.formatRupiah(catData.categoryAmount)}</strong>.</p>
          </div>

          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold">
              <i data-lucide="percent" class="w-3.5 h-3.5"></i>
            </div>
            <p class="text-slate-600 leading-tight">Kategori ini berkontribusi sebesar <strong class="text-slate-900 font-bold">${catData.percentOfTotal.toFixed(1)}%</strong> dari total ${isIncome ? 'pemasukan' : 'pengeluaran'} bulanan Anda.</p>
          </div>

          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 font-bold">
              <i data-lucide="activity" class="w-3.5 h-3.5"></i>
            </div>
            <p class="text-slate-600 leading-tight">Rata-rata nominal per transaksi pada kategori ini adalah <strong class="text-slate-900 font-bold">${state.formatRupiah(Math.round(catData.avgTransaction))}</strong> dari <strong class="text-slate-900 font-bold">${catData.totalTransactions}</strong> transaksi.</p>
          </div>
        </div>
        <div class="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-300 text-xs text-emerald-950 font-medium">
          💡 Terus catat subkategori Anda untuk analisis finansial yang presisi!
        </div>
      </div>
    </div>

    <!-- BARIS 3: KESIMPULAN -->
    <div class="bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 mt-5 flex items-start gap-4">
      <div class="w-10 h-10 rounded-full bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow">
        <i data-lucide="lightbulb" class="w-5 h-5"></i>
      </div>
      <div>
        <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider">KESIMPULAN</h4>
        <p class="text-xs text-slate-600 mt-1 leading-relaxed">
          Anda mencatatkan <strong class="text-slate-900 font-bold">${state.formatRupiah(catData.categoryAmount)}</strong> pada kategori <strong class="text-slate-900 font-bold">${currentCategory}</strong> di bulan ${activeMonthName} ${state.selectedYear}, mencakup <strong class="text-slate-900 font-bold">${catData.percentOfTotal.toFixed(1)}%</strong> dari seluruh total ${isIncome ? 'pemasukan' : 'pengeluaran'} Anda (${state.formatRupiah(catData.totalOverall)}).
        </p>
      </div>
    </div>
  `;

  // Render Chart Tren
  setTimeout(() => {
    if (chartManager) {
      chartManager.renderStackedBarChart('subcategory-trend-chart', subcatTrendDatasets);
    }
    if (window.lucide) window.lucide.createIcons();
  }, 50);
}