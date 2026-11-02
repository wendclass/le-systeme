-- ==============================================================================
-- MIGRATION 002 : SOCLE COMPLET CLASS S (TABLES CS_ ET LIVRE DE COMPTE)
-- ==============================================================================
-- Conforme aux spécifications S5 et règles de sécurité S6
-- Préfixe cs_ sur toutes les tables
-- Clés étrangères explicites, id, created_at, updated_at
-- ==============================================================================

-- 1. Fonction de mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION public.cs_handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Table cs_clients
CREATE TABLE IF NOT EXISTS public.cs_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nom TEXT NOT NULL,
  entreprise TEXT,
  whatsapp TEXT NOT NULL,
  email TEXT,
  lien_social TEXT,
  notes_internes TEXT
);

CREATE TRIGGER trg_cs_clients_updated_at
  BEFORE UPDATE ON public.cs_clients
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 3. Table cs_dossiers
CREATE TABLE IF NOT EXISTS public.cs_dossiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_id UUID NOT NULL REFERENCES public.cs_clients(id) ON DELETE CASCADE,
  soumission_id UUID UNIQUE, -- Référence unique vers la demande du questionnaire
  statut TEXT NOT NULL DEFAULT 'Nouvelle',
  decision_examen TEXT CHECK (decision_examen IN ('poursuivre', 'decliner')),
  motif_interne TEXT,
  budget_annonce TEXT,
  acces_client_actif BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_cs_dossiers_statut ON public.cs_dossiers(statut);
CREATE INDEX IF NOT EXISTS idx_cs_dossiers_client_id ON public.cs_dossiers(client_id);
CREATE INDEX IF NOT EXISTS idx_cs_dossiers_soumission_id ON public.cs_dossiers(soumission_id);

CREATE TRIGGER trg_cs_dossiers_updated_at
  BEFORE UPDATE ON public.cs_dossiers
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 4. Table cs_appels
CREATE TABLE IF NOT EXISTS public.cs_appels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dossier_id UUID NOT NULL REFERENCES public.cs_dossiers(id) ON DELETE CASCADE,
  date_heure TIMESTAMPTZ NOT NULL,
  statut TEXT NOT NULL DEFAULT 'planifie' CHECK (statut IN ('planifie', 'realise', 'annule')),
  elements_conception TEXT,
  services_necessaires TEXT,
  modalites_collaboration TEXT,
  notes_libres TEXT
);

CREATE INDEX IF NOT EXISTS idx_cs_appels_dossier_id ON public.cs_appels(dossier_id);

CREATE TRIGGER trg_cs_appels_updated_at
  BEFORE UPDATE ON public.cs_appels
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 5. Table cs_services (Grimoire)
CREATE TABLE IF NOT EXISTS public.cs_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  categorie TEXT NOT NULL,
  nom TEXT NOT NULL,
  description_client TEXT,
  prix_base_fcfa BIGINT NOT NULL DEFAULT 0,
  unite TEXT NOT NULL,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  ordre INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cs_services_categorie ON public.cs_services(categorie);
CREATE INDEX IF NOT EXISTS idx_cs_services_ordre ON public.cs_services(ordre);

CREATE TRIGGER trg_cs_services_updated_at
  BEFORE UPDATE ON public.cs_services
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 6. Table cs_reglages (Ligne unique de configuration Class S)
CREATE TABLE IF NOT EXISTS public.cs_reglages (
  id TEXT PRIMARY KEY DEFAULT 'class_s',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Champs émetteur
  nom TEXT,
  whatsapp TEXT,
  email TEXT,
  ville TEXT,
  ifu TEXT,
  rccm TEXT,
  -- Numérotation
  prefixe_devis TEXT NOT NULL DEFAULT 'DEV',
  prefixe_facture TEXT NOT NULL DEFAULT 'FAC',
  compteur_devis INT NOT NULL DEFAULT 1,
  compteur_facture INT NOT NULL DEFAULT 1,
  -- Modèle de base
  pourcentage_acompte INT NOT NULL DEFAULT 50,
  validite_devis_jours INT NOT NULL DEFAULT 15,
  revisions_incluses INT NOT NULL DEFAULT 3,
  delai_livraison TEXT,
  moyens_paiement JSONB NOT NULL DEFAULT '["Mobile Money", "Virement bancaire", "Espèces"]'::jsonb,
  coordonnees_paiement TEXT,
  remise_fichiers TEXT,
  droits TEXT,
  conditions_complementaires TEXT,
  etapes_base JSONB NOT NULL DEFAULT '["Brief validé", "Recherche et pistes", "Création", "Retouches", "Livraison finale"]'::jsonb,
  modeles_whatsapp JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TRIGGER trg_cs_reglages_updated_at
  BEFORE UPDATE ON public.cs_reglages
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 7. Table cs_devis
CREATE TABLE IF NOT EXISTS public.cs_devis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  numero TEXT NOT NULL UNIQUE,
  dossier_id UUID NOT NULL REFERENCES public.cs_dossiers(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'pret', 'envoye', 'accepte', 'refuse', 'expire', 'remplace')),
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  date_validite DATE NOT NULL,
  conception JSONB NOT NULL DEFAULT '{}'::jsonb,
  modalites JSONB NOT NULL DEFAULT '{}'::jsonb,
  ecarts_base JSONB NOT NULL DEFAULT '[]'::jsonb,
  remise_fcfa BIGINT NOT NULL DEFAULT 0,
  remise_libelle TEXT,
  total_fcfa BIGINT NOT NULL DEFAULT 0,
  accepte_le TIMESTAMPTZ,
  accepte_par_nom TEXT,
  accepte_ip TEXT
);

