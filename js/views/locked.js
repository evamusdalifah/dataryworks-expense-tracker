export function renderLockedView(app) {
  const container = document.getElementById('main-content');
  if (!container) return;

  container.innerHTML = `
    <div class="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 animate-fadeIn">
      <div class="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-800 mb-4 shadow-sm mx-auto">
        <i data-lucide="lock" class="w-8 h-8"></i>
      </div>
      <h2 class="text-2xl font-black text-slate-900 tracking-tight">Akses Terkunci</h2>
      <p class="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
        Silakan masuk ke akun Anda terlebih dahulu untuk mengakses dashboard keuangan DataryWorks.
      </p>
      <button id="btn-locked-login" class="mt-6 px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 mx-auto">
        <i data-lucide="log-in" class="w-4 h-4"></i>
        <span>Masuk Sekarang</span>
      </button>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  const btnLogin = document.getElementById('btn-locked-login');
  if (btnLogin) {
    btnLogin.addEventListener('click', () => {
      if (app.modalManager) app.modalManager.openAuthModal('login');
    });
  }

  // Otomatis munculkan modal login saat pertama dibuka
  if (app.modalManager) {
    setTimeout(() => {
      app.modalManager.openAuthModal('login');
    }, 200);
  }
}