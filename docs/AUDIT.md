# Rapport d’Audit Technique : Le Système & Site wendclass.com

Date : 31 octobre 2026  
Projet audité : **Le Système** (Class S) & **Site Web Officiel** (wendclass.com)  
Statut : Phase 1/5 - Étape B (Audit en lecture seule)

---

## 1. Le projet Le Système

- **Emplacement local** : `C:\Users\HP\Documents\000_Le Système_Class S\Site Web`
- **Framework** : React 18.3.1 (Single Page Application Vite 6.2.0) avec TypeScript 5.7.3.
- **Styling & UI** : Tailwind CSS 3.4.17, PostCSS, Autoprefixer, Lucide React (1.16.0), Canvas Confetti, Recharts (2.15.1), clsx, tailwind-merge.
- **Gestionnaire de paquets** : npm (`package-lock.json` présent).
- **Mode de déploiement** : Vercel (`vercel.json` configuré pour la réécriture SPA `/*` vers `/index.html`).
- **Structure des dossiers** :
  - `src/` :
    - `components/` :
      - `activities/` : gestion des activités et des rangs (ActivityDetailModal, ActivityFormModal, ActivityList)
      - `auth/` : vues d’authentification et d’onboarding (LoginView, OnboardingView)
      - `common/` : composants visuels génériques (GlassCard, HunterBadge, Modal, StatCounter, SyncIndicator, EmptyState)
      - `daily/` : to-do Quête Quotidienne / The One Thing (DailyQuestView, TaskFormModal)
      - `dashboard/` : vue Fenêtre de Statut (ActivityRankCards, HeroProgress, OneThingPriority, ProfitFirstRings, UpcomingExpenses)
      - `forecast/` : graphique de projections financières (ForecastChart)
      - `layout/` : Header, MobileNav, Sidebar (avec badge « Class S · Rang S »)
      - `recurring/` : gestion des charges récurrentes (RecurringCard, RecurringFormModal, RecurringKPIs, RecurringTimeline)
      - `settings/` : configuration utilisateur et Profit First (SettingsView)
      - `showcase/` : vitrines « Bientôt disponible » pour Portail, Armée des Ombres, Donjon, Grimoire (ShowcasePage)
      - `transactions/` : saisie et historique des flux (TransactionFormModal, TransactionList)
    - `context/` : gestion des états globaux (AuthContext.tsx, SystemDataContext.tsx)
    - `lib/` : moteurs de calculs, constantes, devises et client Supabase (calculations.ts, constants.ts, currency.ts, supabase.ts, utils.ts)
    - `styles/` : styles globaux (globals.css)
    - `types/` : interfaces et types TypeScript (index.ts)
    - `App.tsx`, `main.tsx` : point d’entrée de l’application
  - `public/` : favicons, webmanifest et icônes Class S (`public/brand/` initialisé avec les actifs officiels)
