# Guide de Déploiement : Le Système Class S

Ce guide documente l'ensemble des procédures de configuration, d'infrastructure et de déploiement en production pour **Le Système** (`https://lesysteme.wendclass.com`), outil de gestion intégré du studio d'identité visuelle **Class S** (Scott Nana, Ouagadougou).

---

## 1. Variables d'Environnement

Toutes les variables doivent être configurées dans les paramètres d'environnement de la plateforme d'hébergement (Vercel, Netlify ou serveur VPS dédié).
**Aucune valeur secrète ne doit figurer dans le dépôt de code source.**

| Variable | Portée | Description |
| :--- | :--- | :--- |
| `APP_BASE_URL` | Publique / Build | URL racine de l'application : `https://lesysteme.wendclass.com` |
| `SITE_BASE_URL` | Publique / Build | URL racine du site vitrine : `https://wendclass.com` |
| `SUPER_ADMIN_EMAIL` | Serveur / RLS | Adresse e-mail unique du super administrateur : `wendclasss@gmail.com` |
| `GOOGLE_OAUTH_CLIENT_ID` | Publique / Serveur | Identifiant client Google Cloud Console pour l'authentification OAuth 2.0 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Serveur uniquement | Clé secrète Google Cloud Console pour l'authentification OAuth |
| `DB_URL` | Serveur / Client | URL d'accès à l'instance de base de données PostgreSQL partagée avec le site |
| `DB_PUBLIC_KEY` | Client (navigateur) | Clé anonyme publique pour requêtes sous contrôle strict RLS |
| `DB_SERVICE_KEY` | Serveur uniquement | Clé de service avec privilèges d'administration (migrations et triggers) |
| `CLIENT_LINK_SECRET` | Serveur uniquement | Secret cryptographique servant à la génération et validation des tokens clients 256 bits |
| `GOOGLE_DRIVE_*` | Serveur uniquement | Variables de service account pour l'accès aux images téléversées du questionnaire |
| `SITE_API_KEY` | Serveur uniquement | Clé d'API sécurisée pour l'écriture des témoignages validés sur `wendclass.com` |

---

## 2. Configuration DNS

Pour associer le domaine `lesysteme.wendclass.com` au service d'hébergement :

### Enregistrements DNS à déclarer chez le bureau d'enregistrement (Registrar) ou zone DNS Cloudflare :

