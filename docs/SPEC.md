# SOCLE COMMUN (docs/SPEC.md)

## S1. Contexte et objectif

Class S est le studio d'identité visuelle de Scott Nana, basé à Ouagadougou (Burkina Faso), pour entrepreneurs et startups. **Le Système** est son outil de gestion : il existe déjà (Fenêtre de Statut pour la comptabilité et le Profit First, Quête Quotidienne pour la to-do, plus des vitrines « Bientôt disponible » : Portail, Armée des Ombres, Donjon, Grimoire).

**Objectif** : transformer Le Système en outil complet qui couvre le parcours d'un client, de sa réponse au questionnaire jusqu'à son témoignage, avec un livre de compte exportable. **Résultat mesurable** : Scott parcourt tout le cycle sans jamais ressaisir une information déjà saisie.

**Parcours de bout en bout**
1. Une réponse au questionnaire arrive dans la base existante (page admin du site).
2. Scott l'examine entièrement et décide de poursuivre ou de décliner.
3. Appel de découverte : planifié puis réalisé. Scott consigne trois blocs : éléments de conception, services nécessaires, modalités de collaboration.
4. Devis construit depuis une base adaptable (catalogue de services et modalités de base), envoyé par lien direct, via WhatsApp.
5. Le client consulte et accepte le devis depuis son lien, sans compte.
6. Facture d'acompte. Scott valide lui-même la réception du paiement : le projet s'ouvre.
7. Le client suit l'avancement par étapes nommées et consulte ses factures.
8. Livraison finale, facture de solde, paiement validé par Scott.
9. Le client laisse un feedback privé et un témoignage. Scott valide avant toute publication sur le site.
10. Chaque paiement validé alimente le livre de compte automatiquement.

**Hors de l'outil** : l'envoi des fichiers et des informations du projet se fait sur WhatsApp. Le filigrane des visuels est géré en dehors. Aucune intégration de paiement : Scott confirme chaque paiement à la main (Mobile Money, virement, espèces).

## S2. Règles transversales

- **Langue** : interface en français. **Devise** : FCFA, montants entiers sans décimales, espace fine insécable comme séparateur de milliers (200 000 FCFA). Dates en jj/mm/aaaa, fuseau Africa/Ouagadougou.
- **Plume** : aucun tiret long (—), aucun demi-cadratin (–) dans les textes affichés, et pas de tiret utilisé comme séparateur de phrase. Apostrophe typographique ’ partout. Tous les textes sont centralisés dans un fichier de contenus, sans double échappement.
- **Honnêteté** : aucun logo généré (utiliser le fichier de `/public/brand/`, sinon un emplacement vide nommé). Aucune statistique, aucun témoignage, aucun client fictif. Les données Class S démarrent vides, sauf le catalogue de départ (Annexe A).
- **Mobile first** : les pages client s'ouvrent depuis WhatsApp, sur téléphone, parfois avec une connexion lente. Pages légères, polices en `display: swap` avec secours (Georgia, system-ui), aucune bibliothèque d'animation lourde.
- **Retours visibles** : chaque action affiche un état de chargement, de succès ou d'erreur, avec des messages lisibles en français. Brouillons enregistrés automatiquement (délai 800 ms), avertissement avant de quitter une saisie non enregistrée.
- **Hydratation** : tout contenu dynamique, aléatoire, daté ou dépendant du navigateur (`window`, dates formatées) se rend côté client après le montage.
- **Layout** : flex ou grid, zone principale avec `min-w-0`, menu latéral repliable. Tester à 360, 768, 1024 et 1440 px. Aucun texte coupé.
- **Accessibilité** : focus visible, cibles tactiles d'au moins 44 px, navigation clavier, contraste texte d'au moins 4,5:1, `prefers-reduced-motion` respecté.
- **Données** : tout vit en base, liée à son propriétaire. Le stockage local ne sert que de cache. Test : se connecter depuis un autre appareil et tout retrouver.
- **Traçabilité** : chaque changement important (statut, paiement, acceptation, annulation) écrit une ligne dans `cs_historique`.

## S3. Design system (prolongement du site Class S, v2.0)

Deux thèmes : **nocturne** pour tout l'espace d'administration, **clair** pour toutes les pages client.

