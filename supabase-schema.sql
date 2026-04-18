-- CardGrader Database Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id, new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- CARDS
-- ============================================================
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_name text,
  year integer,
  brand text,
  set_name text,
  card_number text,
  variant text,
  sport text,
  condition text DEFAULT 'raw',
  grade_company text,
  grade_value numeric(3,1),
  grade_label text,
  estimated_value_cents integer,
  purchase_price_cents integer,
  notes text,
  tags text[] DEFAULT '{}',
  ai_identification jsonb,
  status text NOT NULL DEFAULT 'in_collection',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_user_id ON public.cards(user_id);
CREATE INDEX idx_cards_sport ON public.cards(sport);
CREATE INDEX idx_cards_status ON public.cards(status);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own cards" ON public.cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards" ON public.cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON public.cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cards" ON public.cards FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- CARD IMAGES
-- ============================================================
CREATE TABLE public.card_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  side text DEFAULT 'front',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.card_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own card images" ON public.card_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own card images" ON public.card_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own card images" ON public.card_images FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- CARD GRADES
-- ============================================================
CREATE TABLE public.card_grades (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  overall_grade numeric(3,1) NOT NULL,
  overall_label text NOT NULL,
  centering_score numeric(3,1),
  centering_notes text,
  corners_score numeric(3,1),
  corners_notes text,
  edges_score numeric(3,1),
  edges_notes text,
  surface_score numeric(3,1),
  surface_notes text,
  card_identification text,
  explanation text,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.card_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own grades" ON public.card_grades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own grades" ON public.card_grades FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- MARKETPLACE CONNECTIONS
-- ============================================================
CREATE TABLE public.marketplace_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marketplace text NOT NULL,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  marketplace_user_id text,
  marketplace_username text,
  is_active boolean NOT NULL DEFAULT true,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, marketplace)
);

ALTER TABLE public.marketplace_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their connections" ON public.marketplace_connections FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- LISTINGS
-- ============================================================
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  marketplace text NOT NULL,
  marketplace_listing_id text,
  marketplace_url text,
  status text NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  description text,
  price_cents integer NOT NULL,
  ai_generated_title text,
  ai_generated_description text,
  error_message text,
  listed_at timestamptz,
  sold_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their listings" ON public.listings FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- CARD SEARCHES (Card Hunter)
-- ============================================================
CREATE TABLE public.card_searches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  max_price_cents integer,
  marketplaces text[] DEFAULT '{}',
  last_run_at timestamptz,
  result_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.card_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their searches" ON public.card_searches FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- SEARCH RESULTS
-- ============================================================
CREATE TABLE public.search_results (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_id uuid NOT NULL REFERENCES public.card_searches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marketplace text NOT NULL,
  marketplace_listing_id text,
  listing_url text NOT NULL,
  title text NOT NULL,
  price_cents integer,
  image_url text,
  seller_name text,
  found_at timestamptz NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  UNIQUE(search_id, marketplace, marketplace_listing_id)
);

ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their results" ON public.search_results FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- REPACKS
-- ============================================================
CREATE TABLE public.repacks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  target_items integer,
  target_cost_cents integer,
  ceiling_cost_cents integer,
  floor_cost_cents integer,
  status text NOT NULL DEFAULT 'draft',
  is_template boolean NOT NULL DEFAULT false,
  template_id uuid REFERENCES public.repacks(id) ON DELETE SET NULL,
  sold_at timestamptz,
  sold_price_cents integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their repacks" ON public.repacks FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- REPACK ITEMS
-- ============================================================
CREATE TABLE public.repack_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  repack_id uuid NOT NULL REFERENCES public.repacks(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(repack_id, card_id)
);

-- ============================================================
-- COLLECTION INSIGHTS
-- ============================================================
CREATE TABLE public.collection_insights (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_html text NOT NULL,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collection_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their insights" ON public.collection_insights FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- AUTO-UPDATE TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ============================================================
-- CREATE PROFILE FOR EXISTING TEST USER
-- ============================================================
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, raw_user_meta_data ->> 'full_name'
FROM auth.users
WHERE email = 'test@cardgrader.com'
ON CONFLICT (id) DO NOTHING;
