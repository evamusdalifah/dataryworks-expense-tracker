// ==============================================================================
// DATARYWORKS EXPENSE TRACKER - STATE & CALCULATION ENGINE (FIXED)
// ==============================================================================

import {
  DEFAULT_CATEGORIES,
  DEFAULT_GOALS,
  DEFAULT_CONTRIBUTIONS,
  DEFAULT_TRANSACTIONS,
  PAYMENT_METHODS
} from './data.js';
import { supabaseService } from './supabase.js';

class AppState {
  constructor() {
    this.activeTab = 'overview';
    this.isSidebarCollapsed = false;

    // Set default filter
    const now = new Date();
    this.selectedYear = now.getFullYear();
    this.selectedMonth = now.getMonth() + 1;
    this.selectedAccount = 'All Accounts';
    this.selectedCategory = 'Daily';
    this.selectedSubcategory = 'All Subcategories';
    this.analysisType = 'expense'; // 'expense' atau 'income'

    // Core Data
    this.categories = DEFAULT_CATEGORIES;
    this.paymentMethods = PAYMENT_METHODS;
    this.transactions = [];
    this.savingGoals = [];
    this.savingContributions = [];

    // UI Listeners
    this.listeners = [];
    this.lastUpdated = new Date();

    this.init();
  }