- **Variables d’environnement utilisées** :
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_CURRENCY_API_URL` (optionnel)

---

## 2. La base de données de Le Système

- **Fournisseur** : Supabase PostgreSQL (Projet ID : `znhqmvxffhqrtikeeirg`, URL : `https://znhqmvxffhqrtikeeirg.supabase.co`).
- **Tables existantes** :
  1. `user_objectives` :
     - Colonnes : `id` (TEXT PK), `uid` (TEXT NOT NULL UNIQUE), `montant_cible` (NUMERIC NOT NULL), `date_cible` (DATE NOT NULL), `date_creation` (TIMESTAMPTZ).
  2. `clients` :
     - Colonnes : `id` (TEXT PK), `uid` (TEXT NOT NULL), `nom` (TEXT NOT NULL), `entreprise` (TEXT), `email` (TEXT), `telephone` (TEXT), `activite_ids` (TEXT[]), `statut` (TEXT: 'prospect' | 'actif' | 'dormant'), `date_creation` (TIMESTAMPTZ), `note` (TEXT).
  3. `activities` :
     - Colonnes : `id` (TEXT PK), `uid` (TEXT NOT NULL), `nom` (TEXT NOT NULL), `couleur` (TEXT NOT NULL), `icone` (TEXT NOT NULL), `date_creation` (TIMESTAMPTZ), `statut` (TEXT: 'active' | 'pause' | 'archivee'), `rang_actuel` (TEXT: 'E' à 'S').
  4. `transactions` :
     - Colonnes : `id` (TEXT PK), `uid` (TEXT NOT NULL), `date` (DATE NOT NULL), `montant_original` (NUMERIC NOT NULL), `devise_origine` (TEXT NOT NULL), `montant_usd` (NUMERIC NOT NULL), `type` (TEXT: 'revenu' | 'depense'), `activite_id` (TEXT NOT NULL), `client_id` (TEXT), `categorie` (TEXT NOT NULL), `note` (TEXT).
  5. `recurring_expenses` :
     - Colonnes : `id` (TEXT PK), `uid` (TEXT NOT NULL), `nom` (TEXT NOT NULL), `nature` (TEXT NOT NULL), `activite_id` (TEXT), `montant_original` (NUMERIC NOT NULL), `devise_origine` (TEXT NOT NULL), `montant_usd` (NUMERIC NOT NULL), `frequence` (TEXT: 'mensuelle' | 'trimestrielle' | 'annuelle'), `date_premier_paiement` (DATE NOT NULL), `date_fin` (DATE), `statut` (TEXT DEFAULT 'actif').
  6. `daily_tasks` :
     - Colonnes : `id` (TEXT PK), `uid` (TEXT NOT NULL), `titre` (TEXT NOT NULL), `activite_id` (TEXT), `date` (DATE NOT NULL), `est_la_priorite` (BOOLEAN DEFAULT FALSE), `statut` (TEXT: 'a_faire' | 'en_cours' | 'terminee'), `note` (TEXT).
  7. `user_settings` :
     - Colonnes : `uid` (TEXT PRIMARY KEY), `profit_first` (JSONB), `xof_to_usd_rate` (NUMERIC DEFAULT 0.00165), `rate_updated_at` (TIMESTAMPTZ), `currency_api_url` (TEXT), `opex_alert_threshold` (NUMERIC DEFAULT 30), `showcase_interests` (TEXT[] DEFAULT '{}').
- **Règles d’accès actuelles (Row Level Security)** :
  - RLS activé sur l’ensemble des 7 tables.
  - Politiques strictes par utilisateur : chaque compte accède uniquement aux lignes dont `uid = auth.uid()::text`.
  - Cache miroir local dans `localStorage` (`class_s_data_*` et `class_s_user_session`) permettant le fonctionnement déconnecté.

---

## 3. L’authentification existante dans Le Système

- **Méthode** :
  - Google OAuth (`client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`).
  - Email et mot de passe (`signInWithPassword`, `signUp`).
  - Mode démo local sans clé cloud (`demo_hunter_*`).
- **Qui peut se connecter** : Tout compte Google ou utilisateur email peut actuellement créer une session. Chaque utilisateur est cloisonné par son identifiant unique (`uid`).
- **Détermination du super admin** : Aucune règle de super admin n’était implémentée jusqu’ici dans Le Système. L’application fonctionnait en mode multi-locataire indépendant. Le cahier des charges exige que seul `wendclasss@gmail.com` puisse voir et manipuler les modules spécifiques de Class S (Armée des Ombres, Grimoire, Donjon, Portail Class S, Réglages Class S).

---

## 4. Le module comptabilité (Fenêtre de Statut)

- **Tables et champs** :
  - Les flux financiers sont gérés par la table `transactions` : type (`revenu` ou `depense`), montant d’origine, devise d’origine, conversion en USD (`montant_usd`), clé étrangère optionnelle `client_id`, clé d’activité `activite_id`, catégorie de dépense/revenu.
  - La table `clients` fournit le nom, l’entreprise et les coordonnées rattachées à la transaction.
  - La table `user_settings` gère les pourcentages Profit First (Bénéfice 5%, Rémunération dirigeant 50%, Réserves fiscales 15%, Dépenses d’exploitation 30%).
- **Activités** :
  - Les activités sont créées dynamiquement par l’utilisateur dans la table `activities` (par exemple : Brand designer, SaaS, E-commerce). Scott y définit ses pôles.