CREATE INDEX IF NOT EXISTS idx_cs_devis_dossier_id ON public.cs_devis(dossier_id);
CREATE INDEX IF NOT EXISTS idx_cs_devis_numero ON public.cs_devis(numero);
CREATE INDEX IF NOT EXISTS idx_cs_devis_statut ON public.cs_devis(statut);

CREATE TRIGGER trg_cs_devis_updated_at
  BEFORE UPDATE ON public.cs_devis
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 8. Table cs_devis_lignes
CREATE TABLE IF NOT EXISTS public.cs_devis_lignes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  devis_id UUID NOT NULL REFERENCES public.cs_devis(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.cs_services(id) ON DELETE SET NULL,
  libelle TEXT NOT NULL,
  description TEXT,
  quantite NUMERIC NOT NULL DEFAULT 1,
  prix_unitaire_fcfa BIGINT NOT NULL DEFAULT 0,
  total_ligne_fcfa BIGINT GENERATED ALWAYS AS (ROUND(quantite * prix_unitaire_fcfa)) STORED,
  ordre INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cs_devis_lignes_devis_id ON public.cs_devis_lignes(devis_id);

CREATE TRIGGER trg_cs_devis_lignes_updated_at
  BEFORE UPDATE ON public.cs_devis_lignes
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 9. Table cs_factures
CREATE TABLE IF NOT EXISTS public.cs_factures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  numero TEXT NOT NULL UNIQUE,
  dossier_id UUID NOT NULL REFERENCES public.cs_dossiers(id) ON DELETE CASCADE,
  devis_id UUID REFERENCES public.cs_devis(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('acompte', 'solde', 'complete')),
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'envoyee', 'partielle', 'payee', 'annulee')),
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  echeance DATE NOT NULL,
  total_fcfa BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cs_factures_dossier_id ON public.cs_factures(dossier_id);
CREATE INDEX IF NOT EXISTS idx_cs_factures_devis_id ON public.cs_factures(devis_id);
CREATE INDEX IF NOT EXISTS idx_cs_factures_numero ON public.cs_factures(numero);
CREATE INDEX IF NOT EXISTS idx_cs_factures_statut ON public.cs_factures(statut);

CREATE TRIGGER trg_cs_factures_updated_at
  BEFORE UPDATE ON public.cs_factures
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 10. Table cs_facture_lignes
CREATE TABLE IF NOT EXISTS public.cs_facture_lignes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  facture_id UUID NOT NULL REFERENCES public.cs_factures(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.cs_services(id) ON DELETE SET NULL,
  libelle TEXT NOT NULL,
  description TEXT,
  quantite NUMERIC NOT NULL DEFAULT 1,
  prix_unitaire_fcfa BIGINT NOT NULL DEFAULT 0,
  total_ligne_fcfa BIGINT GENERATED ALWAYS AS (ROUND(quantite * prix_unitaire_fcfa)) STORED,
  ordre INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cs_facture_lignes_facture_id ON public.cs_facture_lignes(facture_id);

CREATE TRIGGER trg_cs_facture_lignes_updated_at
  BEFORE UPDATE ON public.cs_facture_lignes
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 11. Table cs_paiements
CREATE TABLE IF NOT EXISTS public.cs_paiements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  facture_id UUID NOT NULL REFERENCES public.cs_factures(id) ON DELETE CASCADE,
  montant_fcfa BIGINT NOT NULL,
  date_reception DATE NOT NULL DEFAULT CURRENT_DATE,
  moyen TEXT NOT NULL,
  reference TEXT,
  numero_recu TEXT NOT NULL UNIQUE,
  valide_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  annule BOOLEAN NOT NULL DEFAULT FALSE,
  motif_annulation TEXT
);

