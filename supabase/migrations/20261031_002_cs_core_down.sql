-- ==============================================================================
-- ROLLBACK 002 : SUPPRESSION RÉVERSIBLE DU SOCLE CLASS S
-- ==============================================================================
-- Annule la migration 20261031_002_cs_core.sql sans toucher aux tables existantes.
-- ==============================================================================

DROP VIEW IF EXISTS public.cs_livre_de_compte CASCADE;

DROP FUNCTION IF EXISTS public.cs_log_historique(TEXT, TEXT, TEXT, JSONB, TEXT) CASCADE;

DROP TABLE IF EXISTS public.cs_historique CASCADE;
DROP TABLE IF EXISTS public.cs_mouvements CASCADE;
DROP TABLE IF EXISTS public.cs_categories CASCADE;
DROP TABLE IF EXISTS public.cs_retours CASCADE;
DROP TABLE IF EXISTS public.cs_liens_clients CASCADE;
DROP TABLE IF EXISTS public.cs_etapes CASCADE;
DROP TABLE IF EXISTS public.cs_projets CASCADE;
DROP TABLE IF EXISTS public.cs_paiements CASCADE;
DROP TABLE IF EXISTS public.cs_facture_lignes CASCADE;
DROP TABLE IF EXISTS public.cs_factures CASCADE;
DROP TABLE IF EXISTS public.cs_devis_lignes CASCADE;
DROP TABLE IF EXISTS public.cs_devis CASCADE;
DROP TABLE IF EXISTS public.cs_reglages CASCADE;
DROP TABLE IF EXISTS public.cs_services CASCADE;
DROP TABLE IF EXISTS public.cs_appels CASCADE;
DROP TABLE IF EXISTS public.cs_dossiers CASCADE;
DROP TABLE IF EXISTS public.cs_clients CASCADE;

DROP FUNCTION IF EXISTS public.cs_handle_updated_at() CASCADE;