- **Devise principale et conversion** :
  - La devise de calcul et d’affichage de référence de Fenêtre de Statut est l’**USD** (`montant_usd`), avec saisie possible en XOF (Franc CFA), EUR, GBP, CAD.
  - Le taux de change par défaut est de 1 USD = 606 FCFA (`xof_to_usd_rate = 0.00165`).
  - *Rappel de la règle S2* : Le livre de compte Class S et tous les modules Class S fonctionnent exclusivement en **FCFA** (entiers sans décimales). L’intégration de Class S dans Fenêtre de Statut devra convertir sans altérer le moteur USD existant.

---

## 5. Le site wendclass.com (Site Web Officiel)

- **Emplacement local** : `C:\Users\HP\Documents\Class S - Scott Nana\Site Web Officiel`
- **Framework** : React 18 + Vite 6.2.0 + TypeScript + Tailwind CSS avec point d’entrée SSR pour Vercel (`api/ssr.js`).
- **Base de données du site** : Supabase PostgreSQL (Projet ID : `mtinydrkpxffrlsuwpzh`, URL : `https://mtinydrkpxffrlsuwpzh.supabase.co`).
  - **Constat déterminant** : La base de données du site est **différente** de la base de données de Le Système (`znhqmvxffhqrtikeeirg`).
- **Table des réponses au questionnaire (`public.demandes`)** :
  - `id` : UUID PRIMARY KEY DEFAULT `uuid_generate_v4()`
  - `created_at` : TIMESTAMPTZ DEFAULT `NOW()`
  - `project_type` : TEXT NOT NULL ('logo', 'social', 'print', 'event', 'website', 'unknown')
  - `goals` : TEXT[] NOT NULL DEFAULT '{}'
  - `goals_other` : TEXT
  - `branch_data` : JSONB NOT NULL DEFAULT '{}'::jsonb
    - Pour 'logo' : `hasLogo` ('yes_remake' | 'no_start_from_scratch')
    - Pour 'social' : `socialFrequency` ('daily' | 'weekly' | 'campaign')
    - Pour 'print' : `printItems` (tableau de chaînes), `printOtherText`
    - Pour 'event' : `eventTiming`, `eventUnknown` (booléen), `eventPrintItems`, `eventDigitalItems`, `eventOtherText`
    - Pour 'website' : `websiteType` ('onepage' | 'multipage' | 'redesign')
    - Pour 'unknown' : `unknownContext`
  - `full_name` : TEXT NOT NULL (2 à 100 caractères)
  - `company_name` : TEXT NOT NULL (1 à 120 caractères)
  - `whatsapp_number` : TEXT NOT NULL (6 à 30 caractères)
  - `status` : TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'en_cours', 'traite', 'archive'))
  - `internal_notes` : TEXT DEFAULT ''
- **Stockage des images** :
  - Le site wendclass.com gère ses images publiques via Supabase Storage (bucket `project-images` et bucket `blog-images`) ainsi qu’en local WebP optimisé.
  - Le formulaire actuel du site (`ContactForm.tsx` via `/api/contact`) ne fait pas d’upload direct de fichiers lourds : il recueille les orientations textuelles et les choix du client, puis invite à échanger sur WhatsApp. Les variables Google Drive (`GOOGLE_DRIVE_*`) prévues dans le socle serviront à l’archivage des éléments de conception ou aux images partagées par les clients.
- **Table des témoignages (`public.temoignages`)** :
  - Colonnes : `id` (UUID PK), `author_name` (TEXT), `author_role_company` (TEXT), `content` (TEXT), `rating` (INT de 1 à 5), `projet_id` (UUID FK vers `projets`), `category` (TEXT), `impact_result` (TEXT), `status` (TEXT: 'publie' | 'brouillon'), `display_order` (INT), `created_at` (TIMESTAMPTZ).
  - Seuls les témoignages avec `status = 'publie'` sont affichés publiquement sur wendclass.com.
- **Authentification de la page admin `/classs`** :
  - Double verrou actif :
    1. Premier facteur : Connexion Google OAuth restreinte à `wendclasss@gmail.com`.
    2. Deuxième facteur : Mot de passe applicatif Class S (haché SHA-256 stocké dans la table `admin_config`, vérifié côté navigateur avec verrouillage de 5 tentatives maximum).

---

