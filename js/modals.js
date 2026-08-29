// ==============================================================================
// DATARYWORKS EXPENSE TRACKER - MODALS MANAGER (FIXED AUTH & NO-CLOSE LOGIC)
// ==============================================================================

import { supabaseService } from './supabase.js';

export class ModalManager {
  constructor(state) {
    this.state = state;
    this.container = document.getElementById('modal-container');
    this.activeType = 'expense'; // 'income' | 'expense' | 'saving'
  }

  close() {
    const container = document.getElementById('modal-container');
    if (container) {
      container.innerHTML = '';
      container.classList.add('hidden');
    }
  }

  open(contentHtml, maxWidth = 'max-w-lg') {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A] animate-fadeIn">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full ${maxWidth} overflow-hidden animate-scaleIn max-h-[90vh] flex flex-col">
          ${contentHtml}
        </div>
      </div>
    `;
    this.container.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
    this.attachCloseHandlers();
  }

  attachCloseHandlers() {
    const btnCloses = this.container.querySelectorAll('.btn-modal-close');
    btnCloses.forEach(btn => btn.addEventListener('click', () => this.close()));
  }

  getActiveSavingGoals() {
    return (this.state.savingGoals || []).filter(g => {
      const targetAmt = Number(g.targetAmount || g.target_amount || 0);
      const savedAmt = Number(g.savedAmount || g.current_amount || 0);
      const rawPct = targetAmt > 0 ? (savedAmt / targetAmt) * 100 : 0;
      return rawPct < 100 && g.status !== 'Completed' && g.status !== 'Selesai';
    });
  }

  // --- 1. ADD TRANSACTION MODAL ---
  openAddTransaction(defaultType = 'expense') {
    this.activeType = defaultType;

    const html = `
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold text-slate-900">Tambah Transaksi Baru</h3>
          <p class="text-xs text-slate-500 mt-0.5">Catat pemasukan, pengeluaran, atau alokasi tabungan.</p>
        </div>
        <button class="btn-modal-close text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-100">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <form id="form-add-trx" class="p-6 space-y-4 overflow-y-auto flex-1">
        <div>
          <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Tipe Transaksi</label>
          <div class="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
            <button type="button" id="tab-type-income" class="py-2 text-xs font-bold rounded-lg transition ${this.activeType === 'income' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
              🟢 Income
            </button>
            <button type="button" id="tab-type-expense" class="py-2 text-xs font-bold rounded-lg transition ${this.activeType === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
              🔴 Expense
            </button>
            <button type="button" id="tab-type-saving" class="py-2 text-xs font-bold rounded-lg transition ${this.activeType === 'saving' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
              🔵 Tabung / Invest
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
            <input type="date" id="input-trx-date" required value="${new Date().toISOString().split('T')[0]}" class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Item / Keterangan</label>
            <input type="text" id="input-trx-item" required placeholder="misal: Makan Siang, Gaji, Saham" class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Nominal (Rp)</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-bold text-slate-400">Rp</span>
            <input type="number" id="input-trx-amount" required min="1000" step="1000" placeholder="50.000" class="w-full pl-10 pr-3.5 py-2.5 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
          </div>
        </div>

