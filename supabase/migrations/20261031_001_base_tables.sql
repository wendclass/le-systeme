-- ==============================================================================
-- MIGRATION 001 : TABLES DE BASE FENÊTRE DE STATUT & QUÊTE QUOTIDIENNE
-- ==============================================================================
-- Permet à Le Système de fonctionner sur la base commune wendclass.com (Option A)
-- Ne modifie aucune table existante du site web officiel.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table Objectif Utilisateur (User Objectives)
CREATE TABLE IF NOT EXISTS public.user_objectives (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  montant_cible NUMERIC NOT NULL,
  date_cible DATE NOT NULL,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_user_objective UNIQUE (uid)
);

-- 2. Table Clients (Usage existant compta)
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  nom TEXT NOT NULL,
  entreprise TEXT,
  email TEXT,
  telephone TEXT,
  activite_ids TEXT[],
  statut TEXT DEFAULT 'prospect',
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

-- 3. Table Activités (Framework Chris Do)
CREATE TABLE IF NOT EXISTS public.activities (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  nom TEXT NOT NULL,
  couleur TEXT NOT NULL,
  icone TEXT NOT NULL,
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  statut TEXT DEFAULT 'active',
  rang_actuel TEXT DEFAULT 'E'
);

-- 4. Table Transactions (Fenêtre de Statut)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  date DATE NOT NULL,
  montant_original NUMERIC NOT NULL,
  devise_origine TEXT NOT NULL,
  montant_usd NUMERIC NOT NULL,
  type TEXT NOT NULL,
  activite_id TEXT NOT NULL,
  client_id TEXT,
  categorie TEXT NOT NULL,
  note TEXT
);

-- 5. Table Charges Récurrentes
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  nom TEXT NOT NULL,
  nature TEXT NOT NULL,
  activite_id TEXT,
  montant_original NUMERIC NOT NULL,
  devise_origine TEXT NOT NULL,
  montant_usd NUMERIC NOT NULL,
  frequence TEXT NOT NULL,
  date_premier_paiement DATE NOT NULL,
  date_fin DATE,
  statut TEXT DEFAULT 'actif'
);

-- 6. Table Quête Quotidienne (Daily Tasks)
CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  titre TEXT NOT NULL,
  activite_id TEXT,
  date DATE NOT NULL,
  est_la_priorite BOOLEAN DEFAULT FALSE,
  statut TEXT DEFAULT 'a_faire',
  note TEXT
);

-- 7. Table Réglages Utilisateur (Profit First & devises)
CREATE TABLE IF NOT EXISTS public.user_settings (
  uid TEXT PRIMARY KEY,
  profit_first JSONB NOT NULL DEFAULT '{"profit": 5, "owner_pay": 50, "tax": 15, "opex": 30}'::jsonb,
  xof_to_usd_rate NUMERIC DEFAULT 0.00165,
  rate_updated_at TIMESTAMPTZ DEFAULT NOW(),
  currency_api_url TEXT,
  opex_alert_threshold NUMERIC DEFAULT 30,
  showcase_interests TEXT[] DEFAULT '{}'
);

-- Activer Row Level Security (RLS)
ALTER TABLE public.user_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Politiques RLS strictes : chaque utilisateur n'accède qu'à ses propres données
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own objective' AND tablename = 'user_objectives') THEN
    CREATE POLICY "Users manage own objective" ON public.user_objectives FOR ALL USING (uid = auth.uid()::text) WITH CHECK (uid = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own clients' AND tablename = 'clients') THEN
    CREATE POLICY "Users manage own clients" ON public.clients FOR ALL USING (uid = auth.uid()::text) WITH CHECK (uid = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own activities' AND tablename = 'activities') THEN
    CREATE POLICY "Users manage own activities" ON public.activities FOR ALL USING (uid = auth.uid()::text) WITH CHECK (uid = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own transactions' AND tablename = 'transactions') THEN
    CREATE POLICY "Users manage own transactions" ON public.transactions FOR ALL USING (uid = auth.uid()::text) WITH CHECK (uid = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own recurring' AND tablename = 'recurring_expenses') THEN
    CREATE POLICY "Users manage own recurring" ON public.recurring_expenses FOR ALL USING (uid = auth.uid()::text) WITH CHECK (uid = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own tasks' AND tablename = 'daily_tasks') THEN
    CREATE POLICY "Users manage own tasks" ON public.daily_tasks FOR ALL USING (uid = auth.uid()::text) WITH CHECK (uid = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own settings' AND tablename = 'user_settings') THEN
    CREATE POLICY "Users manage own settings" ON public.user_settings FOR ALL USING (uid = auth.uid()::text) WITH CHECK (uid = auth.uid()::text);
  END IF;
END $$;