CREATE INDEX IF NOT EXISTS idx_cs_paiements_facture_id ON public.cs_paiements(facture_id);
CREATE INDEX IF NOT EXISTS idx_cs_paiements_annule ON public.cs_paiements(annule);

CREATE TRIGGER trg_cs_paiements_updated_at
  BEFORE UPDATE ON public.cs_paiements
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 12. Table cs_projets (Donjon)
CREATE TABLE IF NOT EXISTS public.cs_projets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dossier_id UUID NOT NULL REFERENCES public.cs_dossiers(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'a_ouvrir' CHECK (statut IN ('a_ouvrir', 'ouvert', 'livre', 'clos')),
  ouvert_le TIMESTAMPTZ,
  derogation_acompte BOOLEAN NOT NULL DEFAULT FALSE,
  motif_derogation TEXT,
  livre_le TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cs_projets_dossier_id ON public.cs_projets(dossier_id);
CREATE INDEX IF NOT EXISTS idx_cs_projets_statut ON public.cs_projets(statut);

CREATE TRIGGER trg_cs_projets_updated_at
  BEFORE UPDATE ON public.cs_projets
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 13. Table cs_etapes
CREATE TABLE IF NOT EXISTS public.cs_etapes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  projet_id UUID NOT NULL REFERENCES public.cs_projets(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  ordre INT NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'a_venir' CHECK (statut IN ('a_venir', 'en_cours', 'terminee')),
  message_client VARCHAR(280),
  terminee_le TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cs_etapes_projet_id ON public.cs_etapes(projet_id);
CREATE INDEX IF NOT EXISTS idx_cs_etapes_ordre ON public.cs_etapes(ordre);

CREATE TRIGGER trg_cs_etapes_updated_at
  BEFORE UPDATE ON public.cs_etapes
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 14. Table cs_liens_clients (/c/[token])
CREATE TABLE IF NOT EXISTS public.cs_liens_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dossier_id UUID NOT NULL REFERENCES public.cs_dossiers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  expire_le TIMESTAMPTZ,
  derniere_ouverture TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cs_liens_clients_token ON public.cs_liens_clients(token);
CREATE INDEX IF NOT EXISTS idx_cs_liens_clients_dossier_id ON public.cs_liens_clients(dossier_id);

CREATE TRIGGER trg_cs_liens_clients_updated_at
  BEFORE UPDATE ON public.cs_liens_clients
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 15. Table cs_retours
CREATE TABLE IF NOT EXISTS public.cs_retours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dossier_id UUID NOT NULL REFERENCES public.cs_dossiers(id) ON DELETE CASCADE,
  note_satisfaction INT CHECK (note_satisfaction >= 1 AND note_satisfaction <= 5),
  commentaire_prive TEXT,
  temoignage_original TEXT,
  temoignage_edite TEXT,
  nom_affiche TEXT,
  fonction_entreprise TEXT,
  photo_url TEXT,
  accord_publication BOOLEAN NOT NULL DEFAULT FALSE,
  statut TEXT NOT NULL DEFAULT 'a_valider' CHECK (statut IN ('a_valider', 'valide', 'publie', 'refuse')),
  publie_le TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cs_retours_dossier_id ON public.cs_retours(dossier_id);
CREATE INDEX IF NOT EXISTS idx_cs_retours_statut ON public.cs_retours(statut);

CREATE TRIGGER trg_cs_retours_updated_at
  BEFORE UPDATE ON public.cs_retours
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 16. Table cs_categories (Livre de compte)
CREATE TABLE IF NOT EXISTS public.cs_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nom TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('entree', 'sortie', 'mixte')),
  ordre INT NOT NULL DEFAULT 0
);

CREATE TRIGGER trg_cs_categories_updated_at
  BEFORE UPDATE ON public.cs_categories
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 17. Table cs_mouvements (Opérations manuelles du livre de compte)
CREATE TABLE IF NOT EXISTS public.cs_mouvements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('entree', 'sortie')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  libelle TEXT NOT NULL,
  montant_fcfa BIGINT NOT NULL,
  categorie_id UUID REFERENCES public.cs_categories(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.cs_clients(id) ON DELETE SET NULL,
  dossier_id UUID REFERENCES public.cs_dossiers(id) ON DELETE SET NULL,
  moyen TEXT NOT NULL,
  reference TEXT,
  note TEXT,
  annule BOOLEAN NOT NULL DEFAULT FALSE,
  motif_annulation TEXT
);

