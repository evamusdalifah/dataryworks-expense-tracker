// ==============================================================================
// DATARYWORKS EXPENSE TRACKER - SAVING GOALS VIEW (DYNAMIC TRANSACTION AGGREGATION)
// ==============================================================================

import { chartManager } from '../charts.js';
import { supabaseService } from '../supabase.js';

export function renderSavingGoals(state) {
  // Set active view state
  state.currentView = 'savingGoals';

  // Data User untuk Widget Profil Kanan Atas
  const user = supabaseService.currentUser;
  const role = user?.user_metadata?.role || 'user';
  const isAdmin = role === 'admin';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest User';
  const userPlan = isAdmin ? 'Admin Plan 👑' : (user ? 'Free Plan' : 'Mode Lokal / Demo');
  const avatarInitial = userName.charAt(0).toUpperCase();

  // Helper untuk normalisasi ikon Lucide agar selalu muncul valid
  const normalizeIconName = (iconName) => {
    if (!iconName) return 'target';
    const clean = String(iconName).toLowerCase().trim();
    if (clean.includes('plane') || clean.includes('liburan') || clean.includes('flight')) return 'plane';
    if (clean.includes('home') || clean.includes('rumah') || clean.includes('properti')) return 'home';
    if (clean.includes('car') || clean.includes('mobil') || clean.includes('kendaraan')) return 'car';
    if (clean.includes('laptop') || clean.includes('gadget') || clean.includes('computer')) return 'laptop';
    if (clean.includes('shield') || clean.includes('darurat') || clean.includes('amf')) return 'shield-alert';
    if (clean.includes('grad') || clean.includes('sekolah') || clean.includes('kuliah')) return 'graduation-cap';
    if (clean.includes('trend') || clean.includes('saham') || clean.includes('invest')) return 'trending-up';
    return 'target';
  };

  // 1. Sinkronisasi Custom Target Nominal dari LocalStorage
  const savedTargets = JSON.parse(localStorage.getItem('datary_custom_targets') || '{}');
  
  // Ambil data alokasi setoran bulanan per target dari LocalStorage
  const goalRates = JSON.parse(localStorage.getItem('datary_goal_rates') || '{}');

  // Filter Tab Status Target (Default: 'active')
  if (!state.goalTabFilter) state.goalTabFilter = 'active';

  const rawGoals = state.savingGoals || [];
  const allTrx = state.transactions || [];

  // 2. HITUNG DYNAMICAL TERKUMPUL PER TARGET DARI DATA TRANSAKSI
  const allGoals = rawGoals.map(g => {
    // Sinkronisasi target amount dari local storage jika ada
    let targetAmount = Number(g.targetAmount || g.target_amount || 0);
    if (savedTargets[g.id] !== undefined) {
      targetAmount = Number(savedTargets[g.id]);
    } else if (savedTargets[g.name] !== undefined) {
      targetAmount = Number(savedTargets[g.name]);
    }

    // Hitung total setoran dari transaksi bertipe saving/goal
    const accumulatedTrx = allTrx
      .filter(t => {
        const isSavingType = ['saving', 'goal'].includes((t.type || '').toLowerCase());
        const matchesGoalId = (t.goalId || t.goal_id) && String(t.goalId || t.goal_id) === String(g.id);
        const matchesGoalName = (t.subcategory || t.category_name || t.item || '').toLowerCase().includes((g.name || '').toLowerCase());

        return isSavingType && (matchesGoalId || matchesGoalName);
      })
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Gabungkan saldo awal bawaan (initial savedAmount) + akumulasi transaksi
    const initialSaved = Number(g.initialSavedAmount || g.saved_amount || 0);
    const savedAmount = initialSaved + accumulatedTrx;

    return {
      ...g,
      targetAmount,
      savedAmount
    };
  });

  // 3. Target Aktif Sejati (Hanya yang belum 100% tercapai)
  const activeGoalsList = allGoals.filter(g => {
    const pct = g.targetAmount > 0 ? (g.savedAmount / g.targetAmount) * 100 : 0;
    return pct < 100 && g.status !== 'Completed' && g.status !== 'Selesai';
  });

  // 4. Filter Target Berdasarkan Tab untuk Ditampilkan di Tabel (Active / Completed / All)
  const goalsToDisplay = allGoals
    .filter(g => {
      const pct = g.targetAmount > 0 ? (g.savedAmount / g.targetAmount) * 100 : 0;
      const isCompleted = pct >= 100 || g.status === 'Completed' || g.status === 'Selesai';
      if (state.goalTabFilter === 'active') return !isCompleted;
      if (state.goalTabFilter === 'completed') return isCompleted;
      return true; // 'all'
    })
    .sort((a, b) => {
      const pctA = a.targetAmount > 0 ? (a.savedAmount / a.targetAmount) * 100 : 0;
      const pctB = b.targetAmount > 0 ? (b.savedAmount / b.targetAmount) * 100 : 0;
      return pctB - pctA;
    });

  // 5. Kalkulasi KPI Utama (Dikunci khusus untuk Target Aktif saja)
  const activeSaved = activeGoalsList.reduce((sum, g) => sum + Number(g.savedAmount || 0), 0);
  const activeTarget = activeGoalsList.reduce((sum, g) => sum + Number(g.targetAmount || 0), 0);
  const activeProgress = activeTarget > 0 ? Number(((activeSaved / activeTarget) * 100).toFixed(1)) : 0;
  const activeRemaining = Math.max(0, activeTarget - activeSaved);
  const activeCount = activeGoalsList.length;

  // 6. Kalkulasi Data Grafik Line Kumulatif Sejati
  const savingTrx = allTrx
    .filter(t => ['saving', 'goal'].includes((t.type || '').toLowerCase()))
    .sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));

  let startYear = new Date().getFullYear();
  let endYear = new Date().getFullYear();
  if (savingTrx.length > 0) {
    const dates = savingTrx.map(t => new Date(t.date || t.created_at)).filter(d => !isNaN(d));
    if (dates.length > 0) {
      startYear = Math.min(...dates.map(d => d.getFullYear()));
      endYear = Math.max(...dates.map(d => d.getFullYear()));
    }
  }

  const yearRange = endYear - startYear + 1;
  const growthTrendData = [];

  if (yearRange > 5) {
    let cumulative = 0;
    for (let y = startYear; y <= endYear; y++) {
      const yearSum = savingTrx
        .filter(t => new Date(t.date || t.created_at).getFullYear() === y)
        .reduce((sum, t) => {
          const amt = Number(t.amount || 0);
          const isWithdraw = (t.category || '').toLowerCase().includes('withdraw') || (t.type || '').toLowerCase() === 'expense';
          return sum + (isWithdraw ? -amt : amt);
        }, 0);
      cumulative += yearSum;
      growthTrendData.push({ month: `${y}`, amount: cumulative / 1000000 });
    }
  } else if (yearRange >= 2) {
    let cumulative = 0;
    const qNames = ['Q1', 'Q2', 'Q3', 'Q4'];
    for (let y = startYear; y <= endYear; y++) {
      for (let q = 0; q < 4; q++) {
        const qSum = savingTrx
          .filter(t => {
            const d = new Date(t.date || t.created_at);
            return d.getFullYear() === y && Math.floor(d.getMonth() / 3) === q;
          })
          .reduce((sum, t) => {
            const amt = Number(t.amount || 0);
            const isWithdraw = (t.category || '').toLowerCase().includes('withdraw') || (t.type || '').toLowerCase() === 'expense';
            return sum + (isWithdraw ? -amt : amt);
          }, 0);
        cumulative += qSum;
        growthTrendData.push({ month: `${qNames[q]} ${String(y).substring(2)}`, amount: cumulative / 1000000 });
      }
    }
  } else {
    let cumulative = 0;
    const mShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    for (let y = startYear; y <= endYear; y++) {
      for (let m = 0; m < 12; m++) {
        const mSum = savingTrx
          .filter(t => {
            const d = new Date(t.date || t.created_at);
            return d.getFullYear() === y && d.getMonth() === m;
          })
          .reduce((sum, t) => {
            const amt = Number(t.amount || 0);
            const isWithdraw = (t.category || '').toLowerCase().includes('withdraw') || (t.type || '').toLowerCase() === 'expense';
            return sum + (isWithdraw ? -amt : amt);
          }, 0);
        cumulative += mSum;
        growthTrendData.push({ month: `${mShorts[m]} ${String(y).substring(2)}`, amount: cumulative / 1000000 });
      }
    }
  }

  // 7. Kalkulasi Proyeksi Estimasi Waktu Selesai (Per-Target Deposit Rate)
  const getProjections = () => {
    return activeGoalsList.map(g => {
      const remaining = Math.max(0, g.targetAmount - g.savedAmount);
      const currentRate = goalRates[g.id] || goalRates[g.name] || 1500000;
      const validRate = currentRate > 0 ? currentRate : 1;
      
      const monthsNeeded = Math.ceil(remaining / validRate);
      
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + monthsNeeded);
      const dateFormatted = targetDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

      return {
        id: g.id,
        name: g.name,
        remaining,
        monthlyRate: currentRate,
        monthsNeeded,
        estimatedDate: dateFormatted,
        icon: normalizeIconName(g.icon)
      };
    });
  };

  const projections = getProjections();

  const container = document.getElementById('main-view-content');
  if (!container) return;

  container.innerHTML = `
    <!-- HEADER BAR -->
    <div class="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-300 gap-4">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-black text-slate-900 tracking-tight">TARGET TABUNGAN (SAVING GOALS)</h1>
        <span class="px-2.5 py-0.5 text-xs font-bold text-emerald-800 bg-emerald-100/90 rounded-full border border-emerald-300 shadow-sm">
          ${activeCount} Target Aktif
        </span>
      </div>

      <!-- AKSIONAL KANAN ATAS: USER PROFILE + TAMBAH TRANSAKSI -->
      <div class="flex items-center gap-3">
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

    <!-- BANNER CATATAN INFORMASI -->
    <div class="mt-4 flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-medium shadow-sm">
      <i data-lucide="info" class="w-4 h-4 text-emerald-700 shrink-0"></i>
      <span>Pantau perkembangan alokasi impian dan simpanan dana darurat Anda secara real-time.</span>
    </div>

    <!-- 4 KARTU KPI UTAMA TABUNGAN -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-emerald-600 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-white shrink-0 shadow-inner">
            <i data-lucide="wallet" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">TOTAL TERKUMPUL (AKTIF)</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${state.formatRupiah(activeSaved)}</div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-blue-600 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center text-white shrink-0 shadow-inner">
            <i data-lucide="target" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">TOTAL TARGET (AKTIF)</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${state.formatRupiah(activeTarget)}</div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-amber-500 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-inner font-bold text-base">
            %
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">PROGRES KESELURUHAN</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${activeProgress}%</div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-3.5 border border-slate-300 border-t-4 border-t-purple-600 shadow-md shadow-slate-200/80 hover:shadow-lg transition">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center text-white shrink-0 shadow-inner">
            <i data-lucide="flag" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-0.5">TARGET AKTIF</span>
            <div class="text-[17px] font-black text-slate-900 leading-tight">${activeCount} Target</div>
          </div>
        </div>
      </div>
    </div>

    <!-- BARIS 1: PROGRES GAUGE & TABEL DAFTAR TARGET -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 items-stretch">
      <div class="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex flex-col justify-between">
        <h3 class="font-bold text-slate-900 text-sm tracking-tight mb-3">Progres Tabungan (Target Aktif)</h3>

        <div class="h-48 w-full relative flex items-center justify-center">
          <canvas id="overall-goal-gauge-chart"></canvas>
        </div>

        <div class="space-y-2.5 mt-4 pt-3 border-t border-slate-200 text-xs font-medium">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-slate-600">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-800 shrink-0"></span>
              <span>Total Terkumpul</span>
            </div>
            <span class="font-bold text-slate-900">${state.formatRupiah(activeSaved)}</span>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-slate-600">
              <span class="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0"></span>
              <span>Total Target</span>
            </div>
            <span class="font-bold text-slate-900">${state.formatRupiah(activeTarget)}</span>
          </div>

          <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span class="text-slate-600 font-medium">Sisa Kekurangan Target</span>
            <span class="font-bold text-emerald-800">${state.formatRupiah(activeRemaining)}</span>
          </div>
        </div>
      </div>

      <div class="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex flex-col justify-between">
        <div>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h3 class="font-bold text-slate-900 text-sm tracking-tight">Progres Per Target (Progress by Goal)</h3>
            
            <div class="flex items-center gap-2">
              <div class="inline-flex p-0.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold">
                <button class="btn-goal-tab px-2 py-1 rounded-md transition ${state.goalTabFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}" data-tab="all">Semua</button>
                <button class="btn-goal-tab px-2 py-1 rounded-md transition ${state.goalTabFilter === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}" data-tab="active">Aktif</button>
                <button class="btn-goal-tab px-2 py-1 rounded-md transition ${state.goalTabFilter === 'completed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}" data-tab="completed">Selesai 🎉</button>
              </div>

              <button id="btn-add-goal-top" class="text-xs font-bold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1 shrink-0">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> Tambah Target
              </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs table-fixed">
              <thead>
                <tr class="text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                  <th class="pb-3">Target</th>
                  <th class="pb-3 w-24 text-right">Terkumpul</th>
                  <th class="pb-3 w-24 text-right">Target</th>
                  <th class="pb-3 w-28 text-center">Progres</th>
                  <th class="pb-3 w-20 text-center">Status</th>
                  <th class="pb-3 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${goalsToDisplay.length === 0 ? `
                  <tr><td colspan="6" class="py-6 text-center text-slate-400 font-medium">Tidak ada target dalam kategori ini.</td></tr>
                ` : goalsToDisplay.map(g => {
                  const rawPct = g.targetAmount > 0 ? (g.savedAmount / g.targetAmount) * 100 : 0;
                  const pct = Math.min(100, rawPct).toFixed(1);
                  const isCompleted = rawPct >= 100 || g.status === 'Completed' || g.status === 'Selesai';
                  const isOnTrack = isCompleted || g.status === 'On Track' || rawPct >= 30;
                  const validIcon = normalizeIconName(g.icon);

                  return `
                    <tr class="hover:bg-slate-50 transition">
                      <td class="py-2.5 flex items-center gap-2 font-semibold text-slate-800">
                        <div class="w-6 h-6 rounded-md ${isCompleted ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-50 text-emerald-800 border-emerald-200'} border flex items-center justify-center shrink-0">
                          <i data-lucide="${isCompleted ? 'check-circle-2' : validIcon}" class="w-3.5 h-3.5"></i>
                        </div>
                        <span class="truncate ${isCompleted ? 'line-through text-slate-500' : ''}" title="${g.name}">${g.name}</span>
                      </td>
                      <td class="py-2.5 text-right font-bold text-slate-900">${state.formatRupiah(g.savedAmount)}</td>
                      <td class="py-2.5 text-right font-medium text-slate-500">${state.formatRupiah(g.targetAmount)}</td>
                      <td class="py-2.5 px-2">
                        <div class="flex items-center gap-1.5">
                          <span class="w-8 text-right font-bold text-slate-700 text-[10px]">${pct}%</span>
                          <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div class="h-full ${isCompleted ? 'bg-emerald-600' : (isOnTrack ? 'bg-emerald-700' : 'bg-amber-500')} rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                          </div>
                        </div>
                      </td>
                      <td class="py-2.5 text-center">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : (isOnTrack ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200')}">
                          ${isCompleted ? 'Selesai 🎉' : (g.status || 'On Track')}
                        </span>
                      </td>
                      <td class="py-2.5 text-center">
                        <div class="flex items-center justify-center gap-1">
                          <button class="btn-edit-goal p-1 text-slate-400 hover:text-emerald-800 transition rounded-lg hover:bg-emerald-50" data-id="${g.id}" title="Edit Target">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                          </button>
                          <button class="btn-delete-goal p-1 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50" data-id="${g.id}" data-name="${g.name}" title="Hapus Target">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 text-center">
          <p class="text-[11px] text-slate-500 font-medium">Klik ikon pensil untuk mengubah target nominal atau ikon tempat sampah untuk menghapus target.</p>
        </div>
      </div>
    </div>

    <!-- MODAL EDIT TARGET TABUNGAN -->
    <div id="modal-edit-goal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden">
      <div class="bg-white rounded-2xl p-6 border border-slate-300 shadow-2xl max-w-md w-full mx-4 transform transition-all">
        <div class="flex items-center justify-between pb-3 border-b border-slate-200">
          <h3 class="font-bold text-slate-900 text-base">Edit Target Tabungan</h3>
          <button id="btn-close-edit-modal" class="text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <form id="form-edit-goal" class="mt-4 space-y-4">
          <input type="hidden" id="edit-goal-id" />

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Nama Target</label>
            <input type="text" id="edit-goal-name" required class="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 font-semibold text-slate-800" />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Nominal Target (Rp)</label>
            <input type="number" id="edit-goal-target" required step="100000" class="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-600 font-black text-slate-900 text-sm" />
          </div>

          <div class="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button type="button" id="btn-cancel-edit-modal" class="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Batal</button>
            <button type="submit" class="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow transition">Simpan Perubahan</button>
          </div>
        </form>
      </div>
    </div>

    <!-- BARIS 2: SPLIT 6:6 (GRAFIK LINE KUMULATIF & PROYEKSI PER TARGET) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 items-stretch">
      <!-- 1. Pertumbuhan Tabungan Area Chart (6 Columns) -->
      <div class="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex flex-col justify-between">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-slate-900 text-sm tracking-tight">Pertumbuhan Tabungan (History Kumulatif)</h3>
          <span class="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-md">All-Time (${startYear} - ${endYear})</span>
        </div>

        <div class="h-60 w-full relative">
          <canvas id="savings-over-time-chart"></canvas>
        </div>

        <div class="mt-3 flex items-center gap-2 text-xs text-slate-700 bg-slate-100/90 p-2.5 rounded-xl border border-slate-200">
          <i data-lucide="trending-up" class="w-4 h-4 text-emerald-700 shrink-0"></i>
          <span>Grafik mencerminkan akumulasi simpanan riil (${yearRange >= 2 && yearRange <= 5 ? 'Per Kuartal' : (yearRange > 5 ? 'Per Tahun' : 'Per Bulan')}).</span>
        </div>
      </div>

      <!-- 2. Proyeksi & Estimasi Waktu Selesai (6 Columns) INDIVIDUAL INPUT PER TARGET -->
      <div class="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3 gap-2">
            <h3 class="font-bold text-slate-900 text-sm tracking-tight">Proyeksi Estimasi Waktu Selesai</h3>
            <span class="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">Alokasi Per Target</span>
          </div>

          <div id="projection-list-container" class="space-y-3 mt-3">
            ${projections.length === 0 ? `
              <div class="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium">
                🎉 Semua target tabungan Anda telah tercapai!
              </div>
            ` : projections.map(p => `
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3 transition hover:border-emerald-300">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold shrink-0">
                    <i data-lucide="${p.icon.toLowerCase()}" class="w-4 h-4"></i>
                  </div>
                  <div>
                    <h4 class="font-bold text-slate-900 text-xs">${p.name}</h4>
                    <p class="text-[11px] text-slate-500">Sisa: <strong class="text-slate-800 font-bold">${state.formatRupiah(p.remaining)}</strong></p>
                  </div>
                </div>

                <div class="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                  <!-- INPUT KHUSUS PER TARGET -->
                  <div class="flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 rounded-lg shadow-sm">
                    <span class="text-[10px] font-bold text-slate-500">Rp/bln:</span>
                    <input 
                      type="number" 
                      step="100000" 
                      min="100000" 
                      value="${p.monthlyRate}" 
                      data-id="${p.id}"
                      data-name="${p.name}"
                      data-remaining="${p.remaining}"
                      class="input-individual-goal-rate w-20 text-xs font-bold text-emerald-900 bg-transparent focus:outline-none text-right"
                    />
                  </div>

                  <div class="text-right shrink-0">
                    <span class="block font-black text-emerald-800 text-xs projection-date" data-id="${p.id}">${p.estimatedDate}</span>
                    <span class="text-[10px] font-semibold text-slate-500 projection-months" data-id="${p.id}">(~${p.monthsNeeded} bulan lagi)</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="mt-4 p-3 bg-emerald-50/90 rounded-xl border border-emerald-300 text-xs text-emerald-950 font-medium">
          💡 Tentukan alokasi <strong>Rp/bln</strong> khusus pada masing-masing target untuk simulasi target yang lebih realistis dan fleksibel!
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
          Saat ini Anda telah mengumpulkan total tabungan target aktif sebesar <strong class="text-emerald-800 font-bold text-sm">${state.formatRupiah(activeSaved)}</strong> dari total target aktif <strong class="text-slate-900 font-bold text-sm">${state.formatRupiah(activeTarget)}</strong>. Progres akumulasi pencapaian target aktif Anda saat ini mencapai <strong class="text-emerald-800 font-bold text-sm">${activeProgress}%</strong>.
        </p>
      </div>
    </div>
  `;

  // --- EVENT LISTENER INPUT INDIVIDUAL ALOKASI SETORAN BULANAN ---
  document.querySelectorAll('.input-individual-goal-rate').forEach(input => {
    input.addEventListener('input', (e) => {
      const goalId = e.target.getAttribute('data-id');
      const goalName = e.target.getAttribute('data-name');
      const remaining = Number(e.target.getAttribute('data-remaining')) || 0;
      const newRate = Number(e.target.value) || 0;

      const currentRates = JSON.parse(localStorage.getItem('datary_goal_rates') || '{}');
      currentRates[goalId] = newRate;
      currentRates[goalName] = newRate;
      localStorage.setItem('datary_goal_rates', JSON.stringify(currentRates));

      const validRate = newRate > 0 ? newRate : 1;
      const monthsNeeded = Math.ceil(remaining / validRate);

      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + monthsNeeded);
      const dateFormatted = targetDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

      const dateEl = document.querySelector(`.projection-date[data-id="${goalId}"]`);
      const monthEl = document.querySelector(`.projection-months[data-id="${goalId}"]`);

      if (dateEl) dateEl.textContent = dateFormatted;
      if (monthEl) monthEl.textContent = `(~${monthsNeeded} bulan lagi)`;
    });
  });

  // --- EVENT LISTENER TOGGLE TAB FILTER STATUS TARGET ---
  document.querySelectorAll('.btn-goal-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      state.goalTabFilter = e.currentTarget.getAttribute('data-tab');
      renderSavingGoals(state);
    });
  });

  // --- EVENT LISTENER MODAL EDIT TARGET ---
  const modal = document.getElementById('modal-edit-goal');
  const formEdit = document.getElementById('form-edit-goal');

  document.querySelectorAll('.btn-edit-goal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const goalId = e.currentTarget.getAttribute('data-id');
      const targetGoal = allGoals.find(g => String(g.id) === String(goalId));
      if (!targetGoal) return;

      document.getElementById('edit-goal-id').value = targetGoal.id;
      document.getElementById('edit-goal-name').value = targetGoal.name;
      document.getElementById('edit-goal-target').value = targetGoal.targetAmount;

      modal.classList.remove('hidden');
    });
  });

  const closeModal = () => modal.classList.add('hidden');
  document.getElementById('btn-close-edit-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-edit-modal')?.addEventListener('click', closeModal);

  formEdit?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-goal-id').value;
    const name = document.getElementById('edit-goal-name').value;
    const targetAmount = Number(document.getElementById('edit-goal-target').value);

    const targetGoal = allGoals.find(g => String(g.id) === String(id));
    if (targetGoal) {
      targetGoal.name = name;
      targetGoal.targetAmount = targetAmount;
    }

    const currentCustoms = JSON.parse(localStorage.getItem('datary_custom_targets') || '{}');
    currentCustoms[id] = targetAmount;
    currentCustoms[name] = targetAmount;
    localStorage.setItem('datary_custom_targets', JSON.stringify(currentCustoms));

    await supabaseService.updateSavingGoal(id, { name, targetAmount });

    closeModal();
    renderSavingGoals(state);
  });

  // --- EVENT LISTENER HAPUS TARGET TABUNGAN ---
  document.querySelectorAll('.btn-delete-goal').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');

      if (confirm(`Apakah Anda yakin ingin menghapus target "${name}"?`)) {
        if (typeof state.deleteGoal === 'function') {
          await state.deleteGoal(id, name);
        } else {
          state.savingGoals = state.savingGoals.filter(g => String(g.id) !== String(id) && g.name !== name);
          if (supabaseService && supabaseService.isConnected) {
            await supabaseService.deleteSavingGoal(id, name);
          }
          if (typeof state.notify === 'function') state.notify();
        }
        renderSavingGoals(state);
      }
    });
  });

  // Render Charts & Icons
  setTimeout(() => {
    if (chartManager) {
      chartManager.renderGoalProgressGauge('overall-goal-gauge-chart', Number(activeProgress));
      if (typeof chartManager.renderSavingsGrowthArea === 'function') {
        chartManager.renderSavingsGrowthArea('savings-over-time-chart', growthTrendData);
      }
    }
    if (window.lucide) window.lucide.createIcons();
  }, 50);
}