| Type | Nom d'hôte | Cible / Valeur | TTL | Rôle |
| :--- | :--- | :--- | :--- | :--- |
| **CNAME** | `lesysteme` | `cname.vercel-dns.com` *(ou alias fourni par l'hébergeur)* | `3600` (1h) | Résolution du sous-domaine de production |
| **CAA** *(recommandé)* | `lesysteme` | `0 issue "letsencrypt.org"` | `3600` | Autorité de certification SSL autorisée |

> [!NOTE]
> En cas d'hébergement direct sur serveur VPS avec IP fixe (ex : Nginx / Caddy), remplacer le CNAME par un enregistrement **A** pointant vers l'adresse IPv4 publique du serveur.

### Certificat SSL / TLS :
- Activation du HTTPS strict avec redirection automatique 301 de HTTP vers HTTPS.
- Renouvellement automatique du certificat via Let's Encrypt (pris en charge par Vercel ou Certbot).

---

## 3. Configuration Google Cloud Console (OAuth 2.0)

Dans la console Google Cloud ([console.cloud.google.com](https://console.cloud.google.com)) sous le projet dédié à Class S :

1. **Écran de consentement OAuth** :
   - Type d'application : Externe (ou Interne si Google Workspace).
   - Nom de l'application : `Le Système • Class S`.
   - E-mail d'assistance utilisateur : `wendclasss@gmail.com`.
   - Domaines autorisés : `wendclass.com`.

2. **Identifiants OAuth 2.0 (Client Web)** :
   - **Origines JavaScript autorisées** :
     - `https://lesysteme.wendclass.com` (Production)
     - `http://localhost:5173` (Développement local Vite)
   - **URIs de redirection autorisés** :
     - `https://lesysteme.wendclass.com/auth/callback` (Production)
     - `http://localhost:5173/auth/callback` (Développement local Vite)

3. **Restriction d'accès applicatif** :
   - Seul le compte `wendclasss@gmail.com` est autorisé à accéder aux modules d'administration de Class S.
   - Tout autre compte Google recevra un écran d'accès restreint sobre et explicatif sans fuite de données.

---

## 4. Migrations SQL et Règles d'Accès

Exécuter les scripts de migration dans l'ordre chronologique sur la base PostgreSQL partagée :

### Checklist des tables et vues du Système :
- [x] `cs_clients` : Carnet d'adresses et métadonnées clients.
- [x] `cs_dossiers` : Dossiers prospects et parcours dans l'Armée des Ombres.
- [x] `cs_appels` : Comptes rendus d'appels de découverte et notes de cadrage.
- [x] `cs_services` : Catalogue de services Class S et prix de référence.
- [x] `cs_reglages` : Ligne unique des paramètres d'entreprise, numérotation et modèles.
- [x] `cs_devis` et `cs_devis_lignes` : Propositions commerciales chiffrées et devis.
- [x] `cs_factures` et `cs_facture_lignes` : Factures d'acompte, de solde et complètes.
- [x] `cs_paiements` : Règlements reçus, références de transaction et reçus.
- [x] `cs_projets` et `cs_etapes` : Suivi de production du Donjon.
- [x] `cs_liens_clients` : Jetons aléatoires 256 bits d'accès client.
- [x] `cs_retours` : Retours d'expérience et témoignages clients.
- [x] `cs_mouvements` et `cs_categories` : Opérations manuelles et catégories comptables.
- [x] `cs_historique` : Piste d'audit et journal d'événements.
- [x] `cs_livre_de_compte` : Vue SQL combinant les paiements validés et mouvements manuels.
- [x] `public.temoignages` : Table sur le schéma wendclass.com pour la publication des avis approuvés.

### Politiques de sécurité (Row Level Security - RLS) :
```sql
-- Exemple de politique stricte d'accès Super Admin
ALTER TABLE cs_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin acces exclusif" ON cs_clients
  FOR ALL
  USING (auth.jwt()->>'email' = 'wendclasss@gmail.com')
  WITH CHECK (auth.jwt()->>'email' = 'wendclasss@gmail.com');
```

### Fonctions RPC sécurisées :
- `get_client_portal_data(p_token)` : Lecture seule filtrée pour l'espace client `/c/[token]` (expose uniquement devis validé, facture en cours, étapes publiques du projet et retour ; ne filtre aucune note interne).
- `submit_client_feedback(p_token, p_payload)` : Dépôt sécurisé de l'avis client après livraison.

---

## 5. Checklist de Mise en Production (Pre-Flight Checklist)

Avant d'ouvrir officiellement l'accès en production :

1. **Variables d'environnement** : Vérifier que toutes les 11 variables sont renseignées dans la console de déploiement et qu'aucune clé de test ne subsiste.
2. **Résolution DNS et HTTPS** : Vérifier que `https://lesysteme.wendclass.com` répond en HTTPS sans avertissement de sécurité.
3. **Référencement et confidentialité** : Confirmer la présence des balises `<meta name="robots" content="noindex, nofollow" />` et `Referrer-Policy: no-referrer` sur toutes les pages.
4. **Google OAuth** : Tester la connexion avec le compte `wendclasss@gmail.com` et vérifier que la session est persistée.
5. **Cloisonnement de sécurité** : Tester la connexion avec une autre adresse Google (personnelle) et vérifier que l'écran d'accès refusé s'affiche sans accès aux données Class S.
6. **Synchronisation du questionnaire** : Cliquer sur « Actualiser » dans l'Armée des Ombres et vérifier la synchronisation sans doublon des demandes reçues depuis `wendclass.com`.
7. **Parcours Devis et Lien Client** :
   - Créer un devis depuis un dossier prospect.
   - Activer l'accès client et copier le lien `/c/[token]`.
   - Ouvrir le lien dans une fenêtre de navigation privée.
   - Vérifier le rendu de l'en-tête, des montants en FCFA, et tester l'acceptation électronique.
8. **Facturation et Livre de compte** :
   - Émettre une facture d'acompte depuis le devis accepté.
   - Valider un paiement reçu de 50 %.
   - Vérifier l'apparition immédiate de l'encaissement dans le Livre de compte (`/portail/livre`) sans double écriture.
9. **Donjon et Étape de production** :
   - Vérifier le déverrouillage automatique du projet dans le Donjon.
   - Avancer une étape et vérifier la mise à jour visible sur l'espace client.
10. **Avis et Publication** :
    - Passer le projet au statut `Livré`.
    - Soumettre un avis et témoignage depuis l'espace client.
    - Vérifier l'apparition dans `/ombres/retours`.
    - Corriger le texte, valider et publier sur `wendclass.com`.
    - Vérifier que la dépublication fonctionne instantanément.
