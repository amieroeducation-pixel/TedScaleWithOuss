# Tests E2E - Configuration

## Prérequis

Les tests E2E Playwright nécessitent des credentials de test Supabase configurés.

### Configuration des variables d'environnement

Créer un fichier `.env.local` à la racine du projet (si pas déjà existant) et ajouter:

```bash
# Test credentials pour E2E Playwright
TEST_EMAIL=votre-email-test@example.com
TEST_PASSWORD=votre-mot-de-passe-test
```

### Créer un utilisateur de test

1. Se connecter à Supabase Dashboard: https://vqtzcxvmzznbepyvlcut.supabase.co
2. Aller dans Authentication > Users
3. Créer un nouvel utilisateur avec:
   - Email: `test@example.com` (ou autre)
   - Password: `password123` (ou autre, minimum 6 caractères)
4. Confirmer l'email si nécessaire
5. Copier ces credentials dans `.env.local`

## Exécution des tests

### Tous les tests

```bash
npx playwright test
```

### Tests spécifiques

```bash
# Story s01-menu-dynamique uniquement
npx playwright test e2e/s01-menu-dynamique.spec.ts

# Mode UI interactif
npx playwright test --ui

# Mode debug
npx playwright test --debug
```

### Tests existants

- `e2e/phase0-1-test.spec.ts` - Tests API settings et tasks (Phase 0+1)
- `e2e/s01-menu-dynamique.spec.ts` - Tests UI menu sections visibility (Story s01)
- `e2e/auth.spec.ts` - Tests authentification
- `e2e/nurturing.spec.ts` - Tests module nurturing

## Structure des tests s01-menu-dynamique

### Test 1: Flow complet toggle ON/OFF
- Naviguer Settings > onglet Menu
- Toggle OFF section "Clients"
- Vérifier disparition dans sidebar
- Toggle ON
- Vérifier réapparition

### Test 2: Edge case toutes sections masquées
- Masquer les 5 sections
- Vérifier menu vide
- Restaurer toutes les sections

### Test 3: Persistence après reload
- Toggle OFF section "Outils"
- Recharger page
- Vérifier que "Outils" reste OFF
- Restaurer état initial

## Troubleshooting

### Port 3000 déjà utilisé

Si le port 3000 est occupé:

```bash
# Windows
netstat -ano | findstr :3000
taskkill //PID <PID> //F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Timeout au login

- Vérifier que le serveur dev tourne
- Vérifier les credentials dans `.env.local`
- Vérifier que l'utilisateur existe dans Supabase Auth

### Tests qui échouent

1. Arrêter tous les serveurs dev manuels
2. Laisser Playwright gérer le démarrage du serveur (configuré dans `playwright.config.ts`)
3. Vérifier que les migrations DB sont appliquées
4. Vérifier que la colonne `menu_sections_visible` existe dans `user_settings`

## Notes

- Les tests utilisent `reuseExistingServer: true` pour ne pas redémarrer le serveur à chaque run
- Timeout par défaut: 10s pour navigation, 5s pour requêtes API
- Cleanup automatique: chaque test restaure l'état initial des settings
