// ==============================================================================
// DATARYWORKS EXPENSE TRACKER - ADMIN PANEL VIEW (KHUSUS ADMIN)
// ==============================================================================

import { supabaseService } from '../supabase.js';

export async function renderAdminPanel(state) {
  const container = document.getElementById('main-view-content');
  if (!container) return;

  // Tampilkan loading dulu sambil ambil data dari database
  container.innerHTML = `
    <div class="flex items-center justify-center py-24 text-slate-400 text-sm font-medium">
      <i data-lucide="loader-2" class="w-5 h-5 animate-spin mr-2"></i>
      Memuat data admin...
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();

  const [usersRes, paymentsRes] = await Promise.all([
    supabaseService.adminListUsers(),
    supabaseService.adminListPendingPayments()
  ]);

  if (!usersRes.success || !paymentsRes.success) {
    container.innerHTML = `
      <div class="p-6 bg-rose-50 border border-rose-300 rounded-2xl text-rose-800 text-sm font-semibold">
        Gagal memuat data admin: ${usersRes.error || paymentsRes.error || 'Terjadi kesalahan.'}
        <br><span class="font-normal text-xs">Pastikan akun ini benar-benar memiliki role 'admin', dan script supabase_admin_panel.sql sudah dijalankan di database.</span>
      </div>
    `;
    return;
  }

  const users = usersRes.data;
  const pendingPayments = paymentsRes.data;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const formatDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return `${dt.getDate()} ${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const computeDaysLeft = (trialEndDate) => {
    if (!trialEndDate) return null;
    const ms = new Date(trialEndDate).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  const statusBadge = (u) => {
    if (u.role === 'admin') return `<span class="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-full">Admin 👑</span>`;
    if (u.status === 'premium' && u.premium_until && new Date(u.premium_until) > new Date()) {
      return `<span class="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full">Premium ✨</span>`;
    }
    if (u.status === 'expired') {
      return `<span class="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 rounded-full">Read-only 🔒</span>`;
    }
    const daysLeft = computeDaysLeft(u.trial_end_date);
    if (daysLeft !== null && daysLeft > 0) {
      return `<span class="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 rounded-full">Trial (${daysLeft}h)</span>`;
    }
    return `<span class="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300 rounded-full">Trial habis</span>`;
  };

  container.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-300 gap-4">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-black text-slate-900 tracking-tight">ADMIN PANEL</h1>
        <span class="px-2.5 py-0.5 text-xs font-bold text-amber-800 bg-amber-100/90 rounded-full border border-amber-300 shadow-sm">
          Khusus Admin
        </span>
      </div>
    </div>

    <div class="mt-4 flex items-center gap-2 px-3.5 py-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 font-medium shadow-sm">
      <i data-lucide="shield-alert" class="w-4 h-4 text-amber-700 shrink-0"></i>
      <span>Kelola status langganan user dan verifikasi konfirmasi pembayaran yang masuk.</span>
    </div>

    <!-- KONFIRMASI PEMBAYARAN PENDING -->
    <div class="bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 mt-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-slate-900 text-sm tracking-tight">
          Konfirmasi Pembayaran Menunggu
          <span class="ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${pendingPayments.length > 0 ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-slate-100 text-slate-500 border border-slate-300'}">
            ${pendingPayments.length}
          </span>
        </h3>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
              <th class="pb-2">Waktu</th>
              <th class="pb-2">Nama</th>
              <th class="pb-2">Email</th>
              <th class="pb-2">Metode</th>
              <th class="pb-2">No. Rek/HP Pengirim</th>
              <th class="pb-2 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${pendingPayments.length === 0 ? `
              <tr><td colspan="6" class="py-8 text-center text-slate-400 font-medium">Tidak ada konfirmasi pembayaran yang menunggu 🎉</td></tr>
            ` : pendingPayments.map(p => `
              <tr class="hover:bg-slate-50 transition">
                <td class="py-2.5 text-slate-600 whitespace-nowrap">${formatDate(p.submitted_at)}</td>
                <td class="py-2.5 font-semibold text-slate-800">${p.user_name || '-'}</td>
                <td class="py-2.5 text-slate-600">${p.user_email || '-'}</td>
                <td class="py-2.5">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">${p.method || '-'}</span>
                </td>
                <td class="py-2.5 text-slate-700 font-medium">${p.sender_account || '-'}</td>
                <td class="py-2.5">
                  <div class="flex items-center justify-center gap-1.5">
                    <button class="btn-approve-payment px-2.5 py-1.5 text-[10px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition" data-id="${p.id}">
                      ✅ Aktifkan
                    </button>
                    <button class="btn-reject-payment px-2.5 py-1.5 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition" data-id="${p.id}">
                      ✕ Tolak
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- DAFTAR SEMUA USER -->
    <div class="bg-white rounded-2xl p-5 border border-slate-300 shadow-md shadow-slate-200/80 mt-5">
      <h3 class="font-bold text-slate-900 text-sm tracking-tight mb-4">Semua User (${users.length})</h3>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
              <th class="pb-2">Nama</th>
              <th class="pb-2">Email</th>
              <th class="pb-2">Status</th>
              <th class="pb-2">Trial Berakhir</th>
              <th class="pb-2">Premium Sampai</th>
              <th class="pb-2">Daftar</th>
              <th class="pb-2 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${users.map(u => `
              <tr class="hover:bg-slate-50 transition">
                <td class="py-2.5 font-semibold text-slate-800">${u.full_name || '-'}</td>
                <td class="py-2.5 text-slate-600">${u.email}</td>
                <td class="py-2.5">${statusBadge(u)}</td>
                <td class="py-2.5 text-slate-500">${formatDate(u.trial_end_date)}</td>
                <td class="py-2.5 text-slate-500">${formatDate(u.premium_until)}</td>
                <td class="py-2.5 text-slate-400">${formatDate(u.signup_at)}</td>
                <td class="py-2.5">
                  ${u.role === 'admin' ? `
                    <span class="text-[10px] text-slate-400 italic">Akun admin</span>
                  ` : `
                    <div class="flex items-center justify-center gap-1.5">
                      <button class="btn-activate-user px-2.5 py-1.5 text-[10px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition" data-id="${u.user_id}" title="Aktifkan Premium 1 Bulan">
                        Aktifkan
                      </button>
                      <button class="btn-deactivate-user px-2.5 py-1.5 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition" data-id="${u.user_id}" title="Nonaktifkan (Read-only)">
                        Nonaktifkan
                      </button>
                    </div>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // --- EVENT LISTENERS ---
  const showToast = (msg, isError = false) => {
    if (window.app && window.app.modalManager) {
      if (isError) {
        window.app.modalManager.openErrorModal(msg);
      } else {
        window.app.modalManager.openSuccessModal(msg, () => window.app.modalManager.close(), 'check-circle-2', 'Berhasil');
      }
    }
  };

  document.querySelectorAll('.btn-approve-payment').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      e.currentTarget.disabled = true;
      e.currentTarget.textContent = '...';
      const res = await supabaseService.adminResolvePayment(id, true);
      if (res.success) {
        showToast('Pembayaran disetujui. User otomatis aktif Premium 1 bulan.');
        renderAdminPanel(state);
      } else {
        showToast('Gagal: ' + res.error, true);
      }
    });
  });

  document.querySelectorAll('.btn-reject-payment').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (!confirm('Tolak konfirmasi pembayaran ini?')) return;
      const res = await supabaseService.adminResolvePayment(id, false);
      if (res.success) {
        showToast('Konfirmasi pembayaran ditolak.');
        renderAdminPanel(state);
      } else {
        showToast('Gagal: ' + res.error, true);
      }
    });
  });

  document.querySelectorAll('.btn-activate-user').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (!confirm('Aktifkan Premium 1 bulan untuk user ini?')) return;
      const res = await supabaseService.adminSetSubscription(id, 'premium', 1);
      if (res.success) {
        showToast('User berhasil diaktifkan Premium 1 bulan.');
        renderAdminPanel(state);
      } else {
        showToast('Gagal: ' + res.error, true);
      }
    });
  });

  document.querySelectorAll('.btn-deactivate-user').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (!confirm('Nonaktifkan user ini? Mereka akan masuk mode read-only.')) return;
      const res = await supabaseService.adminSetSubscription(id, 'expired', 0);
      if (res.success) {
        showToast('User berhasil dinonaktifkan (mode read-only).');
        renderAdminPanel(state);
      } else {
        showToast('Gagal: ' + res.error, true);
      }
    });
  });
}