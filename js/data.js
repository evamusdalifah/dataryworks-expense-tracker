// ==============================================================================
// DATARYWORKS EXPENSE TRACKER - DEFAULT SEED & MASTER DATA
// ==============================================================================

export const DEFAULT_CATEGORIES = [
  // Expense Categories
  { id: 'cat-exp-1', name: 'Daily', type: 'expense', color: '#198754', icon: 'ShoppingBag', subcategories: ['Food', 'Fuel', 'Groceries', 'Other Daily Needs', 'Transportation'] },
  { id: 'cat-exp-2', name: 'Lifestyle', type: 'expense', color: '#20c997', icon: 'Coffee', subcategories: ['Shopping', 'Entertainment', 'Hobby', 'Personal Care'] },
  { id: 'cat-exp-3', name: 'Needs', type: 'expense', color: '#ffc107', icon: 'Home', subcategories: ['Housing', 'Utilities', 'Healthcare', 'Insurance'] },
  { id: 'cat-exp-4', name: 'Social', type: 'expense', color: '#fd7e14', icon: 'Users', subcategories: ['Eating Out', 'Hangout', 'Gift & Donation', 'Family'] },
  { id: 'cat-exp-5', name: 'Unexpected', type: 'expense', color: '#dc3545', icon: 'AlertCircle', subcategories: ['Emergency', 'Vehicle Repair', 'Medical', 'Home Repair'] },
  { id: 'cat-exp-6', name: 'Others', type: 'expense', color: '#6c757d', icon: 'MoreHorizontal', subcategories: ['Bank & Admin Fees', 'Miscellaneous'] },

  // Income Categories
  { id: 'cat-inc-1', name: 'Salary', type: 'income', color: '#198754', icon: 'DollarSign', subcategories: ['Main Salary', 'Bonus', 'Allowance'] },
  { id: 'cat-inc-2', name: 'Freelance', type: 'income', color: '#20c997', icon: 'Briefcase', subcategories: ['Design & Creative', 'Tech & Web Project', 'Consulting'] },
  { id: 'cat-inc-3', name: 'Business', type: 'income', color: '#ffc107', icon: 'TrendingUp', subcategories: ['Store Sales', 'Service Revenue', 'Affiliate'] },
  { id: 'cat-inc-4', name: 'Investment', type: 'income', color: '#0d6efd', icon: 'PieChart', subcategories: ['Stock Dividends', 'Mutual Funds', 'Crypto / P2P'] },
  { id: 'cat-inc-5', name: 'Others', type: 'income', color: '#6c757d', icon: 'MoreHorizontal', subcategories: ['Cashbacks & Rewards', 'Gift', 'Reimbursement'] },
];

export const PAYMENT_METHODS = [
  'Transfer Bank',
  'Credit Card',
  'Debit Card',
  'e-Wallet',
  'Cash'
];

export const DEFAULT_GOALS = [
  {
    id: 'goal-1',
    name: 'Liburan ke Jepang',
    targetAmount: 10000000,
    savedAmount: 5000000,
    deadline: '2024-12-31',
    status: 'On Track',
    icon: 'Plane',
    color: '#198754',
    note: 'Tiket & Akomodasi Tokyo-Kyoto'
  },
  {
    id: 'goal-2',
    name: 'Dana Rumah',
    targetAmount: 8000000,
    savedAmount: 2500000,
    deadline: '2025-06-30',
    status: 'On Track',
    icon: 'Home',
    color: '#0d6efd',
    note: 'DP Renovasi'
  },
  {
    id: 'goal-3',
    name: 'Dana Pendidikan',
    targetAmount: 3000000,
    savedAmount: 750000,
    deadline: '2024-10-31',
    status: 'Behind',
    icon: 'GraduationCap',
    color: '#ffc107',
    note: 'Kursus Data Science'
  },
  {
    id: 'goal-4',
    name: 'Dana Darurat',
    targetAmount: 2000000,
    savedAmount: 500000,
    deadline: '2024-09-30',
    status: 'Behind',
    icon: 'ShieldAlert',
    color: '#dc3545',
    note: 'Minimal 3x Pengeluaran Bulanan'
  }
];

