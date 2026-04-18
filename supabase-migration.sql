-- CardGrader Migration: Create 8 missing tables
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/ivpvvjoiqsrqpsqrfoyu/sql

-- 1. Shows (Show Mode)
CREATE TABLE IF NOT EXISTS public.shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shows_all" ON public.shows FOR ALL USING (auth.uid() = user_id);

-- 2. Show Sales
CREATE TABLE IF NOT EXISTS public.show_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_name text NOT NULL,
  price_cents integer NOT NULL,
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  sold_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.show_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "show_sales_all" ON public.show_sales FOR ALL USING (auth.uid() = user_id);

-- 3. Card Sets (Set Tracker)
CREATE TABLE IF NOT EXISTS public.card_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  year integer,
  brand text,
  sport text,
  total_cards integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.card_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "card_sets_all" ON public.card_sets FOR ALL USING (auth.uid() = user_id);

-- 4. Set Cards
CREATE TABLE IF NOT EXISTS public.set_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.card_sets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_number text NOT NULL,
  card_name text,
  is_owned boolean NOT NULL DEFAULT false,
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.set_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "set_cards_all" ON public.set_cards FOR ALL USING (auth.uid() = user_id);

-- 5. Consignors
CREATE TABLE IF NOT EXISTS public.consignors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  commission_rate numeric(5,2) NOT NULL DEFAULT 15,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consignors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consignors_all" ON public.consignors FOR ALL USING (auth.uid() = user_id);

-- 6. Consignment Items
CREATE TABLE IF NOT EXISTS public.consignment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consignor_id uuid NOT NULL REFERENCES public.consignors(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  added_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consignment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consignment_items_all" ON public.consignment_items FOR ALL USING (auth.uid() = user_id);

-- 7. Payouts
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consignor_id uuid NOT NULL REFERENCES public.consignors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  notes text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts_all" ON public.payouts FOR ALL USING (auth.uid() = user_id);

-- 8. Portfolio Snapshots
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_value_cents integer NOT NULL DEFAULT 0,
  card_count integer NOT NULL DEFAULT 0,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, snapshot_date)
);
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portfolio_snapshots_all" ON public.portfolio_snapshots FOR ALL USING (auth.uid() = user_id);
