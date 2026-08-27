-- ==============================================================================
-- DATARYWORKS EXPENSE TRACKER - SUPABASE DATABASE SETUP SCRIPT
-- ==============================================================================
-- Cara Menggunakan:
-- 1. Buka dashboard Supabase kamu di https://supabase.com
-- 2. Masuk ke menu "SQL Editor" di sidebar kiri.
-- 3. Klik "New Query", paste seluruh isi skrip ini, lalu klik "Run".
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if re-running (Clean setup)
DROP TABLE IF EXISTS saving_contributions CASCADE;
DROP TABLE IF EXISTS saving_goals CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS subcategories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 3. Profiles Table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    currency TEXT DEFAULT 'IDR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Accounts Table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'income' or 'expense'
    color TEXT NOT NULL,
    icon TEXT DEFAULT 'Folder',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Subcategories Table
CREATE TABLE subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    item_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL, -- 'income', 'expense', 'saving'
    category_name TEXT NOT NULL,
    subcategory_name TEXT,
    payment_method TEXT DEFAULT 'Cash',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Saving Goals Table
CREATE TABLE saving_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC NOT NULL,
    saved_amount NUMERIC DEFAULT 0,
    deadline DATE,
    status TEXT DEFAULT 'On Track',
    icon TEXT DEFAULT 'Target',
    color TEXT DEFAULT '#198754',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Saving Contributions Table
CREATE TABLE saving_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES saving_goals(id) ON DELETE CASCADE,
    goal_name TEXT NOT NULL,
    date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    payment_method TEXT DEFAULT 'Transfer Bank',
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saving_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE saving_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on categories" ON categories FOR ALL USING (true);
CREATE POLICY "Allow public select on subcategories" ON subcategories FOR ALL USING (true);
CREATE POLICY "Allow all on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all on saving_goals" ON saving_goals FOR ALL USING (true);
CREATE POLICY "Allow all on saving_contributions" ON saving_contributions FOR ALL USING (true);

-- Initial Categories
INSERT INTO categories (name, type, color, icon) VALUES
('Daily', 'expense', '#198754', 'ShoppingBag'),
('Lifestyle', 'expense', '#20c997', 'Coffee'),
('Needs', 'expense', '#ffc107', 'Home'),
('Social', 'expense', '#fd7e14', 'Users'),
('Unexpected', 'expense', '#dc3545', 'AlertCircle'),
('Others', 'expense', '#6c757d', 'MoreHorizontal'),
('Salary', 'income', '#198754', 'DollarSign'),
('Freelance', 'income', '#20c997', 'Briefcase'),
('Business', 'income', '#ffc107', 'TrendingUp'),
('Investment', 'income', '#0d6efd', 'PieChart'),
('Others', 'income', '#6c757d', 'MoreHorizontal');

INSERT INTO subcategories (category_id, name)
SELECT id, unnest(ARRAY['Food', 'Fuel', 'Groceries', 'Other Daily Needs', 'Transportation'])
FROM categories WHERE name = 'Daily';

INSERT INTO subcategories (category_id, name)
SELECT id, unnest(ARRAY['Shopping', 'Entertainment', 'Hobby', 'Personal Care'])
FROM categories WHERE name = 'Lifestyle';

INSERT INTO subcategories (category_id, name)
SELECT id, unnest(ARRAY['Housing', 'Utilities', 'Healthcare', 'Insurance'])
FROM categories WHERE name = 'Needs';

INSERT INTO subcategories (category_id, name)
SELECT id, unnest(ARRAY['Eating Out', 'Hangout', 'Gift & Donation', 'Family'])
FROM categories WHERE name = 'Social';

INSERT INTO subcategories (category_id, name)
SELECT id, unnest(ARRAY['Emergency', 'Vehicle Repair', 'Medical', 'Home Repair'])
FROM categories WHERE name = 'Unexpected';

INSERT INTO subcategories (category_id, name)
SELECT id, unnest(ARRAY['Main Salary', 'Bonus', 'Allowance'])
FROM categories WHERE name = 'Salary';

INSERT INTO subcategories (category_id, name)
SELECT id, unnest(ARRAY['Design & Creative', 'Tech & Web Project', 'Consulting'])
FROM categories WHERE name = 'Freelance';

