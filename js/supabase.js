// ==============================================================================
// DATARYWORKS EXPENSE TRACKER - SUPABASE SERVICE LAYER WITH AUTH & MULTI-TENANT
// ==============================================================================

class SupabaseService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.currentUser = null;
    this.config = this.loadConfig();
    this.initClient();
  }

  loadConfig() {
    const defaultConfig = {
      url: 'https://jcincpuxdvuegadlepzd.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjaW5jcHV4ZHZ1ZWdhZGxlpzpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyOTkxMzYsImV4cCI6MjEwMjg3NTEzNn0.q5S7lfEmjIrjtLG6QZKczPbJ6yJmPOM46PyoXC1TiJ8'
    };

    const saved = localStorage.getItem('datary_supabase_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.url && parsed.anonKey && parsed.anonKey.length > 50) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse supabase config', e);
      }
    }
    
    return defaultConfig;
  }

  saveConfig(url, anonKey) {
    this.config = { url: url.trim(), anonKey: anonKey.trim() };
    localStorage.setItem('datary_supabase_config', JSON.stringify(this.config));
    return this.initClient();
  }

  initClient() {
    if (this.config.url && this.config.anonKey && window.supabase) {
      try {
        this.client = window.supabase.createClient(this.config.url, this.config.anonKey);
        this.isConnected = true;
        console.log('⚡ Supabase Client initialized successfully');
        return true;
      } catch (err) {
        console.error('❌ Failed to initialize Supabase client:', err);
        this.client = null;
        this.isConnected = false;
        return false;
      }
    }
    this.client = null;
    this.isConnected = false;
    return false;
  }

  async testConnection() {
    if (!this.client) return { success: false, message: 'Supabase client belum dikonfigurasi.' };
    try {
      const { data, error } = await this.client.from('transactions').select('id', { count: 'exact', head: true });
      if (error) throw error;
      return { success: true, message: 'Koneksi ke Supabase berhasil!' };
    } catch (err) {
      return { success: false, message: err.message || 'Gagal tersambung ke database Supabase.' };
    }
  }

  // ==============================================================================
  // AUTHENTICATION METHODS (NEW)
  // ==============================================================================

  async getSession() {
    if (!this.client) return null;
    const { data, error } = await this.client.auth.getSession();
    if (error || !data.session) {
      this.currentUser = null;
      return null;
    }
    this.currentUser = data.session.user;
    return data.session;
  }

  async signUp(email, password, fullName = '') {
    if (!this.client) throw new Error('Supabase client belum terkoneksi.');
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    return data;
  }

  async signIn(email, password) {
    if (!this.client) throw new Error('Supabase client belum terkoneksi.');
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.currentUser = data.user;
    return data;
  }

  async signOut() {
    if (!this.client) return;
    const { error } = await this.client.auth.signOut();
    if (error) console.error('Signout error:', error);
    this.currentUser = null;
  }

  // ==============================================================================
  // TRANSACTIONS
  // ==============================================================================

  async fetchTransactions() {
    if (!this.client || !this.currentUser) return null;
    try {
      const { data, error } = await this.client
        .from('transactions')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('date', { ascending: false });

      if (error) throw error;

      this.isConnected = true;

      return (data || []).map(t => ({
        id: t.id,
        date: t.date,
        item: t.item_name || t.item || '-',
        amount: Number(t.amount) || 0,
        type: (t.type || '').toLowerCase(),
        category: t.category_name || t.category || 'Others',
        subcategory: t.subcategory_name || t.subcategory || 'General',
        paymentMethod: t.payment_method || t.paymentMethod || 'Cash',
        notes: t.notes || ''
      }));
    } catch (err) {
      console.error('Error fetching transactions:', err);
      return null;
    }
  }

  async insertTransaction(trx) {
    if (!this.client || !this.currentUser) return { success: true, localOnly: true };
    try {
      const payload = {
        user_id: this.currentUser.id,
        date: trx.date,
        item_name: trx.item,
        amount: Number(trx.amount),
        type: (trx.type || '').toLowerCase(),
        category_name: trx.category,
        subcategory_name: trx.subcategory || null,
        payment_method: trx.paymentMethod || 'Cash',
        notes: trx.notes || null
      };
      const { data, error } = await this.client.from('transactions').insert([payload]).select();
      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (err) {
      console.error('Error insert transaction ke Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  async addTransaction(trx) {
    return await this.insertTransaction(trx);
  }

  async deleteTransaction(id) {
    if (!this.client || !this.currentUser) return { success: true, localOnly: true };
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      let error;
      if (isUUID) {
        const res = await this.client
          .from('transactions')
          .delete()
          .eq('id', id)
          .eq('user_id', this.currentUser.id);
        error = res.error;
      } else {
        console.warn('ID transaksi bukan UUID, menghapus dari local state.');
        return { success: true, localOnly: true };
      }

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error delete transaction di Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  // ==============================================================================
  // SAVING GOALS
  // ==============================================================================

  async fetchGoals() {
    if (!this.client || !this.currentUser) return null;
    try {
      const { data: dedicatedGoals, error: goalErr } = await this.client
        .from('saving_goals')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('created_at', { ascending: true });

      if (goalErr) throw goalErr;

      const { data: savingTrx, error: trxErr } = await this.client
        .from('transactions')
        .select('category_name, amount')
        .eq('user_id', this.currentUser.id)
        .in('type', ['saving', 'goal']);

      const savedMap = {};
      if (!trxErr && savingTrx) {
        savingTrx.forEach(t => {
          const cat = t.category_name;
          savedMap[cat] = (savedMap[cat] || 0) + Number(t.amount || 0);
        });
      }

      return (dedicatedGoals || []).map(g => {
        const baseSaved = Number(g.saved_amount || 0);
        const trxSaved = savedMap[g.name] || 0;
        const totalSaved = Math.max(baseSaved, trxSaved);
        const targetAmount = Number(g.target_amount || 0);

        return {
          id: g.id,
          name: g.name,
          targetAmount,
          savedAmount: totalSaved,
          status: totalSaved >= targetAmount ? 'Selesai' : (g.status || 'On Track'),
          icon: g.icon || 'Target',
          color: g.color || '#198754'
        };
      });
    } catch (err) {
      console.error('Gagal memuat saving goals dari Supabase:', err);
      return null;
    }
  }

  async addSavingGoal(goalData) {
    if (!this.client || !this.currentUser) return { success: true, localOnly: true };

    try {
      const targetAmt = Number(goalData.targetAmount || goalData.target || 0);
      const savedAmt = Number(goalData.savedAmount || goalData.saved || 0);

      const payload = {
        user_id: this.currentUser.id,
        name: goalData.name,
        target_amount: targetAmt,
        saved_amount: savedAmt,
        status: savedAmt >= targetAmt ? 'Selesai' : 'On Track',
        icon: goalData.icon || 'Target',
        color: goalData.color || '#198754'
      };

      const { data, error } = await this.client
        .from('saving_goals')
        .insert([payload])
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (err) {
      console.error('Gagal tambah target tabungan ke Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  async updateSavingGoal(goalId, updatedFields) {
    if (!this.client || !this.currentUser) return { success: false, isLocalOnly: true };

    try {
      const payload = {
        name: updatedFields.name,
        target_amount: Number(updatedFields.targetAmount || updatedFields.target_amount || 0)
      };
      if (updatedFields.icon) payload.icon = updatedFields.icon;

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(goalId);

      let res;
      if (isUUID) {
        res = await this.client.from('saving_goals').update(payload).eq('id', goalId).eq('user_id', this.currentUser.id).select();
      } else {
        res = await this.client.from('saving_goals').update(payload).eq('name', updatedFields.name).eq('user_id', this.currentUser.id).select();
      }

      if (res.error) throw res.error;
      return { success: true, data: res.data };
    } catch (err) {
      console.error('Gagal update saving goal di Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  async fetchContributions() {
    if (!this.client || !this.currentUser) return null;
    try {
      const { data, error } = await this.client
        .from('transactions')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .in('type', ['saving', 'goal'])
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map(c => ({
        id: c.id,
        goalName: c.category_name || c.category || 'Tabungan',
        date: c.date,
        amount: Number(c.amount),
        paymentMethod: c.payment_method || c.paymentMethod || 'Transfer Bank',
        note: c.item_name || c.item || c.notes || '-'
      }));
    } catch (err) {
      console.error('Error fetching contributions:', err);
      return null;
    }
  }

  async deleteSavingGoal(goalId, goalName) {
    if (!this.client || !this.currentUser) return { success: true, localOnly: true };

    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(goalId);

      let res;
      if (isUUID) {
        res = await this.client.from('saving_goals').delete().eq('id', goalId).eq('user_id', this.currentUser.id);
      } else {
        res = await this.client.from('saving_goals').delete().eq('name', goalName).eq('user_id', this.currentUser.id);
      }

      if (res.error) throw res.error;
      return { success: true };
    } catch (err) {
      console.error('Gagal hapus saving goal di Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  // ==============================================================================
  // CATEGORIES & SUBCATEGORIES MANAGEMENT
  // ==============================================================================

  async fetchCategories() {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client
        .from('categories')
        .select('*')
        .in('type', ['income', 'expense'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        color: c.color || '#64748b',
        icon: c.icon || 'Folder',
        isSystem: c.is_system || false,
        subcategories: Array.isArray(c.subcategories) ? c.subcategories : []
      }));
    } catch (err) {
      console.error('Gagal fetch categories dari Supabase:', err);
      return null;
    }
  }

  async addCategory(categoryData) {
    if (!this.client || !this.currentUser) return { success: true, localOnly: true };
    try {
      const payload = {
        user_id: this.currentUser.id,
        name: categoryData.name,
        type: categoryData.type,
        color: categoryData.color || '#64748b',
        icon: categoryData.icon || 'Folder',
        is_system: false,
        subcategories: categoryData.subcategories || ['General']
      };

      const { data, error } = await this.client
        .from('categories')
        .insert([payload])
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (err) {
      console.error('Gagal tambah kategori ke Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  async updateSubcategories(categoryId, newSubcategories) {
    if (!this.client || !this.currentUser) return { success: true, localOnly: true };
    try {
      const { data, error } = await this.client
        .from('categories')
        .update({ subcategories: newSubcategories })
        .eq('id', categoryId)
        .eq('user_id', this.currentUser.id)
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (err) {
      console.error('Gagal update subkategori di Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  async deleteCategory(categoryId, categoryName, categoryType) {
    if (!this.client || !this.currentUser) return { success: true, localOnly: true };
    try {
      await this.client
        .from('transactions')
        .update({ category: 'Others', subcategory: 'General' })
        .eq('category', categoryName)
        .eq('type', categoryType)
        .eq('user_id', this.currentUser.id);

      const { error } = await this.client
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', this.currentUser.id);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Gagal hapus kategori di Supabase:', err);
      return { success: false, error: err.message };
    }
  }
}

export const supabaseService = new SupabaseService();