```css
:root {
  /* Marque */
  --violet-imperial: #6600CC;  --or-champagne: #C9A070;  --amethyste: #A87FE8;
  --ivoire-violet: #F8F5FF;    --ardoise: #3A2F5C;       --onyx: #0D0A18;

  /* Thème nocturne (administration) */
  --bg: #0D0A18;
  --surface: rgba(58, 47, 92, 0.45);
  --surface-raised: rgba(58, 47, 92, 0.70);
  --text: #F8F5FF;
  --text-muted: rgba(248, 245, 255, 0.68);
  --border: rgba(168, 127, 232, 0.15);
  --link: #A87FE8;

  /* États (non définis dans le design system v2.0, à valider par Scott) */
  --success: #2FA77A;  --warning: #C9A070;  --error: #E5484D;  --info: #A87FE8;

  /* Typographie */
  --font-display: "Cormorant Garamond", Georgia, serif;
  --font-body: "Jost", system-ui, sans-serif;

  /* Espacements (base 4 px) */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px; --space-8: 32px; --space-12: 48px;

  /* Formes */
  --radius-pill: 9999px; --radius-lg: 24px; --radius-md: 16px; --radius-sm: 12px;
  --shadow-soft: 0 10px 30px -10px rgba(102, 0, 204, 0.08);
  --shadow-soft-lg: 0 20px 40px -15px rgba(102, 0, 204, 0.12);
  --shadow-glow: 0 0 25px rgba(168, 127, 232, 0.35);

  /* Mouvement */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 150ms; --dur-base: 300ms; --dur-slow: 600ms;
}
/* Thème clair (pages client) */
[data-theme="light"] {
  --bg: #F8F5FF; --surface: #FFFFFF; --surface-raised: #FFFFFF;
  --text: #0D0A18; --text-muted: rgba(13, 10, 24, 0.65);
  --border: rgba(102, 0, 204, 0.08); --link: #6600CC;
}
@media (prefers-reduced-motion: reduce) { :root { --dur-fast: 0.01ms; --dur-base: 0.01ms; --dur-slow: 0.01ms; } }
```

**Typographie**
- Cormorant Garamond (letter-spacing -0.015em) : **uniquement** H1 `clamp(2rem, 4vw, 3.25rem)` et H2 `clamp(1.75rem, 3.5vw, 2.75rem)`.
- Jost : tout le reste. H3 20 px semi-bold, corps 16 px avec interlignage 1,75, notes et badges 12 à 14 px.
- Tous les montants : `font-variant-numeric: tabular-nums`, alignés à droite dans les tableaux.

**Formes et composants**
- Boutons en pilule, transition 300 ms, léger soulèvement au survol (2 px). Primaire : fond violet impérial, texte ivoire. Champagne : fond or champagne, texte onyx. Secondaire : contour violet.
- Cartes en `--radius-lg`, conteneurs moyens en `--radius-md`, champs en `--radius-sm`.
- Badges de statut en pilule, majuscules, 12 px, espacement des lettres 0,05em.
- Composants à fournir : Button, Badge, Input, Select, Textarea, Card, Table (version carte sur mobile), StatutPill, Toast, Modal, Accordion, Skeleton, EmptyState.

**Profondeur (valeurs chiffrées, pour éviter un rendu plat)**
- Thème nocturne : fond onyx avec un halo améthyste en haut de page (opacité maximale 0,12), cartes en verre dépoli (`backdrop-filter: blur(12px)`, bordure `--border` de 1 px), élévation par éclaircissement de la surface.
- Thème clair : cartes blanches avec `--shadow-soft`, `--shadow-soft-lg` au survol.
- **Plafond des effets** : un seul effet décoratif animé à l'écran, opacité maximale 0,12, aucun nouveau reflet diagonal. Ne pas modifier le reflet existant de Fenêtre de Statut, sauf s'il dépasse 0,12 d'opacité.
- Révélation au scroll : translation de 12 px et fondu, 600 ms, `--ease-out`, une fois par section.

## S4. Architecture et navigation

Les noms des modules sont conservés. Barre latérale (repliable, menu bas ou tiroir sur mobile) :

| Module | Rôle | Routes |
|---|---|---|
| Fenêtre de Statut | Compta et Profit First (existant, ne pas modifier) | existantes |
| Quête Quotidienne | To-do The One Thing (existant, ne pas modifier) | existantes |
| Armée des Ombres | Dossiers clients, examen, appels, retours | `/ombres`, `/ombres/[id]`, `/ombres/retours` |
| Grimoire | Catalogue de services | `/grimoire` |
| Portail | Devis, factures, paiements, livre de compte | `/portail/devis`, `/portail/factures`, `/portail/paiements`, `/portail/livre` |
| Donjon | Projets et étapes | `/donjon`, `/donjon/[id]` |
| Réglages Class S | Émetteur, modèle de base, messages | `/reglages/class-s` |
| Pages client (publiques) | Lien direct sans compte | `/c/[token]` |

Le badge « Class S · Rang S » existant de la barre latérale est conservé.

## S5. Modèle de données (nouvelles tables, préfixe `cs_`)

Ne jamais supprimer ni renommer une table existante. Clés étrangères explicites. Toutes les tables ont `id`, `created_at`, `updated_at`.