## 6. Analyse des risques

1. **Bases de données disjointes** : Le site wendclass.com réside sur l’instance Supabase `mtinydrkpxffrlsuwpzh`, alors que Le Système est déployé sur l’instance `znhqmvxffhqrtikeeirg`. Une tentative de lecture directe sans passerelle échouerait.
2. **Espace de travail Antigravity** : L’espace actuellement ouvert dans Antigravity est le site web (`Class S - Scott Nana\Site Web Officiel`), alors que le code source à enrichir pour Le Système réside dans `000_Le Système_Class S\Site Web`.
3. **Multi-utilisateurs & isolation Class S** : Le Système permettait l’inscription libre avec données isolées par `uid`. L’introduction des tables `cs_*` et de l’administration de Scott Nana doit être strictement verrouillée pour `wendclasss@gmail.com` sans perturber le fonctionnement de Fenêtre de Statut ou de Quête Quotidienne pour les autres profils.
4. **Cohérence des devises (USD vs FCFA)** : Fenêtre de Statut utilise l’USD en pivot interne. Le livre de compte Class S utilise le FCFA strict sans décimales. La passerelle doit assurer la conversion au taux configuré (ex. 606 FCFA/USD) sans perte ni décalage d’arrondi.

---

## 7. Décision technique : Option A vs Option B

Conformément à la consigne d’exécution du Prompt 1/5 :

> **Règle de décision après l'audit**
> - **Option A (préférée)** : si les deux projets utilisent déjà la même base de données, Le Système s'y connecte directement. Nouvelles tables préfixées `cs_`, aucune modification des tables du site. Continue sans attendre.
> - **Option B** : si les bases sont différentes, arrête-toi, présente A et B avec ta recommandation, et attends mon choix. B = lecture des réponses du questionnaire via une route API sécurisée du site (variable `SITE_API_KEY`), copie en lecture seule dans Le Système, jamais d'écriture dans la base du site, sauf la publication d'un témoignage validé, qui passe par cette même route.

### Constat
Les deux projets utilisent **deux bases de données Supabase distinctes** :
- wendclass.com : `https://mtinydrkpxffrlsuwpzh.supabase.co`
- Le Système : `https://znhqmvxffhqrtikeeirg.supabase.co`

### Présentation des options

- **Option A (Unification sur une base commune)** :
  - Consiste à pointer Le Système vers la base du site (`mtinydrkpxffrlsuwpzh`) ou à migrer les tables existantes de Le Système dans la base du site.
  - *Avantages* : Connexion directe par clés étrangères SQL entre `demandes` et `cs_dossiers`, requêtes directes en temps réel, aucune API intermédiaire à maintenir.
  - *Inconvénients* : Nécessite de migrer les données et utilisateurs existants de Le Système (`znhqmvxffhqrtikeeirg`), et de reconfigurer les identifiants Supabase sur le déploiement Vercel de Le Système.

- **Option B (Architecture distribuée via API sécurisée avec `SITE_API_KEY`)** :
  - Consiste à conserver les deux bases distinctes telles quelles.
  - Le site wendclass.com expose une route API sécurisée (par exemple `/api/systeme-bridge`) protégée par un en-tête `x-api-key: SITE_API_KEY`.
  - Cette route permet à Le Système de :
    1. Lire les nouvelles réponses du questionnaire (`demandes`) en lecture seule pour créer les dossiers dans Le Système.
    2. Publier un témoignage validé dans la table `temoignages` de wendclass.com uniquement après validation explicite par Scott.
  - *Avantages* : Cloisonnement strict et étanche. Aucune modification de l’infrastructure existante de Le Système ni de wendclass.com. Risque zéro de perturber la production du site ou les autres utilisateurs de Le Système.
  - *Inconvénients* : Nécessite la mise en place de la route serveur sur wendclass.com et la gestion de la variable secrète `SITE_API_KEY`.

### Recommandation technique
L’**Option B** est recommandée car elle respecte rigoureusement le principe de moindre privilège : elle évite toute manipulation lourde de migration de base de données en production, garantit que Le Système n’écrit jamais directement dans la base du site (sauf pour la publication contrôlée d’un témoignage validé), et préserve intacts les deux projets déjà déployés.