INSERT INTO subcategories (category_id, name)
SELECT id, unnest(ARRAY['Store Sales', 'Service Revenue', 'Affiliate'])
FROM categories WHERE name = 'Business';

INSERT INTO subcategories (category_id, name)
SELECT id, unnest(ARRAY['Stock Dividends', 'Mutual Funds', 'Crypto / P2P'])
FROM categories WHERE name = 'Investment';

-- Initial Goals
INSERT INTO saving_goals (name, target_amount, saved_amount, deadline, status, icon, color) VALUES
('Liburan ke Jepang', 10000000, 5000000, '2024-12-31', 'On Track', 'Plane', '#198754'),
('Dana Rumah', 8000000, 2500000, '2025-06-30', 'On Track', 'Home', '#0d6efd'),
('Dana Pendidikan', 3000000, 750000, '2024-10-31', 'Behind', 'GraduationCap', '#ffc107'),
('Dana Darurat', 2000000, 500000, '2024-09-30', 'Behind', 'ShieldAlert', '#dc3545');

-- May 2024 Transactions
INSERT INTO transactions (date, item_name, amount, type, category_name, subcategory_name, payment_method) VALUES
('2024-05-18', 'iPhone 15 Case', 1200000, 'expense', 'Lifestyle', 'Shopping', 'Credit Card'),
('2024-05-18', 'Rent Payment', 1000000, 'expense', 'Needs', 'Housing', 'Transfer Bank'),
('2024-05-17', 'Groceries at Superindo', 485000, 'expense', 'Daily', 'Groceries', 'e-Wallet'),
('2024-05-15', 'Dinner at Sushi Tei', 420000, 'expense', 'Social', 'Eating Out', 'Credit Card'),
('2024-05-14', 'Fuel Fill Up', 350000, 'expense', 'Daily', 'Fuel', 'Debit Card'),
('2024-05-14', 'Lunch - Office', 180000, 'expense', 'Daily', 'Food', 'e-Wallet'),
('2024-05-13', 'Morning Coffee', 120000, 'expense', 'Daily', 'Food', 'Cash'),
('2024-05-12', 'Electricity Bill', 200000, 'expense', 'Needs', 'Utilities', 'Transfer Bank'),
('2024-05-10', 'Netflix & Spotify', 250000, 'expense', 'Lifestyle', 'Entertainment', 'Credit Card'),
('2024-05-08', 'Vehicle Service', 750000, 'expense', 'Unexpected', 'Vehicle Repair', 'Debit Card'),
('2024-05-05', 'Weekend Hangout', 380000, 'expense', 'Social', 'Hangout', 'e-Wallet'),
('2024-05-03', 'Pharmacy & Vitamins', 300000, 'expense', 'Needs', 'Healthcare', 'Cash'),
('2024-05-02', 'Office Supplies & Admin', 250000, 'expense', 'Others', 'Miscellaneous', 'Debit Card'),
('2024-05-01', 'Monthly Salary', 8000000, 'income', 'Salary', 'Main Salary', 'Transfer Bank'),
('2024-05-10', 'Freelance UI/UX Project', 1500000, 'income', 'Freelance', 'Design & Creative', 'Transfer Bank'),
('2024-05-12', 'Online Store Sales', 300000, 'income', 'Business', 'Store Sales', 'e-Wallet'),
('2024-05-15', 'Stock Dividend Payout', 150000, 'income', 'Investment', 'Stock Dividends', 'Transfer Bank'),
('2024-05-18', 'Cashback & Promo', 50000, 'income', 'Others', 'Cashbacks', 'e-Wallet');

-- Saving Contributions
INSERT INTO saving_contributions (goal_name, date, amount, payment_method, note) VALUES
('Liburan ke Jepang', '2024-05-18', 500000, 'Transfer Bank', 'Alokasi sisa freelance'),
('Dana Rumah', '2024-05-17', 300000, 'Transfer Bank', 'Tabungan rutin bulanan'),
('Dana Pendidikan', '2024-05-16', 250000, 'E-Wallet', 'Dana kursus'),
('Dana Darurat', '2024-05-15', 200000, 'Transfer Bank', 'Pos darurat bulanan'),
('Liburan ke Jepang', '2024-05-14', 400000, 'Transfer Bank', 'Cicilan tiket');