export const DEFAULT_CONTRIBUTIONS = [
  { id: 'sav-01', goalId: 'goal-1', goalName: 'Liburan ke Jepang', date: '2024-05-18', amount: 500000, paymentMethod: 'Transfer Bank', note: 'Alokasi sisa freelance' },
  { id: 'sav-02', goalId: 'goal-2', goalName: 'Dana Rumah', date: '2024-05-17', amount: 300000, paymentMethod: 'Transfer Bank', note: 'Tabungan rutin bulanan' },
  { id: 'sav-03', goalId: 'goal-3', goalName: 'Dana Pendidikan', date: '2024-05-16', amount: 250000, paymentMethod: 'e-Wallet', note: 'Dana kursus' },
  { id: 'sav-04', goalId: 'goal-4', goalName: 'Dana Darurat', date: '2024-05-15', amount: 200000, paymentMethod: 'Transfer Bank', note: 'Pos darurat bulanan' },
  { id: 'sav-05', goalId: 'goal-1', goalName: 'Liburan ke Jepang', date: '2024-05-14', amount: 400000, paymentMethod: 'Transfer Bank', note: 'Cicilan tiket' }
];

export const DEFAULT_TRANSACTIONS = [
  // MAY 2024 EXPENSES (Exact Mockup Match: Total = Rp6.500.000)
  { id: 'trx-01', date: '2024-05-17', item: 'Groceries at Superindo', amount: 485000, type: 'expense', category: 'Daily', subcategory: 'Groceries', paymentMethod: 'e-Wallet' },
  { id: 'trx-02', date: '2024-05-14', item: 'Fuel Fill Up', amount: 350000, type: 'expense', category: 'Daily', subcategory: 'Fuel', paymentMethod: 'Debit Card' },
  { id: 'trx-03', date: '2024-05-14', item: 'Lunch - Office', amount: 180000, type: 'expense', category: 'Daily', subcategory: 'Food', paymentMethod: 'e-Wallet' },
  { id: 'trx-04', date: '2024-05-13', item: 'Morning Coffee', amount: 120000, type: 'expense', category: 'Daily', subcategory: 'Food', paymentMethod: 'Cash' },
  { id: 'trx-05', date: '2024-05-10', item: 'Family Lunch', amount: 320000, type: 'expense', category: 'Daily', subcategory: 'Food', paymentMethod: 'Debit Card' },
  { id: 'trx-06', date: '2024-05-07', item: 'Gasoline & Toll', amount: 150000, type: 'expense', category: 'Daily', subcategory: 'Fuel', paymentMethod: 'e-Wallet' },
  { id: 'trx-07', date: '2024-05-05', item: 'Snacks & Beverages', amount: 195000, type: 'expense', category: 'Daily', subcategory: 'Other Daily Needs', paymentMethod: 'Cash' },
  { id: 'trx-08', date: '2024-05-02', item: 'Office Daily Meals', amount: 200000, type: 'expense', category: 'Daily', subcategory: 'Food', paymentMethod: 'e-Wallet' },

  // Lifestyle: Rp1.500.000
  { id: 'trx-09', date: '2024-05-18', item: 'iPhone 15 Case', amount: 1200000, type: 'expense', category: 'Lifestyle', subcategory: 'Shopping', paymentMethod: 'Credit Card' },
  { id: 'trx-10', date: '2024-05-09', item: 'Netflix & Spotify Premium', amount: 180000, type: 'expense', category: 'Lifestyle', subcategory: 'Entertainment', paymentMethod: 'Credit Card' },
  { id: 'trx-11', date: '2024-05-04', item: 'Badminton Court Booking', amount: 120000, type: 'expense', category: 'Lifestyle', subcategory: 'Hobby', paymentMethod: 'e-Wallet' },

  // Needs: Rp1.200.000
  { id: 'trx-12', date: '2024-05-18', item: 'Rent Payment', amount: 1000000, type: 'expense', category: 'Needs', subcategory: 'Housing', paymentMethod: 'Transfer Bank' },
  { id: 'trx-13', date: '2024-05-11', item: 'Electricity & Water Token', amount: 200000, type: 'expense', category: 'Needs', subcategory: 'Utilities', paymentMethod: 'Transfer Bank' },

  // Social: Rp800.000
  { id: 'trx-14', date: '2024-05-15', item: 'Dinner at Sushi Tei', amount: 420000, type: 'expense', category: 'Social', subcategory: 'Eating Out', paymentMethod: 'Credit Card' },
  { id: 'trx-15', date: '2024-05-06', item: 'Weekend Cafe Meetup', amount: 380000, type: 'expense', category: 'Social', subcategory: 'Hangout', paymentMethod: 'e-Wallet' },

  // Unexpected: Rp750.000
  { id: 'trx-16', date: '2024-05-08', item: 'Motorcycle Service & Oil', amount: 750000, type: 'expense', category: 'Unexpected', subcategory: 'Vehicle Repair', paymentMethod: 'Debit Card' },

  // Others: Rp250.000
  { id: 'trx-17', date: '2024-05-03', item: 'Admin Fees & Courier', amount: 250000, type: 'expense', category: 'Others', subcategory: 'Bank & Admin Fees', paymentMethod: 'Debit Card' },

  // MAY 2024 INCOMES (Exact Mockup Match: Total = Rp10.000.000)
  { id: 'trx-18', date: '2024-05-01', item: 'Monthly Salary (PT Datory)', amount: 8000000, type: 'income', category: 'Salary', subcategory: 'Main Salary', paymentMethod: 'Transfer Bank' },
  { id: 'trx-19', date: '2024-05-10', item: 'Freelance UI/UX Web Project', amount: 1500000, type: 'income', category: 'Freelance', subcategory: 'Design & Creative', paymentMethod: 'Transfer Bank' },
  { id: 'trx-20', date: '2024-05-12', item: 'Online Shop Product Revenue', amount: 300000, type: 'income', category: 'Business', subcategory: 'Store Sales', paymentMethod: 'e-Wallet' },
  { id: 'trx-21', date: '2024-05-15', item: 'Stock Dividend Payout', amount: 150000, type: 'income', category: 'Investment', subcategory: 'Stock Dividends', paymentMethod: 'Transfer Bank' },
  { id: 'trx-22', date: '2024-05-18', item: 'E-Wallet Cashback & Promo', amount: 50000, type: 'income', category: 'Others', subcategory: 'Cashbacks & Rewards', paymentMethod: 'e-Wallet' }
];