CREATE INDEX IF NOT EXISTS idx_cs_mouvements_date ON public.cs_mouvements(date DESC);
CREATE INDEX IF NOT EXISTS idx_cs_mouvements_type ON public.cs_mouvements(type);
CREATE INDEX IF NOT EXISTS idx_cs_mouvements_annule ON public.cs_mouvements(annule);

CREATE TRIGGER trg_cs_mouvements_updated_at
  BEFORE UPDATE ON public.cs_mouvements
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 18. Table cs_historique
CREATE TABLE IF NOT EXISTS public.cs_historique (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entite TEXT NOT NULL,
  entite_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  auteur TEXT NOT NULL DEFAULT 'wendclasss@gmail.com',
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cs_historique_entite ON public.cs_historique(entite, entite_id);
CREATE INDEX IF NOT EXISTS idx_cs_historique_date ON public.cs_historique(date DESC);

CREATE TRIGGER trg_cs_historique_updated_at
  BEFORE UPDATE ON public.cs_historique
  FOR EACH ROW EXECUTE FUNCTION public.cs_handle_updated_at();

-- 19. Fonction SQL utilitaire pour écrire dans cs_historique
CREATE OR REPLACE FUNCTION public.cs_log_historique(
  p_entite TEXT,
  p_entite_id TEXT,
  p_action TEXT,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_auteur TEXT DEFAULT 'wendclasss@gmail.com'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.cs_historique (entite, entite_id, action, details, auteur, date)
  VALUES (p_entite, p_entite_id, p_action, p_details, p_auteur, NOW())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20. Vue cs_livre_de_compte (Aucune double écriture)
-- Fusionne les paiements validés (encaissements) et les mouvements manuels non annulés
CREATE OR REPLACE VIEW public.cs_livre_de_compte AS
SELECT
  p.id AS operation_id,
  'paiement' AS source,
  'entree' AS type,
  p.date_reception AS date,
  'Paiement ' || f.numero || ' (' || c.nom || ')' AS libelle,
  p.montant_fcfa AS montant_fcfa,
  p.moyen AS moyen,
  p.reference AS reference,
  c.id AS client_id,
  c.nom AS client_nom,
  d.id AS dossier_id,
  NULL::UUID AS categorie_id,
  'Facturation client' AS categorie_nom,
  p.annule AS annule,
  p.motif_annulation AS motif_annulation,
  p.created_at AS created_at
FROM public.cs_paiements p
JOIN public.cs_factures f ON p.facture_id = f.id
JOIN public.cs_dossiers d ON f.dossier_id = d.id
JOIN public.cs_clients c ON d.client_id = c.id

UNION ALL

SELECT
  m.id AS operation_id,
  'manuel' AS source,
  m.type AS type,
  m.date AS date,
  m.libelle AS libelle,
  m.montant_fcfa AS montant_fcfa,
  m.moyen AS moyen,
  m.reference AS reference,
  m.client_id AS client_id,
  cl.nom AS client_nom,
  m.dossier_id AS dossier_id,
  m.categorie_id AS categorie_id,
  cat.nom AS categorie_nom,
  m.annule AS annule,
  m.motif_annulation AS motif_annulation,
  m.created_at AS created_at
FROM public.cs_mouvements m
LEFT JOIN public.cs_clients cl ON m.client_id = cl.id
LEFT JOIN public.cs_categories cat ON m.categorie_id = cat.id;

-- 21. SÉCURITÉ : ROW LEVEL SECURITY (RLS) SUR TOUTES LES TABLES CS_
-- Strictement réservé au super admin (wendclasss@gmail.com)
ALTER TABLE public.cs_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_appels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_reglages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_devis_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_facture_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_projets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_etapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_liens_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_retours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_mouvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_historique ENABLE ROW LEVEL SECURITY;

-- Politiques Super Admin (wendclasss@gmail.com uniquement)
CREATE POLICY "Super admin only on cs_clients" ON public.cs_clients
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_dossiers" ON public.cs_dossiers
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_appels" ON public.cs_appels
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_services" ON public.cs_services
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_reglages" ON public.cs_reglages
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_devis" ON public.cs_devis
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_devis_lignes" ON public.cs_devis_lignes
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_factures" ON public.cs_factures
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_facture_lignes" ON public.cs_facture_lignes
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_paiements" ON public.cs_paiements
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_projets" ON public.cs_projets
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_etapes" ON public.cs_etapes
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_liens_clients" ON public.cs_liens_clients
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_retours" ON public.cs_retours
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_categories" ON public.cs_categories
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_mouvements" ON public.cs_mouvements
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');

CREATE POLICY "Super admin only on cs_historique" ON public.cs_historique
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'wendclasss@gmail.com');