- `cs_clients` : nom, entreprise, whatsapp, email, lien_social, notes_internes.
- `cs_dossiers` : client_id, soumission_id (référence **unique** vers la réponse du questionnaire), statut, decision_examen (poursuivre | decliner), motif_interne, budget_annonce (tranche copiée de la réponse), acces_client_actif (booléen).
- `cs_appels` : dossier_id, date_heure, statut (planifié | réalisé | annulé), elements_conception, services_necessaires, modalites_collaboration, notes_libres.
- `cs_services` : categorie, nom, description_client, prix_base_fcfa, unite, actif, ordre.
- `cs_reglages` (ligne unique) : champs émetteur (nom, whatsapp, email, ville, ifu, rccm), numérotation, modèle de base des modalités, étapes de base, modèles de messages WhatsApp.
- `cs_devis` : numero, dossier_id, version, statut (brouillon | pret | envoye | accepte | refuse | expire | remplace), date_emission, date_validite, conception (JSON), modalites (JSON), ecarts_base (JSON calculé), remise_fcfa, remise_libelle, total_fcfa, accepte_le, accepte_par_nom, accepte_ip.
- `cs_devis_lignes` : devis_id, service_id (facultatif), libelle, description, quantite, prix_unitaire_fcfa, ordre.
- `cs_factures` : numero, dossier_id, devis_id, type (acompte | solde | complete), statut (brouillon | envoyee | partielle | payee | annulee), date_emission, echeance, total_fcfa. `cs_facture_lignes` sur le même modèle que les lignes de devis.
- `cs_paiements` : facture_id, montant_fcfa, date_reception, moyen, reference, numero_recu, valide_le, annule (booléen), motif_annulation.
- `cs_projets` : dossier_id, titre, statut (a_ouvrir | ouvert | livre | clos), ouvert_le, derogation_acompte (booléen), motif_derogation, livre_le.
- `cs_etapes` : projet_id, nom, ordre, statut (a_venir | en_cours | terminee), message_client (280 caractères maximum), terminee_le.
- `cs_liens_clients` : dossier_id, token, actif, expire_le, derniere_ouverture.
- `cs_retours` : dossier_id, note_satisfaction (1 à 5), commentaire_prive, temoignage_original, temoignage_edite, nom_affiche, fonction_entreprise, photo_url, accord_publication (booléen), statut (a_valider | valide | publie | refuse), publie_le.
- `cs_mouvements` : opérations manuelles du livre de compte : type (entree | sortie), date, libelle, montant_fcfa, categorie_id, client_id, dossier_id, moyen, reference, note, annule, motif_annulation.
- `cs_categories` : nom, type, ordre.
- `cs_historique` : entite, entite_id, action, details (JSON), auteur, date.

**Livre de compte** : vue `cs_livre_de_compte` = paiements validés non annulés (encaissements) + `cs_mouvements` non annulés. **Aucune double écriture.**

## S6. Sécurité

- Toutes les tables `cs_` sont protégées côté base (règles d'accès par ligne ou équivalent) : lecture et écriture réservées au super admin. Le contrôle n'est jamais fait seulement dans l'interface.
- **Super admin** : connexion Google restreinte à `wendclasss@gmail.com`. Les modules Class S (Armée des Ombres, Grimoire, Portail, Donjon, Réglages Class S) lui sont réservés. Ne pas casser l'authentification existante des autres usages de Fenêtre de Statut et Quête Quotidienne : les données Class S ne sont jamais visibles d'un autre utilisateur.
- **Pages client** `/c/[token]` : le jeton est aléatoire (256 bits, encodage URL), non devinable, unique par dossier, révocable, avec expiration facultative. La page lit les données via une fonction serveur qui vérifie le jeton et ne renvoie que les champs autorisés. Elle n'expose **jamais** : notes d'appel, notes internes, budget annoncé, écarts avec la base, catalogue, autres dossiers, livre de compte, historique.
- Limitation de débit sur la route du jeton. En-têtes `noindex`, `Referrer-Policy: no-referrer`. Aucun cookie de suivi ni outil d'analyse sur les pages client (pas de bandeau nécessaire).
- Preuve d'acceptation d'un devis : date et heure, nom saisi, adresse IP.

## S7. Variables d'environnement (noms uniquement, jamais de valeurs)

Adapter aux noms déjà utilisés par les projets (découverts à l'audit).

```
APP_BASE_URL=https://lesysteme.wendclass.com
SITE_BASE_URL=https://wendclass.com
SUPER_ADMIN_EMAIL=wendclasss@gmail.com
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
DB_URL=                # base de données partagée avec le site
DB_PUBLIC_KEY=         # clé publique, côté navigateur
DB_SERVICE_KEY=        # clé serveur, jamais exposée au navigateur
CLIENT_LINK_SECRET=    # secret de signature des liens clients
GOOGLE_DRIVE_*         # variables existantes du stockage des images du questionnaire
SITE_API_KEY=          # uniquement si l'option B de l'audit est retenue
```

URL de redirection d'authentification à déclarer : `https://lesysteme.wendclass.com/auth/callback` (production) et l'URL locale de développement correspondante.
