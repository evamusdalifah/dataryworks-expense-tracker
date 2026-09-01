// ==============================================================================
// DATARYWORKS EXPENSE TRACKER - MAIN APP ORCHESTRATOR
// ==============================================================================

import { state } from './state.js';
import { supabaseService } from './supabase.js';
import { ModalManager } from './modals.js';
import { chartManager } from './charts.js';
import { renderOverview } from './views/overview.js';
import { renderIncomeVsExpense } from './views/incomeVsExpense.js';
import { renderCategoryAnalysis } from './views/categoryAnalysis.js';
import { renderSavingGoals } from './views/savingGoals.js';
import { exportToPDF, exportToCSV } from './export.js';

class App {
  constructor() {
    this.modalManager = new ModalManager(state);
    this.init();
  }

  async init() {
    if (typeof supabaseService.init === 'function') {
      await supabaseService.init();
    }

    await state.init();
    this.attachGlobalEvents();

    // PENTING: subscribe() didaftarkan SEBELUM pengecekan auth guard,
    // supaya listener ini tetap aktif walau user belum login saat pertama kali
    // membuka halaman. Sebelumnya, subscribe() ada SETELAH early-return,
    // sehingga kalau user belum login, listener tidak pernah terdaftar --
    // akibatnya setelah login/daftar akun, klik menu sidebar tidak memicu
    // render ulang sampai halaman di-reload manual.
    state.subscribe(() => {
      if (this.checkAuthGuard()) {
        this.renderSidebar();
        this.renderActiveView();
        this.updateFilterDropdownsUI();
      }
    });

    const isAuthenticated = this.checkAuthGuard();
    if (!isAuthenticated) return;

    this.renderSidebar();
    this.renderActiveView();
    this.updateFilterDropdownsUI();
  }

  // --- AUTH GUARD: DIRECT LOGIN POPUP ON DARK BACKGROUND ---
  checkAuthGuard() {
    const user = supabaseService.currentUser;

    if (!user) {
      // Set latar belakang layar utama menjadi gelap polos
      const mainContent = document.getElementById('main-view-content');
      if (mainContent) {
        mainContent.innerHTML = `
          <div class="min-h-[85vh] bg-[#0F172A] rounded-3xl border border-slate-800 my-2"></div>
        `;
      }

      // Set sidebar menjadi mode gelap polos
      const sidebarEl = document.getElementById('sidebar-container');
      if (sidebarEl) {
        sidebarEl.innerHTML = `
          <div class="flex flex-col min-h-full justify-between p-5 bg-[#0F172A] text-slate-300 border-r border-slate-800">
            <div class="flex items-center gap-3 pb-5 border-b border-slate-800">
              <div class="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
                <i data-lucide="trending-up" class="w-6 h-6"></i>
              </div>
              <div>
                <div class="font-black text-base text-white tracking-tight leading-none">DataryWorks</div>
                <div class="text-[11px] font-semibold text-emerald-400 mt-1">Expense Tracker</div>
              </div>
            </div>
          </div>
        `;
      }

      if (window.lucide) window.lucide.createIcons();

      // Langsung munculkan pop-up login tanpa delay,
      // supaya tidak ada jeda "kotak gelap kosong" yang terlihat berkedip
      if (this.modalManager) {
        this.modalManager.openAuthModal('login');
      }

      return false;
    }

    return true;
  }

  getAvailableYears() {
    const transactions = state.transactions || [];
    const currentYear = new Date().getFullYear();

    if (transactions.length > 0) {
      const extractedYears = transactions
        .map(t => new Date(t.date).getFullYear())
        .filter(y => !isNaN(y));

      const years = Array.from(new Set(extractedYears)).sort((a, b) => b - a);

      if (!years.includes(currentYear)) {
        years.unshift(currentYear);
        years.sort((a, b) => b - a);
      }
      return years;
    }

    return [currentYear];
  }

  updateFilterDropdownsUI() {
    const yearSelect = document.getElementById('filter-year');
    const monthSelect = document.getElementById('filter-month');
    const catSelect = document.getElementById('filter-category');

    const availableYears = this.getAvailableYears();
    const currentYear = new Date().getFullYear();

    if (yearSelect) {
      let yearHtml = '';
      availableYears.forEach(yr => {
        yearHtml += `<option value="${yr}">${yr}</option>`;
      });
      yearSelect.innerHTML = yearHtml;
      
      const selectedValue = state.selectedYear ? String(state.selectedYear) : String(currentYear);
      yearSelect.value = selectedValue;
    }

    if (monthSelect) monthSelect.value = state.selectedMonth;
    if (catSelect && state.selectedCategory) catSelect.value = state.selectedCategory;
  }