// 12-Month Yearly Trends for line charts
export const MONTHLY_TREND_CHART_DATA = [
  { month: 'Jan', income: 6.0, expense: 3.8, saving: 1.2 },
  { month: 'Feb', income: 7.6, expense: 4.4, saving: 1.5 },
  { month: 'Mar', income: 8.0, expense: 4.8, saving: 1.6 },
  { month: 'Apr', income: 9.0, expense: 5.9, saving: 1.8 },
  { month: 'May', income: 10.0, expense: 6.5, saving: 2.0 },
  { month: 'Jun', income: 9.0, expense: 5.5, saving: 2.1 },
  { month: 'Jul', income: 9.5, expense: 5.3, saving: 2.2 },
  { month: 'Aug', income: 9.2, expense: 5.7, saving: 2.3 },
  { month: 'Sep', income: 9.8, expense: 6.2, saving: 2.4 },
  { month: 'Oct', income: 10.0, expense: 6.4, saving: 2.6 },
  { month: 'Nov', income: 10.2, expense: 6.6, saving: 2.8 },
  { month: 'Dec', income: 11.5, expense: 7.2, saving: 3.0 },
];

export const SAVINGS_OVER_TIME_DATA = [
  { month: 'Jan', amount: 2.0 },
  { month: 'Feb', amount: 2.8 },
  { month: 'Mar', amount: 3.6 },
  { month: 'Apr', amount: 4.5 },
  { month: 'May', amount: 5.2 },
  { month: 'Jun', amount: 5.8 },
  { month: 'Jul', amount: 6.3 },
  { month: 'Aug', amount: 6.9 },
  { month: 'Sep', amount: 7.3 },
  { month: 'Oct', amount: 7.8 },
  { month: 'Nov', amount: 8.3 },
  { month: 'Dec', amount: 8.8 },
];