  getLastUpdatedFormatted() {
    const now = this.lastUpdated || new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} ${timeStr}`;
  }

  touchUpdated() {
    this.lastUpdated = new Date();
  }

  // --- INISIALISASI DATA STATE (LOAD FROM SUPABASE / LOCALSTORAGE) ---
  async init() {
    this.isLoading = true;
    this.notify();

    // 1. Cek Session User Supabase
    if (supabaseService.isConnected) {
      await supabaseService.getSession();
    }

    // 2. Fetch Data dari Supabase (Hanya jika user sudah login)
    if (supabaseService.isConnected && supabaseService.currentUser) {
      const dbTrx = await supabaseService.fetchTransactions();
      const dbGoals = await supabaseService.fetchGoals();
      const dbCats = await supabaseService.fetchCategories();

      if (dbTrx) this.transactions = dbTrx;
      if (dbGoals) this.savingGoals = dbGoals;
      if (dbCats && dbCats.length > 0) this.categories = dbCats;
    } else {
      // Fallback Local Storage jika tidak ada user / offline mode
      this.loadFromLocalStorage();
    }

    this.isLoading = false;
    this.notify();
  }

  clearUserData() {
    this.transactions = [];
    this.savingGoals = [];
    this.notify();
  }

  loadFromLocalStorage() {
    const savedTrx = localStorage.getItem('datary_transactions');
    const savedGoals = localStorage.getItem('datary_goals') || localStorage.getItem('datary_saving_goals');
    const savedContribs = localStorage.getItem('datary_contributions');
    const savedCats = localStorage.getItem('datary_custom_categories');

    this.transactions = savedTrx ? JSON.parse(savedTrx) : DEFAULT_TRANSACTIONS;
    this.savingGoals = savedGoals ? JSON.parse(savedGoals) : DEFAULT_GOALS;
    this.savingContributions = savedContribs ? JSON.parse(savedContribs) : DEFAULT_CONTRIBUTIONS;
    
    if (savedCats) {
      this.categories = JSON.parse(savedCats);
    }
  }

  saveToLocalStorage() {
    localStorage.setItem('datary_transactions', JSON.stringify(this.transactions));
    localStorage.setItem('datary_goals', JSON.stringify(this.savingGoals));
    localStorage.setItem('datary_saving_goals', JSON.stringify(this.savingGoals));
    localStorage.setItem('datary_contributions', JSON.stringify(this.savingContributions));
    localStorage.setItem('datary_custom_categories', JSON.stringify(this.categories));
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.saveToLocalStorage();
    this.listeners.forEach(cb => cb(this));
  }

  // --- ACTIONS ---
  setActiveTab(tab) {
    this.activeTab = tab;
    this.notify();
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    this.notify();
  }

  setFilter(key, value) {
    this[key] = value;
    if (key === 'selectedCategory') {
      this.selectedSubcategory = 'All Subcategories';
    }
    this.notify();
  }

  resetFilters() {
    const now = new Date();
    this.selectedYear = now.getFullYear();
    this.selectedMonth = now.getMonth() + 1;
    this.selectedCategory = 'Daily';
    this.analysisType = 'expense';

    this.saveToLocalStorage();
    this.notify();
  }

  async addTransaction(trxData) {
    let normalizedType = (trxData.type || 'expense').toLowerCase();
    if (normalizedType.includes('tabung') || normalizedType.includes('invest') || normalizedType === 'goal') {
      normalizedType = 'saving';
    }

    const newTrx = {
      id: 'trx-' + Date.now(),
      date: trxData.date,
      item: trxData.item,
      amount: Number(trxData.amount),
      type: normalizedType,
      category: trxData.category,
      subcategory: trxData.subcategory || 'General',
      paymentMethod: trxData.paymentMethod || 'Cash',
      notes: trxData.notes || ''
    };

    if (normalizedType === 'saving' && trxData.goalName) {
      await this.addContribution({
        goalName: trxData.goalName,
        date: trxData.date,
        amount: trxData.amount,
        paymentMethod: trxData.paymentMethod,
        note: trxData.item
      }, false);
    }

    this.transactions.unshift(newTrx);
    this.touchUpdated();
    if (supabaseService && supabaseService.isConnected) {
      await supabaseService.insertTransaction(newTrx);
    }
    this.notify();
    return newTrx;
  }

  async deleteTransaction(id) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.touchUpdated();
    if (supabaseService && supabaseService.isConnected) {
      await supabaseService.deleteTransaction(id);
    }
    this.notify();
  }

  // --- SAVING GOALS ACTIONS ---
  async addGoal(goalData) {
    const targetAmount = Number(goalData.targetAmount || goalData.target) || 0;
    const savedAmount = Number(goalData.savedAmount || goalData.saved) || 0;

    const newGoal = {
      id: 'goal-' + Date.now(),
      name: goalData.name,
      targetAmount,
      savedAmount,
      deadline: goalData.deadline || '2026-12-31',
      icon: goalData.icon || 'Target',
      color: goalData.color || '#047857',
      status: savedAmount >= targetAmount ? 'Selesai' : 'On Track'
    };

    this.savingGoals.push(newGoal);
    this.touchUpdated();

    if (supabaseService && supabaseService.isConnected) {
      try {
        await supabaseService.addSavingGoal(newGoal);
      } catch (e) {
        console.warn('Gagal simpan goal ke Supabase:', e);
      }
    }

    this.notify();
    return newGoal;
  }

  async addContribution(contribData, autoNotify = true) {
    const amount = Number(contribData.amount) || 0;
    const newContrib = {
      id: 'contrib-' + Date.now(),
      goalName: contribData.goalName,
      date: contribData.date || new Date().toISOString().split('T')[0],
      amount,
      paymentMethod: contribData.paymentMethod || 'Cash',
      note: contribData.note || ''
    };

    this.savingContributions.unshift(newContrib);

    const targetGoal = this.savingGoals.find(g => g.name === contribData.goalName);
    if (targetGoal) {
      targetGoal.savedAmount = (Number(targetGoal.savedAmount) || 0) + amount;
      if (targetGoal.savedAmount >= targetGoal.targetAmount) {
        targetGoal.status = 'Selesai';
      }
    }

    this.touchUpdated();

    if (supabaseService && supabaseService.isConnected) {
      try {
        await supabaseService.insertContribution(newContrib);
      } catch (e) {
        console.warn('Gagal simpan setoran ke Supabase:', e);
      }
    }

    if (autoNotify) this.notify();
    return newContrib;
  }

  // --- QUERY & METRIC HELPERS ---
  formatRupiah(num) {
    if (isNaN(num) || num === null || num === undefined) return 'Rp0';
    return 'Rp' + Number(num).toLocaleString('id-ID');
  }

  formatShortRupiah(num) {
    const val = Number(num) || 0;
    if (val === 0) return '0';
    if (Math.abs(val) >= 1_000_000_000) return (val / 1_000_000_000).toFixed(1) + 'B';
    if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(0) + 'K';
    return val.toString();
  }

  getFilteredTransactions(month = this.selectedMonth, year = this.selectedYear) {
    return this.transactions.filter(t => {
      const rawDate = t.date || t.created_at;
      if (!rawDate) return false;

      const dateStr = rawDate.toString().substring(0, 10);
      const parts = dateStr.split('-');
      if (parts.length < 2) return false;

      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);

      return m === Number(month) && y === Number(year);
    });
  }

  getOverviewKPIs() {
    const currentMonthTrx = this.getFilteredTransactions(this.selectedMonth, this.selectedYear);
    const lastMonth = Number(this.selectedMonth) === 1 ? 12 : Number(this.selectedMonth) - 1;
    const lastYear = Number(this.selectedMonth) === 1 ? Number(this.selectedYear) - 1 : Number(this.selectedYear);
    const lastMonthTrx = this.getFilteredTransactions(lastMonth, lastYear);

    const totalIncome = currentMonthTrx
      .filter(t => (t.type || '').toLowerCase() === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalExpense = currentMonthTrx
      .filter(t => (t.type || '').toLowerCase() === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalSaving = currentMonthTrx
      .filter(t => ['saving', 'goal'].includes((t.type || '').toLowerCase()))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const remaining = totalIncome - totalExpense - totalSaving;
    const savingsRate = totalIncome > 0 ? ((totalSaving / totalIncome) * 100) : 0;
    const netCashFlow = totalIncome - totalExpense;

    const prevIncome = lastMonthTrx.filter(t => (t.type || '').toLowerCase() === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const prevExpense = lastMonthTrx.filter(t => (t.type || '').toLowerCase() === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const prevSaving = lastMonthTrx.filter(t => ['saving', 'goal'].includes((t.type || '').toLowerCase())).reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const prevRemaining = prevIncome - prevExpense - prevSaving;
    const prevSavingsRate = prevIncome > 0 ? (prevSaving / prevIncome) * 100 : 0;

    const incomeGrowth = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;
    const expenseGrowth = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : 0;
    const savingGrowth = prevSaving > 0 ? ((totalSaving - prevSaving) / prevSaving) * 100 : 0;
    const remainingGrowth = prevRemaining > 0 ? ((remaining - prevRemaining) / prevRemaining) * 100 : 0;
    const rateGrowth = savingsRate - prevSavingsRate;

    return {
      totalIncome,
      totalExpense,
      totalSaving,
      remaining,
      savingsRate,
      netCashFlow,
      incomeGrowth: isNaN(incomeGrowth) ? 0 : incomeGrowth,
      expenseGrowth: isNaN(expenseGrowth) ? 0 : expenseGrowth,
      savingGrowth: isNaN(savingGrowth) ? 0 : savingGrowth,
      remainingGrowth: isNaN(remainingGrowth) ? 0 : remainingGrowth,
      rateGrowth: isNaN(rateGrowth) ? 0 : rateGrowth
    };
  }

  getCategoryAnalysisData(categoryName = this.selectedCategory || 'Daily', type = this.analysisType || 'expense') {
    const targetCat = (categoryName || '').toLowerCase();
    const targetType = (type || 'expense').toLowerCase();
    
    const currentCatTrx = this.getFilteredTransactions().filter(t => 
      (t.type || '').toLowerCase() === targetType && 
      (t.category || t.category_name || '').toLowerCase() === targetCat
    );

    const lastMonth = Number(this.selectedMonth) === 1 ? 12 : Number(this.selectedMonth) - 1;
    const lastYear = Number(this.selectedMonth) === 1 ? Number(this.selectedYear) - 1 : Number(this.selectedYear);
    const prevCatTrx = this.getFilteredTransactions(lastMonth, lastYear).filter(t => 
      (t.type || '').toLowerCase() === targetType && 
      (t.category || t.category_name || '').toLowerCase() === targetCat
    );

    const kpis = this.getOverviewKPIs();
    const totalOverall = targetType === 'income' ? kpis.totalIncome : kpis.totalExpense;
    
    const categoryAmount = currentCatTrx.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const prevCategoryAmount = prevCatTrx.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    const totalTransactions = currentCatTrx.length;
    const avgTransaction = totalTransactions > 0 ? categoryAmount / totalTransactions : 0;
    const percentOfTotal = totalOverall > 0 ? (categoryAmount / totalOverall) * 100 : 0;

    const categoryGrowth = prevCategoryAmount > 0 ? ((categoryAmount - prevCategoryAmount) / prevCategoryAmount) * 100 : 0;

    return {
      totalOverall,
      categoryAmount,
      totalTransactions,
      avgTransaction,
      percentOfTotal,
      overallGrowth: targetType === 'income' ? kpis.incomeGrowth : kpis.expenseGrowth,
      categoryGrowth: isNaN(categoryGrowth) ? 0 : categoryGrowth
    };
  }

  getCategoryBreakdown(type = 'expense') {
    const trx = this.getFilteredTransactions().filter(t => (t.type || '').toLowerCase() === type);
    const total = trx.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    if (total === 0) return [];

    const map = {};
    trx.forEach(t => {
      const cat = t.category || t.category_name || 'Others';
      map[cat] = (map[cat] || 0) + Number(t.amount || 0);
    });

    const categoryDefs = this.categories.filter(c => c.type === type);

    let results = [];

    if (categoryDefs.length > 0) {
      results = categoryDefs.map(c => {
        const amount = map[c.name] || 0;
        const percentage = total > 0 ? (amount / total) * 100 : 0;
        return {
          name: c.name,
          amount,
          percentage: Number(percentage.toFixed(1)),
          color: c.color,
          growth: '0.0%'
        };
      }).filter(item => item.amount > 0);
    }

    if (results.length === 0) {
      const colors = ['#198754', '#20c997', '#ffc107', '#fd7e14', '#dc3545', '#6c757d', '#0d6efd'];
      results = Object.keys(map).map((catName, idx) => {
        const amount = map[catName];
        const percentage = total > 0 ? (amount / total) * 100 : 0;
        return {
          name: catName,
          amount,
          percentage: Number(percentage.toFixed(1)),
          color: colors[idx % colors.length],
          growth: '0.0%'
        };
      });
    }

    return results.sort((a, b) => b.amount - a.amount);
  }

  getSubcategoryBreakdown(categoryName = this.selectedCategory, type = this.analysisType || 'expense') {
    const targetCat = (categoryName || '').toLowerCase();
    const targetType = (type || 'expense').toLowerCase();
    
    const trx = this.getFilteredTransactions().filter(t => 
      (t.type || '').toLowerCase() === targetType && 
      (t.category || t.category_name || '').toLowerCase() === targetCat
    );
    const total = trx.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const map = {};
    trx.forEach(t => {
      const sub = t.subcategory || 'Lainnya';
      map[sub] = (map[sub] || 0) + Number(t.amount || 0);
    });

    const colors = targetType === 'income' 
      ? ['#047857', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'] 
      : ['#047857', '#10b981', '#f59e0b', '#3b82f6', '#e11d48', '#8b5cf6', '#64748b'];

    return Object.keys(map).map((sub, idx) => {
      const amount = map[sub];
      const percentage = total > 0 ? (amount / total) * 100 : 0;
      return {
        name: sub,
        amount,
        percentage: Number(percentage.toFixed(1)),
        color: colors[idx % colors.length]
      };
    }).sort((a, b) => b.amount - a.amount);
  }

  getTopCategoryTransactions(categoryName = this.selectedCategory, type = this.analysisType || 'expense', limit = 5) {
    const targetCat = (categoryName || '').toLowerCase();
    const targetType = (type || 'expense').toLowerCase();

    return this.getFilteredTransactions()
      .filter(t => (t.type || '').toLowerCase() === targetType && (t.category || t.category_name || '').toLowerCase() === targetCat)
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, limit);
  }

  getTopExpenseTransactions(limit = 5, categoryFilter = null) {
    let trx = this.getFilteredTransactions().filter(t => (t.type || '').toLowerCase() === 'expense');
    if (categoryFilter) {
      const cat = categoryFilter.toLowerCase();
      trx = trx.filter(t => (t.category || t.category_name || '').toLowerCase() === cat);
    }
    return trx.sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, limit);
  }

  getSpendingSummary() {
    const expenses = this.getFilteredTransactions().filter(t => (t.type || '').toLowerCase() === 'expense');
    const totalExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalTrxCount = expenses.length;

    const averageDaily = totalTrxCount > 0 ? Math.round(totalExpense / totalTrxCount) : 0;

    const highestExpenseTrx = expenses.length > 0 
      ? expenses.reduce((max, t) => Number(t.amount) > Number(max.amount) ? t : max, expenses[0]) 
      : null;

    const catBreakdown = this.getCategoryBreakdown('expense');
    const largestCategory = catBreakdown.length > 0 ? catBreakdown[0] : { name: '-', percentage: '0' };

    return {
      averageDaily,
      highestDay: highestExpenseTrx ? new Date(highestExpenseTrx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
      highestDayAmount: highestExpenseTrx ? Number(highestExpenseTrx.amount) : 0,
      highestExpenseItem: highestExpenseTrx ? highestExpenseTrx.item : '-',
      highestExpenseCategory: highestExpenseTrx ? (highestExpenseTrx.category || highestExpenseTrx.category_name) : '-',
      highestExpenseAmount: highestExpenseTrx ? Number(highestExpenseTrx.amount) : 0,
      totalTransactions: expenses.length,
      largestCategoryName: largestCategory.name,
      largestCategoryPercent: largestCategory.percentage
    };
  }

  getGoalsSummary() {
    const activeGoalsList = this.savingGoals.filter(g => {
      const pct = (g.targetAmount > 0) ? (g.savedAmount / g.targetAmount) * 100 : 0;
      return pct < 100 && g.status !== 'Selesai' && g.status !== 'Completed';
    });

    const totalSaved = activeGoalsList.reduce((sum, g) => sum + Number(g.savedAmount || 0), 0);
    const totalTarget = activeGoalsList.reduce((sum, g) => sum + Number(g.targetAmount || 0), 0);
    const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
    const remainingToGoal = Math.max(0, totalTarget - totalSaved);
    const activeGoals = activeGoalsList.length;

    const thisMonthContribs = this.savingContributions.filter(c => {
      if (!c.date) return false;
      const d = new Date(c.date);
      return (d.getMonth() + 1) === Number(this.selectedMonth) && d.getFullYear() === Number(this.selectedYear);
    });

    const contribMap = {};
    thisMonthContribs.forEach(c => {
      contribMap[c.goalName] = (contribMap[c.goalName] || 0) + Number(c.amount || 0);
    });

    const goalContributions = this.savingGoals.map(g => {
      const saved = contribMap[g.name] || 0;
      const percent = totalSaved > 0 ? (saved / totalSaved) * 100 : 0;
      return {
        name: g.name,
        saved,
        percent: Number(percent.toFixed(1)),
        color: g.color || '#047857'
      };
    });

    return {
      totalSaved,
      totalTarget,
      overallProgress: Number(overallProgress.toFixed(1)),
      remainingToGoal,
      activeGoals,
      goalContributions,
      totalThisMonth: thisMonthContribs.reduce((sum, c) => sum + Number(c.amount || 0), 0)
    };
  }

  getMonthlyTrendData(year = this.selectedYear) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendData = months.map(m => ({ month: m, income: 0, expense: 0, saving: 0 }));

    this.transactions.forEach(t => {
      const dateVal = t.date || t.created_at;
      if (!dateVal) return;

      const dateStr = dateVal.toString().substring(0, 10);
      const parts = dateStr.split('-');
      if (parts.length < 2) return;

      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;

      if (y === Number(year) && m >= 0 && m < 12) {
        const amt = Number(t.amount) || 0;
        const type = (t.type || '').toLowerCase();

        if (type === 'income') trendData[m].income += amt;
        else if (type === 'expense') trendData[m].expense += amt;
        else if (['saving', 'goal'].includes(type)) trendData[m].saving += amt;
      }
    });

    return trendData;
  }

  async deleteGoal(id, name) {
    this.savingGoals = this.savingGoals.filter(g => String(g.id) !== String(id) && g.name !== name);
    this.touchUpdated();

    if (supabaseService && supabaseService.isConnected) {
      await supabaseService.deleteSavingGoal(id, name);
    }

    this.notify();
  }

  // --- ADD CUSTOM CATEGORY METHOD ---
  async addCustomCategory({ name, type, subcategory = 'General' }) {
    let cat = (this.categories || []).find(c => c.name.toLowerCase() === name.toLowerCase() && c.type === type);

    if (!cat) {
      cat = {
        id: 'cat_' + Date.now(),
        name,
        type,
        color: type === 'income' ? '#10b981' : '#ef4444',
        icon: 'Folder',
        isSystem: false,
        subcategories: [subcategory]
      };
      this.categories.push(cat);

      if (supabaseService && supabaseService.isConnected) {
        await supabaseService.addCategory(cat);
      }
    } else {
      if (!cat.subcategories.includes(subcategory)) {
        cat.subcategories.push(subcategory);
        if (supabaseService && supabaseService.isConnected) {
          await supabaseService.updateSubcategories(cat.id, cat.subcategories);
        }
      }
    }

    this.notify();
    return cat;
  }

  async addCustomSubcategory(categoryName, subcategoryName) {
    const cat = (this.categories || []).find(c => c.name === categoryName);
    if (cat) {
      if (!cat.subcategories.includes(subcategoryName)) {
        cat.subcategories.push(subcategoryName);
        if (supabaseService && supabaseService.isConnected) {
          await supabaseService.updateSubcategories(cat.id, cat.subcategories);
        }
        this.notify();
      }
    }
  }

  async deleteCategory(categoryId) {
    const targetCat = (this.categories || []).find(c => String(c.id) === String(categoryId));
    if (!targetCat) return;

    if (targetCat.isSystem) {
      alert('Kategori bawaan sistem tidak dapat dihapus.');
      return;
    }

    (this.transactions || []).forEach(t => {
      if (t.category === targetCat.name && t.type === targetCat.type) {
        t.category = 'Others';
        t.subcategory = 'General';
      }
    });

    this.categories = this.categories.filter(c => String(c.id) !== String(categoryId));

    if (supabaseService && supabaseService.isConnected) {
      await supabaseService.deleteCategory(targetCat.id, targetCat.name, targetCat.type);
    }

    this.notify();
  }
}

export const state = new AppState();