        <div id="dynamic-category-container" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${this.renderCategoryDropdowns(this.activeType)}
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button type="button" class="btn-modal-close px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition">
            Batal
          </button>
          <button type="submit" class="px-5 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow transition flex items-center gap-2">
            <i data-lucide="check" class="w-4 h-4"></i>
            Simpan Transaksi
          </button>
        </div>
      </form>
    `;

    this.open(html, 'max-w-lg');
    this.attachAddTransactionEvents();
  }

  renderCategoryDropdowns(type) {
    if (type === 'saving') {
      const activeGoals = this.getActiveSavingGoals();
      return `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
          <input type="text" value="Saving Goals" disabled readonly class="w-full px-3.5 py-2 text-xs bg-slate-100 border border-slate-200 text-slate-500 rounded-xl font-bold cursor-not-allowed">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Subkategori (Target Tabungan)</label>
          <select id="input-trx-goal" required class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
            ${activeGoals.length === 0 ? `
              <option value="">-- Tidak ada target aktif --</option>
            ` : activeGoals.map(g => `
              <option value="${g.id}" data-name="${g.name}">${g.name} (${this.state.formatRupiah(g.savedAmount || g.current_amount || 0)})</option>
            `).join('')}
          </select>
        </div>
      `;
    }

    const cats = (this.state.categories || []).filter(c => c.type === type);
    const selectedCat = cats[0] || { name: 'Others', subcategories: ['General'] };

    return `
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-xs font-semibold text-slate-700">Kategori</label>
          <button type="button" id="btn-open-cat-manager" class="text-[10px] font-bold text-emerald-800 hover:underline inline-flex items-center gap-1">
            <i data-lucide="settings" class="w-3 h-3"></i> Kelola Kategori
          </button>
        </div>
        <select id="input-trx-category" required class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
          ${cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
        </select>
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Subkategori</label>
        <select id="input-trx-subcategory" class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
          ${(selectedCat.subcategories || []).map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>
    `;
  }

  attachAddTransactionEvents() {
    const tabIncome = document.getElementById('tab-type-income');
    const tabExpense = document.getElementById('tab-type-expense');
    const tabSaving = document.getElementById('tab-type-saving');
    const catContainer = document.getElementById('dynamic-category-container');

    const updateType = (newType) => {
      this.activeType = newType;
      catContainer.innerHTML = this.renderCategoryDropdowns(newType);
      this.attachCategoryChange();

      [tabIncome, tabExpense, tabSaving].forEach(btn => {
        btn.className = 'py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900';
      });

      if (newType === 'income') tabIncome.className = 'py-2 text-xs font-bold rounded-lg transition bg-white text-emerald-700 shadow-sm';
      if (newType === 'expense') tabExpense.className = 'py-2 text-xs font-bold rounded-lg transition bg-white text-rose-600 shadow-sm';
      if (newType === 'saving') tabSaving.className = 'py-2 text-xs font-bold rounded-lg transition bg-white text-blue-700 shadow-sm';
    };

    if (tabIncome) tabIncome.addEventListener('click', () => updateType('income'));
    if (tabExpense) tabExpense.addEventListener('click', () => updateType('expense'));
    if (tabSaving) tabSaving.addEventListener('click', () => updateType('saving'));

    this.attachCategoryChange();

    const form = document.getElementById('form-add-trx');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('input-trx-date').value;
        const item = document.getElementById('input-trx-item').value;
        const amount = document.getElementById('input-trx-amount').value;

        let category = 'Others';
        let subcategory = 'General';
        let goalId = null;
        let goalName = null;

        if (this.activeType === 'saving') {
          const goalSelect = document.getElementById('input-trx-goal');
          if (!goalSelect || !goalSelect.value) {
            alert('Silakan pilih target tabungan yang masih aktif.');
            return;
          }
          goalId = goalSelect.value;
          const selectedOption = goalSelect.options[goalSelect.selectedIndex];
          goalName = selectedOption.getAttribute('data-name') || goalSelect.value;

          category = 'Saving Goals';
          subcategory = goalName;
        } else {
          category = document.getElementById('input-trx-category')?.value || 'Others';
          subcategory = document.getElementById('input-trx-subcategory')?.value || 'General';
        }

        await this.state.addTransaction({
          date,
          item,
          amount: Number(amount),
          type: this.activeType,
          category,
          subcategory,
          paymentMethod: 'Cash',
          goalId,
          goalName
        });

        this.close();
      });
    }
  }

  attachCategoryChange() {
    const catSelect = document.getElementById('input-trx-category');
    const subcatSelect = document.getElementById('input-trx-subcategory');
    const btnCatManager = document.getElementById('btn-open-cat-manager');

    if (btnCatManager) {
      btnCatManager.addEventListener('click', () => this.openCategoryManager());
    }

    if (catSelect && subcatSelect) {
      catSelect.addEventListener('change', () => {
        const selected = (this.state.categories || []).find(c => c.name === catSelect.value);
        const subcats = selected ? (selected.subcategories || []) : [];
        subcatSelect.innerHTML = subcats.map(s => `<option value="${s}">${s}</option>`).join('');
      });
    }
  }

  // --- 2. CATEGORY MANAGER MODAL ---
  openCategoryManager() {
    const categories = this.state.categories || [];

    const html = `
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold text-slate-900">Kelola Kategori & Subkategori</h3>
          <p class="text-xs text-slate-500 mt-0.5">Tambah, lihat, atau hapus kategori finansial Anda.</p>
        </div>
        <button class="btn-modal-close text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-100">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="p-6 space-y-5 overflow-y-auto flex-1 max-h-[65vh]">
        <div class="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
          <h4 class="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
            <i data-lucide="plus-circle" class="w-4 h-4 text-emerald-700"></i>
            Tambah Kategori / Subkategori Baru
          </h4>

          <form id="form-manager-add-cat" class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[10px] font-bold text-slate-600 mb-1">Tipe</label>
                <select id="input-mgr-type" class="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-emerald-600">
                  <option value="expense">Pengeluaran (Expense)</option>
                  <option value="income">Pemasukan (Income)</option>
                </select>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-600 mb-1">Nama Kategori</label>
                <input type="text" id="input-mgr-cat-name" required placeholder="misal: Gift, Investasi" class="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-emerald-600" />
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-bold text-slate-600 mb-1">Subkategori (Pisahkan dengan koma)</label>
              <input type="text" id="input-mgr-subcats" placeholder="misal: Main, Side, Bonus" class="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-emerald-600" />
            </div>

            <button type="submit" class="w-full py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition shadow-sm">
              + Simpan Kategori Baru
            </button>
          </form>
        </div>

        <div class="space-y-2.5">
          <h4 class="text-xs font-bold text-slate-700">Daftar Kategori Terdaftar</h4>

          ${categories.map(c => `
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-300 transition">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shrink-0 text-xs" style="background-color: ${c.color || '#64748b'}">
                  ${c.type === 'income' ? '📈' : '📉'}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h5 class="font-bold text-slate-900 text-xs">${c.name}</h5>
                    <span class="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded ${c.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                      ${c.type}
                    </span>
                    ${c.isSystem ? '<span class="px-1.5 py-0.2 text-[9px] font-bold bg-slate-200 text-slate-600 rounded">System</span>' : ''}
                  </div>
                  <p class="text-[10px] text-slate-500 mt-0.5">
                    Subkategori: ${(c.subcategories || []).join(', ') || '-'}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-1">
                ${!c.isSystem ? `
                  <button data-id="${c.id}" data-name="${c.name}" class="btn-delete-cat p-1.5 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50" title="Hapus Kategori">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                ` : `
                  <span class="text-[10px] text-slate-400 font-medium px-2 py-1 bg-slate-100 rounded-lg">Locked</span>
                `}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
        <span class="text-slate-500">Kategori bawaan (System) tidak dapat dihapus.</span>
        <button class="btn-modal-close px-4 py-2 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
          Tutup
        </button>
      </div>
    `;

    this.open(html, 'max-w-lg');

    const formAdd = document.getElementById('form-manager-add-cat');
    if (formAdd) {
      formAdd.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('input-mgr-type').value;
        const name = document.getElementById('input-mgr-cat-name').value.trim();
        const subcatRaw = document.getElementById('input-mgr-subcats').value;

        const subcategories = subcatRaw 
          ? subcatRaw.split(',').map(s => s.trim()).filter(Boolean)
          : ['General'];

        await this.state.addCustomCategory({ name, type, subcategory: subcategories[0] });

        if (subcategories.length > 1) {
          for (let i = 1; i < subcategories.length; i++) {
            await this.state.addCustomSubcategory(name, subcategories[i]);
          }
        }

        this.openCategoryManager();
      });
    }

    this.container.querySelectorAll('.btn-delete-cat').forEach(btn => {
      btn.addEventListener('click', async () => {
        const catId = btn.getAttribute('data-id');
        const catName = btn.getAttribute('data-name');

        if (confirm(`Hapus kategori "${catName}"? Semua riwayat transaksi berkategori ini akan dipindahkan ke "Others".`)) {
          await this.state.deleteCategory(catId);
          this.openCategoryManager();
        }
      });
    });
  }

  // --- 3. ADD SAVING GOAL MODAL ---
  openAddGoal() {
    const html = `
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold text-slate-900">Tambah Target Tabungan / Investasi</h3>
          <p class="text-xs text-slate-500 mt-0.5">Tetapkan target finansial dan pantau progresnya.</p>
        </div>
        <button class="btn-modal-close text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-100">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <form id="form-add-goal" class="p-6 space-y-4 overflow-y-auto flex-1">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Target</label>
          <input type="text" id="input-goal-name" required placeholder="misal: Beli Mobil, Dana Pensiun, Liburan" class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Target Nominal (Rp)</label>
            <input type="number" id="input-goal-target" required min="100000" step="50000" placeholder="10000000" class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Saldo Awal (Rp - Opsional)</label>
            <input type="number" id="input-goal-saved" min="0" step="50000" placeholder="0" class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Target Tanggal / Deadline</label>
            <input type="date" id="input-goal-deadline" value="${new Date().toISOString().split('T')[0]}" class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Ikon</label>
            <select id="input-goal-icon" class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
              <option value="Plane">✈️ Liburan (Plane)</option>
              <option value="Home">🏠 Rumah / Properti (Home)</option>
              <option value="GraduationCap">🎓 Pendidikan (Graduation)</option>
              <option value="ShieldAlert">🛡️ Dana Darurat (Shield)</option>
              <option value="Car">🚗 Kendaraan (Car)</option>
              <option value="TrendingUp">📈 Portofolio Saham/Invest (Trending)</option>
            </select>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button type="button" class="btn-modal-close px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition">
            Batal
          </button>
          <button type="submit" id="btn-submit-goal" class="px-5 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow transition">
            Simpan Target
          </button>
        </div>
      </form>
    `;

    this.open(html, 'max-w-lg');

    const form = document.getElementById('form-add-goal');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('btn-submit-goal');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Menyimpan...';
        }

        const name = document.getElementById('input-goal-name').value.trim();
        const targetAmount = Number(document.getElementById('input-goal-target').value) || 0;
        const savedAmount = Number(document.getElementById('input-goal-saved').value) || 0;
        const deadline = document.getElementById('input-goal-deadline').value;
        const icon = document.getElementById('input-goal-icon').value;

        try {
          await this.state.addGoal({ name, targetAmount, savedAmount, deadline, icon });
          this.close();
        } catch (err) {
          alert('Gagal menyimpan target: ' + err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Simpan Target';
          }
        }
      });
    }
  }

  // --- 4. ADD CONTRIBUTION MODAL ---
  openAddContribution() {
    const activeGoals = this.getActiveSavingGoals();

    const html = `
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold text-slate-900">Setor Tabungan / Investasi</h3>
          <p class="text-xs text-slate-500 mt-0.5">Catat uang yang kamu sisihkan untuk target tabungan.</p>
        </div>
        <button class="btn-modal-close text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-100">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <form id="form-add-contrib" class="p-6 space-y-4 overflow-y-auto flex-1">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Target Tabungan</label>
          <select id="input-contrib-goal" required class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
            ${activeGoals.length === 0 ? `
              <option value="">-- Tidak ada target aktif (Semua Target Selesai) --</option>
            ` : activeGoals.map(g => `
              <option value="${g.id}" data-name="${g.name}">${g.name} (Terkumpul: ${this.state.formatRupiah(g.savedAmount || g.current_amount || 0)})</option>
            `).join('')}
          </select>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Tanggal Setor</label>
            <input type="date" id="input-contrib-date" required value="${new Date().toISOString().split('T')[0]}" class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nominal (Rp)</label>
            <input type="number" id="input-contrib-amount" required min="10000" step="10000" placeholder="500000" class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Catatan (Opsional)</label>
          <input type="text" id="input-contrib-note" placeholder="misal: Alokasi gaji, bonus sampingan" class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button type="button" class="btn-modal-close px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition">
            Batal
          </button>
          <button type="submit" class="px-5 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow transition">
            Simpan Setoran
          </button>
        </div>
      </form>
    `;

    this.open(html, 'max-w-lg');

    const form = document.getElementById('form-add-contrib');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const goalSelect = document.getElementById('input-contrib-goal');
        if (!goalSelect || !goalSelect.value) {
          alert('Silakan pilih target tabungan yang masih aktif.');
          return;
        }

        const goalId = goalSelect.value;
        const selectedOption = goalSelect.options[goalSelect.selectedIndex];
        const goalName = selectedOption.getAttribute('data-name') || goalSelect.value;
        const date = document.getElementById('input-contrib-date').value;
        const amount = Number(document.getElementById('input-contrib-amount').value) || 0;
        const note = document.getElementById('input-contrib-note').value;

        if (typeof this.state.addContribution === 'function') {
          await this.state.addContribution({ goalId, goalName, date, amount, paymentMethod: 'Cash', note });
        } else {
          await this.state.addTransaction({
            date,
            item: note || `Setoran Tabungan: ${goalName}`,
            amount,
            type: 'saving',
            category: 'Saving Goals',
            subcategory: goalName,
            goalId,
            goalName
          });
        }
        this.close();
      });
    }
  }

  // --- 5. VIEW ALL TRANSACTIONS MODAL ---
  openViewAllTransactions() {
    let currentSearch = '';
    let currentType = 'all';
    let currentCategory = 'all';
    let currentSubcategory = 'all';
    let displayLimit = 50;

    const updateCategoryDropdown = () => {
      const catSelect = document.getElementById('select-filter-cat');
      if (!catSelect) return;

      let cats = [];
      if (currentType === 'all') {
        cats = Array.from(new Set((this.state.transactions || []).map(t => t.category).filter(Boolean)));
      } else if (currentType === 'saving') {
        cats = ['Saving Goals'];
      } else {
        cats = (this.state.categories || [])
          .filter(c => c.type === currentType)
          .map(c => c.name);
      }

      catSelect.innerHTML = `
        <option value="all">Semua Kategori</option>
        ${cats.map(c => `<option value="${c}">${c}</option>`).join('')}
      `;
      catSelect.value = 'all';
      currentCategory = 'all';

      updateSubcategoryDropdown();
    };

    const updateSubcategoryDropdown = () => {
      const subcatSelect = document.getElementById('select-filter-subcat');
      if (!subcatSelect) return;

      let subcats = [];

      if (currentCategory === 'Saving Goals' || currentType === 'saving') {
        subcats = (this.state.savingGoals || []).map(g => g.name);
      } else if (currentCategory !== 'all') {
        const found = (this.state.categories || []).find(c => c.name === currentCategory);
        subcats = found ? (found.subcategories || []) : [];
      } else {
        subcats = Array.from(new Set((this.state.transactions || []).map(t => t.subcategory).filter(Boolean)));
      }

      subcatSelect.innerHTML = `
        <option value="all">Semua Subkategori</option>
        ${subcats.map(s => `<option value="${s}">${s}</option>`).join('')}
      `;
      subcatSelect.value = 'all';
      currentSubcategory = 'all';
    };

    const renderList = () => {
      let filtered = [...(this.state.transactions || [])];

      if (currentSearch) {
        const q = currentSearch.toLowerCase();
        filtered = filtered.filter(t => 
          (t.item || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q) ||
          (t.subcategory || '').toLowerCase().includes(q) ||
          (t.amount || '').toString().includes(q)
        );
      }

      if (currentType !== 'all') {
        filtered = filtered.filter(t => (t.type || 'expense').toLowerCase() === currentType);
      }

      if (currentCategory !== 'all') {
        filtered = filtered.filter(t => (t.category || '').toLowerCase() === currentCategory.toLowerCase());
      }

      if (currentSubcategory !== 'all') {
        filtered = filtered.filter(t => (t.subcategory || '').toLowerCase() === currentSubcategory.toLowerCase());
      }

      const tbody = document.getElementById('all-transactions-tbody');
      const countEl = document.getElementById('all-transactions-count');
      const loadMoreBtn = document.getElementById('btn-load-more-trx');

      const totalItems = filtered.length;
      if (countEl) countEl.textContent = `(${totalItems})`;
      if (!tbody) return;

      if (totalItems === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-8 text-slate-400 text-xs font-medium">
              Tidak ada transaksi yang cocok dengan filter.
            </td>
          </tr>
        `;
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
        return;
      }

      const sliced = filtered.slice(0, displayLimit);

      tbody.innerHTML = sliced.map(t => {
        const isExpense = (t.type || 'expense').toLowerCase() === 'expense';
        const isIncome = (t.type || '').toLowerCase() === 'income';
        const amountPrefix = isExpense ? '-' : isIncome ? '+' : '';
        const amountColor = isExpense ? 'text-rose-600' : isIncome ? 'text-emerald-700' : 'text-blue-700';

        return `
          <tr class="border-b border-slate-100 hover:bg-slate-50 transition text-xs" id="row-${t.id}">
            <td class="py-3 px-4 text-slate-600 whitespace-nowrap">${t.date || '-'}</td>
            <td class="py-3 px-4 font-semibold text-slate-800">${t.item || '-'}</td>
            <td class="py-3 px-4">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${isExpense ? 'bg-rose-50 text-rose-700' : isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}">
                ${t.category || 'General'}
              </span>
            </td>
            <td class="py-3 px-4 text-slate-500 font-medium">${t.subcategory || 'General'}</td>
            <td class="py-3 px-4 font-bold ${amountColor} text-right whitespace-nowrap">
              ${amountPrefix}${this.state.formatRupiah(t.amount)}
            </td>
            <td class="py-3 px-4 text-center whitespace-nowrap">
              <div class="flex items-center justify-center gap-1.5">
                <button data-edit-id="${t.id}" class="p-1.5 text-slate-400 hover:text-emerald-600 transition rounded-lg hover:bg-emerald-50" title="Edit Transaksi">
                  <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                </button>
                <button data-delete-id="${t.id}" class="p-1.5 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50" title="Hapus Transaksi">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      if (loadMoreBtn) {
        if (displayLimit < totalItems) {
          loadMoreBtn.classList.remove('hidden');
          loadMoreBtn.textContent = `Tampilkan Lebih Banyak (${totalItems - displayLimit} transaksi tersisa)`;
        } else {
          loadMoreBtn.classList.add('hidden');
        }
      }

      if (window.lucide) window.lucide.createIcons();
    };

    const html = `
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold text-slate-900">
            Semua Riwayat Transaksi <span id="all-transactions-count" class="text-emerald-700 font-bold"></span>
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">Cari, filter, edit, atau hapus transaksi yang pernah dicatat.</p>
        </div>
        <button class="btn-modal-close text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-100">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="p-6 space-y-4 overflow-y-auto flex-1">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div class="relative">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-2.5"></i>
            <input id="input-trx-search" type="text" placeholder="Cari item/nominal..." class="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
          </div>

          <select id="select-filter-type" class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
            <option value="all">Semua Tipe</option>
            <option value="expense">Pengeluaran (Expense)</option>
            <option value="income">Pemasukan (Income)</option>
            <option value="saving">Tabungan (Saving)</option>
          </select>

          <select id="select-filter-cat" class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
            <option value="all">Semua Kategori</option>
          </select>

          <select id="select-filter-subcat" class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
            <option value="all">Semua Subkategori</option>
          </select>
        </div>

        <div class="overflow-x-auto max-h-[400px] border border-slate-200 rounded-2xl">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-100 text-slate-600 sticky top-0 border-b border-slate-200 font-bold uppercase tracking-wider">
              <tr>
                <th class="py-3 px-4 whitespace-nowrap">Tanggal</th>
                <th class="py-3 px-4 whitespace-nowrap">Item</th>
                <th class="py-3 px-4 whitespace-nowrap">Kategori</th>
                <th class="py-3 px-4 whitespace-nowrap">Subkategori</th>
                <th class="py-3 px-4 text-right whitespace-nowrap">Nominal</th>
                <th class="py-3 px-4 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody id="all-transactions-tbody" class="divide-y divide-slate-100"></tbody>
          </table>
        </div>

        <button id="btn-load-more-trx" class="w-full py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition border border-emerald-200 hidden">
          Tampilkan Lebih Banyak
        </button>
      </div>

      <div class="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Menampilkan transaksi secara cepat</span>
        <button class="btn-modal-close px-4 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
          Tutup
        </button>
      </div>
    `;

    this.open(html, 'max-w-5xl');
    updateCategoryDropdown();
    renderList();

    document.getElementById('btn-load-more-trx')?.addEventListener('click', () => {
      displayLimit += 50;
      renderList();
    });

    document.getElementById('input-trx-search')?.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      displayLimit = 50;
      renderList();
    });

    document.getElementById('select-filter-type')?.addEventListener('change', (e) => {
      currentType = e.target.value;
      displayLimit = 50;
      updateCategoryDropdown();
      renderList();
    });

    document.getElementById('select-filter-cat')?.addEventListener('change', (e) => {
      currentCategory = e.target.value;
      displayLimit = 50;
      updateSubcategoryDropdown();
      renderList();
    });

    document.getElementById('select-filter-subcat')?.addEventListener('change', (e) => {
      currentSubcategory = e.target.value;
      displayLimit = 50;
      renderList();
    });

    document.getElementById('all-transactions-tbody')?.addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('[data-delete-id]');
      const editBtn = e.target.closest('[data-edit-id]');

      if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-delete-id');
        if (confirm('Hapus transaksi ini?')) {
          await this.state.deleteTransaction(id);
          renderList();
        }
      }

      if (editBtn) {
        const id = editBtn.getAttribute('data-edit-id');
        this.openEditTransaction(id);
      }
    });
  }

  // --- 6. MODAL EDIT TRANSAKSI ---
  openEditTransaction(trxId) {
    const trx = (this.state.transactions || []).find(t => String(t.id) === String(trxId));
    if (!trx) return;

    const trxType = trx.type || 'expense';
    const isSaving = trxType === 'saving' || trx.category === 'Saving Goals';

    const categories = isSaving 
      ? [{ name: 'Saving Goals' }] 
      : (this.state.categories || []).filter(c => c.type === trxType);

    const initialCat = trx.category || (categories[0] ? categories[0].name : 'Others');

    const getSubcatsForCategory = (catName) => {
      if (isSaving || catName === 'Saving Goals') {
        return (this.state.savingGoals || []).map(g => g.name);
      }
      const found = (this.state.categories || []).find(c => c.name === catName);
      return found ? (found.subcategories || ['General']) : ['General'];
    };

    const subcategories = getSubcatsForCategory(initialCat);

    const html = `
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold text-slate-900">Edit Transaksi</h3>
          <p class="text-xs text-slate-500 mt-0.5">Perbarui rincian transaksi yang tersimpan.</p>
        </div>
        <button class="btn-modal-close text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-100">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <form id="form-edit-transaction" class="p-6 space-y-4 overflow-y-auto flex-1">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Item / Keterangan</label>
          <input type="text" id="edit-item" value="${trx.item || ''}" required class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nominal (Rp)</label>
            <input type="number" id="edit-amount" value="${trx.amount || 0}" required min="1000" step="1000" class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
            <input type="date" id="edit-date" value="${trx.date || ''}" required class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
            <select id="edit-category" ${isSaving ? 'disabled' : ''} class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 ${isSaving ? 'bg-slate-100 text-slate-500 font-bold cursor-not-allowed' : ''}">
              ${categories.map(c => `<option value="${c.name}" ${c.name === initialCat ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">${isSaving ? 'Subkategori (Target Tabungan)' : 'Subkategori'}</label>
            <select id="edit-subcategory" class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
              ${subcategories.map(s => `<option value="${s}" ${s === trx.subcategory ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button type="button" id="btn-cancel-edit" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition">
            Batal
          </button>
          <button type="submit" class="px-5 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow transition">
            Simpan Perubahan
          </button>
        </div>
      </form>
    `;

    this.open(html, 'max-w-lg');

    const catSelect = document.getElementById('edit-category');
    const subcatSelect = document.getElementById('edit-subcategory');

    catSelect?.addEventListener('change', () => {
      const subs = getSubcatsForCategory(catSelect.value);
      subcatSelect.innerHTML = subs.map(s => `<option value="${s}">${s}</option>`).join('');
    });

    document.getElementById('form-edit-transaction')?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const item = document.getElementById('edit-item').value;
      const amount = Number(document.getElementById('edit-amount').value);
      const date = document.getElementById('edit-date').value;
      const category = isSaving ? 'Saving Goals' : (catSelect?.value || 'Others');
      const subcategory = subcatSelect?.value || 'General';

      const updatedFields = { item, amount, date, category, subcategory };

      if (typeof this.state.updateTransaction === 'function') {
        await this.state.updateTransaction(trxId, updatedFields);
      } else {
        if (supabaseService.isConnected && supabaseService.client) {
          const { error } = await supabaseService.client
            .from('transactions')
            .update({
              item_name: item,
              amount: amount,
              date: date,
              category_name: category,
              subcategory_name: subcategory
            })
            .eq('id', trxId);

          if (error) {
            alert('Gagal menyimpan ke Supabase: ' + error.message);
            return;
          }
        }

        Object.assign(trx, updatedFields);
        if (typeof this.state.touchUpdated === 'function') this.state.touchUpdated();
        if (typeof this.state.notify === 'function') this.state.notify();
      }

      this.openViewAllTransactions();
    });

    document.getElementById('btn-cancel-edit')?.addEventListener('click', () => this.openViewAllTransactions());
  }

  // --- 7. SUPABASE CONFIG MODAL ---
  openSupabaseConfig() {
    const config = supabaseService.config || {};
    const isConnected = supabaseService.isConnected;

    const html = `
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold text-slate-900">Koneksi Database Supabase</h3>
          <p class="text-xs text-slate-500 mt-0.5">Hubungkan web app ke project Supabase cloud kamu.</p>
        </div>
        <button class="btn-modal-close text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-100">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <form id="form-supabase-config" class="p-6 space-y-4 overflow-y-auto flex-1">
        <div class="p-3.5 rounded-2xl ${isConnected ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-slate-50 border border-slate-200 text-slate-700'} text-xs flex items-center gap-2.5">
          <div class="w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'} shrink-0"></div>
          <div>
            <strong>Status:</strong> ${isConnected ? 'Tersambung ke Supabase Cloud' : 'Mode Demo / Local Storage Aktif'}
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Project URL Supabase</label>
          <input type="text" id="input-sb-url" placeholder="https://xyz.supabase.co" value="${config.url || ''}" class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono">
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Anon / Public API Key</label>
          <input type="password" id="input-sb-key" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." value="${config.anonKey || ''}" class="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono">
        </div>

        <div class="pt-2 text-xs text-slate-500 space-y-1">
          <p>💡 <strong>Langkah singkat:</strong></p>
          <ol class="list-decimal list-inside pl-1 space-y-0.5 text-[11px]">
            <li>Buka <a href="https://supabase.com" target="_blank" class="text-emerald-700 underline">supabase.com</a> dan buat project gratis.</li>
            <li>Copy isi file <code class="bg-slate-100 px-1 py-0.5 rounded font-mono">supabase_setup.sql</code> ke menu SQL Editor di Supabase.</li>
            <li>Copy URL & Anon Key dari Project Settings &rarr; API ke form di atas.</li>
          </ol>
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button type="button" class="btn-modal-close px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition">
            Batal
          </button>
          <button type="submit" class="px-5 py-2.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow transition">
            Simpan & Sambungkan
          </button>
        </div>
      </form>
    `;

    this.open(html, 'max-w-lg');

    const form = document.getElementById('form-supabase-config');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('input-sb-url').value;
        const key = document.getElementById('input-sb-key').value;

        supabaseService.saveConfig(url, key);
        const res = await supabaseService.testConnection();
        alert(res.message);
        await this.state.init();
        this.close();
      });
    }
  }

  // --- 8. AUTHENTICATION MODAL (MATCHED DESIGN TO IMAGE) ---
  openAuthModal(initialTab = 'login') {
    let isLogin = initialTab === 'login';

    const renderAuthContent = () => `
      <!-- HEADER MODAL AUTH -->
      <div class="p-6 pb-2 text-center flex flex-col items-center">
        <!-- Circular Icon Badge -->
        <div class="w-14 h-14 rounded-full bg-emerald-100/80 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
          <i data-lucide="trending-up" class="w-7 h-7 stroke-[2.5]"></i>
        </div>

        <h3 class="text-2xl font-black text-slate-900 tracking-tight mb-1" id="auth-modal-title">
          ${isLogin ? 'Selamat Datang' : 'Buat Akun Baru'}
        </h3>
        <p class="text-xs text-slate-500 font-medium leading-relaxed max-w-xs">
          ${isLogin ? 'Kelola keuangan pribadi Anda di <br><span class="font-bold text-emerald-600">DataryWorks</span> Expense Tracker' : 'Mulai catat dan analisis keuangan Anda hari ini.'}
        </p>

        <!-- Decorated Divider -->
        <div class="relative w-full flex items-center justify-center my-5">
          <div class="w-full border-t border-slate-100"></div>
          <div class="absolute w-2 h-2 rounded-full bg-emerald-500"></div>
        </div>
      </div>

      <form id="form-auth" class="px-6 pb-6 space-y-4 overflow-y-auto flex-1">
        <div id="auth-error-message" class="hidden p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700"></div>

        ${!isLogin ? `
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Nama Lengkap</label>
            <div class="relative">
              <i data-lucide="user" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
              <input type="text" id="input-auth-name" required placeholder="John Doe" class="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-800 font-medium placeholder:text-slate-400 transition shadow-sm">
            </div>
          </div>
        ` : ''}

        <div>
          <label class="block text-xs font-bold text-slate-800 mb-1.5">Email</label>
          <div class="relative">
            <i data-lucide="mail" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input type="email" id="input-auth-email" required placeholder="nama@email.com" class="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-800 font-medium placeholder:text-slate-400 transition shadow-sm">
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-800 mb-1.5">Password</label>
          <div class="relative">
            <i data-lucide="lock" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
            <input type="password" id="input-auth-password" required minlength="6" placeholder="••••••••" class="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-800 font-medium placeholder:text-slate-400 transition shadow-sm">
            <button type="button" id="btn-toggle-password" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 transition p-1 rounded-lg">
              <i data-lucide="eye" id="icon-toggle-password" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <div class="pt-2">
          <button type="submit" id="btn-auth-submit" class="w-full py-3 text-xs font-bold text-white bg-[#065F46] hover:bg-[#044E38] rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer">
            <i data-lucide="${isLogin ? 'arrow-right' : 'user-plus'}" class="w-4 h-4"></i>
            <span>${isLogin ? 'Masuk Sekarang' : 'Daftar Akun'}</span>
          </button>
        </div>

        <div class="text-center pt-4 border-t border-slate-100 mt-4">
          <p class="text-xs text-slate-500 font-medium">
            ${isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
          </p>
          <button type="button" id="btn-toggle-auth-mode" class="font-bold text-emerald-700 hover:text-emerald-800 text-xs mt-1 transition cursor-pointer">
            ${isLogin ? 'Daftar di sini' : 'Masuk di sini'}
          </button>
        </div>
      </form>
    `;

    this.open(renderAuthContent(), 'max-w-sm');

    const attachAuthEvents = () => {
      const form = document.getElementById('form-auth');
      const toggleBtn = document.getElementById('btn-toggle-auth-mode');
      const errorEl = document.getElementById('auth-error-message');
      
      const btnTogglePass = document.getElementById('btn-toggle-password');
      const inputPass = document.getElementById('input-auth-password');
      const iconPass = document.getElementById('icon-toggle-password');

      if (btnTogglePass && inputPass) {
        btnTogglePass.addEventListener('click', () => {
          const isPassword = inputPass.type === 'password';
          inputPass.type = isPassword ? 'text' : 'password';
          if (iconPass) {
            iconPass.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
            if (window.lucide) window.lucide.createIcons();
          }
        });
      }

      toggleBtn?.addEventListener('click', () => {
        isLogin = !isLogin;
        this.open(renderAuthContent(), 'max-w-sm');
        attachAuthEvents();
      });

      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorEl) errorEl.classList.add('hidden');

        const email = document.getElementById('input-auth-email')?.value.trim();
        const password = document.getElementById('input-auth-password')?.value;
        const name = document.getElementById('input-auth-name')?.value || '';

        const submitBtn = document.getElementById('btn-auth-submit');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.classList.add('opacity-50');
        }

        try {
          if (isLogin) {
            const res = await supabaseService.signIn(email, password);
            
            if (res && res.error) {
              throw new Error(res.error.message || 'Email atau password salah.');
            }

            const activeUser = res?.user || res?.data?.user;
            if (activeUser) {
              supabaseService.currentUser = activeUser;
              await this.state.init();
              this.close();

              if (window.app) {
                if (typeof window.app.renderSidebar === 'function') window.app.renderSidebar();
                if (typeof window.app.renderActiveView === 'function') window.app.renderActiveView();
                if (typeof window.app.updateFilterDropdownsUI === 'function') window.app.updateFilterDropdownsUI();
              }
            } else {
              throw new Error('Gagal masuk. Periksa kembali email dan password Anda.');
            }
          } else {
            const res = await supabaseService.signUp(email, password, name);
            if (res && res.error) {
              throw new Error(res.error.message);
            }
            alert('Pendaftaran berhasil! Silakan masuk dengan akun Anda.');
            isLogin = true;
            this.open(renderAuthContent(), 'max-w-sm');
            attachAuthEvents();
          }
        } catch (err) {
          console.error('Auth error:', err);
          if (errorEl) {
            errorEl.textContent = err.message || 'Gagal masuk. Periksa kembali email dan password Anda.';
            errorEl.classList.remove('hidden');
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50');
          }
        }
      });
    };

    attachAuthEvents();
  }

  // --- KONFIRMASI LOGOUT (Custom, menggantikan window.confirm) ---
  openLogoutConfirm(onConfirm) {
    const html = `
      <div class="p-6 text-center flex flex-col items-center">
        <div class="w-14 h-14 rounded-full bg-rose-100/80 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
          <i data-lucide="log-out" class="w-7 h-7 stroke-[2.5]"></i>
        </div>

        <h3 class="text-lg font-black text-slate-900 tracking-tight mb-1">
          Datary Expense Tracker
        </h3>
        <p class="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mb-6">
          Apakah anda yakin ingin keluar?
        </p>

        <div class="flex items-center justify-center gap-3 w-full">
          <button id="btn-logout-cancel" class="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
          Batal
          </button>
          <button id="btn-logout-confirm" class="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow transition">
            Ya, Keluar
          </button>
        </div>
      </div>
    `;

    this.open(html, 'max-w-sm');

    document.getElementById('btn-logout-confirm')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-logout-confirm');
      const btnCancel = document.getElementById('btn-logout-cancel');

      // Jangan close() dulu — tampilkan loading state di dalam modal yang sama
      // biar background tetap gelap terus, nggak ada momen dashboard nongol lagi
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Memproses...';
      }
      if (btnCancel) btnCancel.disabled = true;

      if (typeof onConfirm === 'function') await onConfirm();

      // PENTING: this.close() TIDAK dipanggil di sini.
      // onConfirm() sudah memanggil checkAuthGuard() di app.js, yang otomatis
      // membuka modal login baru lewat openAuthModal(). Modal login itu
      // mengganti isi #modal-container lewat this.open(). Kalau close()
      // dipanggil setelahnya, modal login yang baru saja tampil akan
      // langsung dikosongkan lagi -> inilah salah satu penyebab "kedip".
    });
  }
}