  renderSidebar() {
    const sidebarEl = document.getElementById('sidebar-container');
    if (!sidebarEl) return;

    const isOverview = state.activeTab === 'overview';
    const isIncExp = state.activeTab === 'incomeVsExpense';
    const isCat = state.activeTab === 'categoryAnalysis';
    const isGoals = state.activeTab === 'savingGoals';

    const activeType = state.analysisType || 'expense';
    const availableCategories = (state.categories || [])
      .filter(c => c.type === activeType)
      .map(c => c.name);

    if (availableCategories.length > 0 && !availableCategories.includes(state.selectedCategory)) {
      state.selectedCategory = availableCategories[0];
    }

    const availableYears = this.getAvailableYears();
    const trialBannerHtml = this.getTrialBannerHtml();

    sidebarEl.innerHTML = `
      <div class="flex flex-col min-h-full justify-between p-5 bg-[#0F172A] text-slate-300 border-r border-slate-800">
        <div>
          <div class="flex items-center gap-3 pb-5 border-b border-slate-800">
            <div class="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
              <i data-lucide="trending-up" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="font-black text-base text-white tracking-tight leading-none">DataryWorks</div>
              <div class="text-[11px] font-semibold text-emerald-400 mt-1">Expense Tracker</div>
            </div>
          </div>

          <nav class="mt-6 space-y-1.5">
            <button id="nav-overview" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${isOverview ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
              <i data-lucide="layout-grid" class="w-4 h-4 ${isOverview ? 'text-emerald-400' : 'text-slate-500'}"></i>
              <span>Overview</span>
            </button>

            <button id="nav-income-expense" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${isIncExp ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
              <i data-lucide="arrow-up-down" class="w-4 h-4 ${isIncExp ? 'text-emerald-400' : 'text-slate-500'}"></i>
              <span>Income vs Expense</span>
            </button>

            <button id="nav-category-analysis" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${isCat ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
              <i data-lucide="pie-chart" class="w-4 h-4 ${isCat ? 'text-emerald-400' : 'text-slate-500'}"></i>
              <span>Category Analysis</span>
            </button>

            <button id="nav-saving-goals" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${isGoals ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
              <i data-lucide="target" class="w-4 h-4 ${isGoals ? 'text-emerald-400' : 'text-slate-500'}"></i>
              <span>Saving Goals</span>
            </button>
          </nav>

          <div class="mt-8 pt-5 border-t border-slate-800">
            <div class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              <i data-lucide="filter" class="w-3.5 h-3.5 text-emerald-400"></i>
              <span>FILTERS</span>
            </div>

            ${isOverview ? `
              <div class="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 font-medium leading-relaxed">
                🌐 Halaman <strong>Overview</strong> merangkum seluruh kekayaan bersih Anda secara akumulatif.
              </div>
            ` : isGoals ? `
              <div class="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 font-medium leading-relaxed">
                🎯 Halaman <strong>Saving Goals</strong> melacak akumulasi target tabungan dan proyeksi impian Anda secara All-Time.
              </div>
            ` : `
              <div class="space-y-3 text-xs">
                ${isCat ? `
                  <div>
                    <label class="block text-slate-400 font-medium mb-1.5">Tipe Transaksi</label>
                    <div class="grid grid-cols-2 p-1 bg-slate-800 rounded-xl border border-slate-700 text-[11px] font-bold text-center">
                      <button id="filter-toggle-expense" class="py-1.5 rounded-lg transition ${state.analysisType === 'expense' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
                        Pengeluaran
                      </button>
                      <button id="filter-toggle-income" class="py-1.5 rounded-lg transition ${state.analysisType === 'income' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
                        Pemasukan
                      </button>
                    </div>
                  </div>
                ` : ''}

                <div class="flex items-center justify-between">
                  <span class="text-slate-400 font-medium">Tahun</span>
                  <select id="filter-year" class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    ${availableYears.map(yr => `
                      <option value="${yr}" ${Number(state.selectedYear) === Number(yr) ? 'selected' : ''}>${yr}</option>
                    `).join('')}
                  </select>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-slate-400 font-medium">Bulan</span>
                  <select id="filter-month" class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    <option value="1" ${Number(state.selectedMonth) === 1 ? 'selected' : ''}>Januari</option>
                    <option value="2" ${Number(state.selectedMonth) === 2 ? 'selected' : ''}>Februari</option>
                    <option value="3" ${Number(state.selectedMonth) === 3 ? 'selected' : ''}>Maret</option>
                    <option value="4" ${Number(state.selectedMonth) === 4 ? 'selected' : ''}>April</option>
                    <option value="5" ${Number(state.selectedMonth) === 5 ? 'selected' : ''}>Mei</option>
                    <option value="6" ${Number(state.selectedMonth) === 6 ? 'selected' : ''}>Juni</option>
                    <option value="7" ${Number(state.selectedMonth) === 7 ? 'selected' : ''}>Juli</option>
                    <option value="8" ${Number(state.selectedMonth) === 8 ? 'selected' : ''}>Agustus</option>
                    <option value="9" ${Number(state.selectedMonth) === 9 ? 'selected' : ''}>September</option>
                    <option value="10" ${Number(state.selectedMonth) === 10 ? 'selected' : ''}>Oktober</option>
                    <option value="11" ${Number(state.selectedMonth) === 11 ? 'selected' : ''}>November</option>
                    <option value="12" ${Number(state.selectedMonth) === 12 ? 'selected' : ''}>Desember</option>
                  </select>
                </div>

                ${isCat ? `
                  <div class="flex items-center justify-between">
                    <span class="text-slate-400 font-medium">Kategori</span>
                    <select id="filter-category" class="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[120px]">
                      ${availableCategories.map(cat => `
                        <option value="${cat}" ${state.selectedCategory === cat ? 'selected' : ''}>${cat}</option>
                      `).join('')}
                    </select>
                  </div>
                ` : ''}
              </div>
            `}

            <div class="mt-4 space-y-2">
              <div class="grid grid-cols-2 gap-2">
                <button id="btn-export-pdf" class="w-full py-2 px-3 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition flex items-center justify-center gap-1.5 shadow-sm">
                  <i data-lucide="file-text" class="w-3.5 h-3.5 text-slate-400"></i>
                  PDF
                </button>
                <button id="btn-export-csv" class="w-full py-2 px-3 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition flex items-center justify-center gap-1.5 shadow-sm">
                  <i data-lucide="table" class="w-3.5 h-3.5 text-slate-400"></i>
                  CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-slate-800">
          ${trialBannerHtml}
          <p class="text-[10px] font-medium text-slate-500 text-center mt-3">DataryWorks v2.0 • Personal Finance</p>
        </div>
      </div>
    `;

    this.attachSidebarEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  /**
   * Menghasilkan HTML banner trial/subscription untuk sidebar kiri bawah,
   * sesuai 4 tahap: normal (>7 hari), H-7..H-4, H-3..H-2, H-1, dan expired.
   * Admin & Premium tidak menampilkan banner apa pun (return string kosong).
   */
  getTrialBannerHtml() {
    const subInfo = state.getSubscriptionInfo();

    // Admin / Premium aktif / belum login sama sekali -> tidak perlu banner
    if (subInfo.isAdmin || subInfo.isPremium || subInfo.tier === 'guest') return '';

    // MODE READ-ONLY (trial sudah habis & belum premium)
    if (subInfo.isExpired) {
      return `
        <div class="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[11px] text-rose-200 leading-relaxed mb-1">
          <p class="font-bold text-rose-300 mb-1">🔒 Mode Read-only</p>
          <p class="text-rose-200/90 mb-3">Langganan Anda telah berakhir. Data keuangan Anda tetap aman dan dapat dilihat kapan saja.</p>
          <button id="btn-sidebar-subscribe" data-context="reactivate" class="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition shadow">
            Aktifkan Kembali — Rp30.000/bulan
          </button>
        </div>
      `;
    }

    const daysLeft = subInfo.daysLeft;
    if (daysLeft === null || daysLeft === undefined) return '';

    // H-1 (besok berakhir)
    if (daysLeft <= 1) {
      return `
        <div class="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[11px] text-rose-200 leading-relaxed mb-1">
          <p class="font-bold text-rose-300 mb-1">⚠️ Masa gratis Anda berakhir besok</p>
          <p class="text-rose-200/90 mb-3">Jangan kehilangan akses ke dashboard keuangan Anda.<br><strong class="text-white">Rp30.000/bulan</strong></p>
          <button id="btn-sidebar-subscribe" data-context="renew_last" class="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition shadow">
            Aktifkan Langganan
          </button>
        </div>
      `;
    }

    // H-3 s/d H-2
    if (daysLeft <= 3) {
      return `
        <div class="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 leading-relaxed mb-1">
          <p class="font-bold text-amber-300 mb-1">⏰ ${daysLeft} hari lagi masa gratis Anda berakhir</p>
          <p class="text-amber-200/90 mb-1">Semua transaksi dan data keuangan Anda akan tetap tersimpan.</p>
          <p class="text-amber-200/90 mb-3">Aktifkan langganan untuk terus menggunakan DataryWorks.<br><strong class="text-white">Rp30.000/bulan</strong></p>
          <button id="btn-sidebar-subscribe" data-context="renew_urgent" class="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold rounded-lg transition shadow">
            Berlangganan Sekarang
          </button>
        </div>
      `;
    }

    // H-7 s/d H-4
    if (daysLeft <= 7) {
      return `
        <div class="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-[11px] text-blue-200 leading-relaxed mb-1">
          <p class="font-bold text-blue-300 mb-1">🎁 Masa gratis Anda akan berakhir dalam ${daysLeft} hari</p>
          <p class="text-blue-200/90 mb-3">Setelah masa gratis berakhir, Anda dapat melanjutkan penggunaan dengan <strong class="text-white">Rp30.000/bulan</strong>.</p>
          <button id="btn-sidebar-subscribe" data-context="renew_early" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition shadow">
            Lanjutkan Berlangganan
          </button>
        </div>
      `;
    }

    // > 7 hari: tampilan normal, cukup info kecil tanpa CTA mendesak,
    // ditambah link kecil & halus untuk user proaktif yang mau berlangganan
    // lebih awal tanpa menunggu masa trial mendekati habis.
    return `
      <div class="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 font-medium leading-relaxed mb-1 text-center">
        🎉 Masa trial aktif — <strong class="text-white">${daysLeft} hari</strong> tersisa
        <button id="btn-sidebar-subscribe-early" data-context="renew_early" class="block w-full mt-1.5 text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 transition">
          Kelola Langganan
        </button>
      </div>
    `;
  }

  renderActiveView() {
    chartManager.destroyAll();

    switch (state.activeTab) {
      case 'overview':
        renderOverview(state);
        break;
      case 'incomeVsExpense':
        renderIncomeVsExpense(state);
        break;
      case 'categoryAnalysis':
        renderCategoryAnalysis(state);
        break;
      case 'savingGoals':
        renderSavingGoals(state);
        break;
      default:
        renderOverview(state);
    }
  }

  attachSidebarEvents() {
    document.getElementById('nav-overview')?.addEventListener('click', () => state.setActiveTab('overview'));
    document.getElementById('nav-income-expense')?.addEventListener('click', () => state.setActiveTab('incomeVsExpense'));
    document.getElementById('nav-category-analysis')?.addEventListener('click', () => state.setActiveTab('categoryAnalysis'));
    document.getElementById('nav-saving-goals')?.addEventListener('click', () => state.setActiveTab('savingGoals'));

    document.getElementById('filter-toggle-expense')?.addEventListener('click', () => {
      state.analysisType = 'expense';
      const firstCat = (state.categories || []).find(c => c.type === 'expense');
      state.selectedCategory = firstCat ? firstCat.name : 'Daily';
      state.notify();
    });

    document.getElementById('filter-toggle-income')?.addEventListener('click', () => {
      state.analysisType = 'income';
      const firstCat = (state.categories || []).find(c => c.type === 'income');
      state.selectedCategory = firstCat ? firstCat.name : 'Salary';
      state.notify();
    });

    document.getElementById('filter-year')?.addEventListener('change', (e) => {
      state.setFilter('selectedYear', Number(e.target.value));
    });

    document.getElementById('filter-month')?.addEventListener('change', (e) => state.setFilter('selectedMonth', Number(e.target.value)));
    document.getElementById('filter-category')?.addEventListener('change', (e) => state.setFilter('selectedCategory', e.target.value));

    document.getElementById('btn-export-pdf')?.addEventListener('click', () => exportToPDF(state));
    document.getElementById('btn-export-csv')?.addEventListener('click', () => exportToCSV(state));

    document.querySelectorAll('#btn-sidebar-subscribe, #btn-sidebar-subscribe-early').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const context = e.currentTarget.getAttribute('data-context') || 'renew_early';
        this.modalManager.openPaymentModal(context);
      });
    });
  }

  attachGlobalEvents() {
    document.addEventListener('click', async (e) => {
      const target = e.target.closest('button');
      if (!target) return;

      if (target.id === 'btn-user-login' || target.closest('#btn-user-login')) {
        this.modalManager.openAuthModal('login');
      } else if (target.id === 'btn-user-logout' || target.closest('#btn-user-logout')) {
        this.modalManager.openLogoutConfirm(async () => {
          // 1. Hapus sesi dari Supabase Cloud
          await supabaseService.signOut();

          // 2. Paksa kosongkan user aktif & bersihkan LocalStorage lokal
          supabaseService.currentUser = null;
          if (typeof state.clearUserData === 'function') state.clearUserData();

          // 3. Jalankan Auth Guard untuk kembali ke tampilan layar awal & pop-up login
          this.checkAuthGuard();
        });
      }

      if (target.id === 'btn-top-add-transaction') {
        this.modalManager.openAddTransaction('expense');
      } else if (target.id === 'btn-view-all-transactions') {
        this.modalManager.openViewAllTransactions();
      } else if (target.id === 'btn-add-goal-top') {
        this.modalManager.openAddGoal();
      } else if (target.id === 'btn-add-contrib-top') {
        this.modalManager.openAddContribution();
      } else if (target.id === 'btn-refresh') {
        await state.init();
      }
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});