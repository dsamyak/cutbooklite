-- ==========================================
-- CutBook Lite - Supabase Database Schema
-- ==========================================

-- 1. Create Tables

CREATE TABLE owners (
  id UUID PRIMARY KEY, -- Maps to auth.users.id
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  temp_password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL, -- 'CASH' or 'UPI'
  service_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  expense_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID UNIQUE REFERENCES owners(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'TRIAL', 'ACTIVE', 'LAPSED', etc.
  plan_name TEXT NOT NULL,
  current_period_end TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. Auth Trigger for New Owners
-- Automatically inserts into `owners` and gives a TRIAL subscription when a user signs up.
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Only insert if they registered as an OWNER
  IF new.raw_user_meta_data->>'role' = 'OWNER' THEN
    INSERT INTO public.owners (id, email, name)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'name');
    
    INSERT INTO public.subscriptions (owner_id, status, plan_name, current_period_end)
    VALUES (new.id, 'TRIAL', 'Free Trial', NOW() + INTERVAL '14 days');
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 3. Row Level Security (RLS) Policies
-- ==========================================

ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to read/update their own owner profile
CREATE POLICY "Owners can view own profile" ON owners FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Owners can update own profile" ON owners FOR UPDATE USING (auth.uid() = id);

-- Salons: Owners can CRUD their own salons. Barbers can view salons they are assigned to.
CREATE POLICY "Owners can manage own salons" ON salons FOR ALL USING (auth.uid() = owner_id);

-- Barbers: Owners can CRUD their own barbers.
CREATE POLICY "Owners can manage own barbers" ON barbers FOR ALL USING (auth.uid() = owner_id);
-- (Optional) allow barbers to read their own row if they log in
CREATE POLICY "Barbers can view own row" ON barbers FOR SELECT USING (auth.jwt()->>'email' = email);

-- Services: Owners can view all. Barbers can insert their own.
CREATE POLICY "Owners can view and manage own services" ON services FOR ALL USING (auth.uid() = owner_id);

-- Expenses: Owners only
CREATE POLICY "Owners can manage own expenses" ON expenses FOR ALL USING (auth.uid() = owner_id);

-- Subscriptions: Owners can view own
CREATE POLICY "Owners can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = owner_id);

-- Admin overriding for dashboard (In a real app, you would check if auth.uid() is an admin)
-- For MVP purposes, if you need the admin dashboard to work, you might want to create a permissive policy
-- or an RPC function to bypass RLS, but this covers standard owner flows!
