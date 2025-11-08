# StudyFlash Setup Guide

## ⚠️ Configuration OBLIGATOIRE

### 1. Configurer OPENAI_API_KEY (CRITIQUE)

La fonction edge **REQUIERT** une clé API OpenAI côté serveur. Sans elle, la génération retournera `{"cards":[]}`.

**Configurer dans Supabase :**

1. Ouvrez **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Cliquez **Add New Secret**
3. Entrez :
   - Name : `OPENAI_API_KEY`
   - Value : `sk-...` (votre clé OpenAI)
4. **Save**

**Obtenir une clé OpenAI :**
1. Compte sur [platform.openai.com](https://platform.openai.com)
2. **API Keys** → **Create new secret key**
3. Copiez immédiatement (invisible après)

**Vérifier :**
```bash
curl -X POST https://wlzyfvywhpoahctwcpos.functions.supabase.co/generate-flashcards \
  -H "Content-Type: application/json" \
  -d '{"text":"La photosynthèse convertit énergie lumineuse en glucose"}'
```

Résultat attendu : `{"summary":"...","cards":[...]}`
Si `cards` est vide → clé OpenAI manquante ou invalide.

### Variables d'Environnement Frontend

Créez un fichier `.env` à la racine du projet (ou copiez `.env.example`) :

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_FUNCTION_URL=https://your-project.functions.supabase.co
```

**Obtenir ces valeurs :**

1. `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` :
   - **Supabase Dashboard** → **Settings** → **API**

2. `VITE_SUPABASE_FUNCTION_URL` :
   - **Production** : `https://wlzyfvywhpoahctwcpos.functions.supabase.co`
   - **Dev local** : `http://localhost:54321`

**Fichiers d'environnement créés :**
- `.env.development` → local Supabase CLI
- `.env.production` → production cloud
- `.env` → valeurs actuelles (production)

## Déploiement de la Fonction Edge

La fonction `generate-flashcards` est **déjà déployée** et active :
- URL : `https://wlzyfvywhpoahctwcpos.functions.supabase.co/generate-flashcards`
- Status : ACTIVE
- JWT : désactivé (pas d'auth requise)

**Secrets requis :**
- `OPENAI_API_KEY` : clé OpenAI (OBLIGATOIRE)
- `ALLOWED_ORIGIN` : domaine autorisé CORS (optionnel, fallback : `http://localhost:5173`)

## Architecture de Sécurité

### ✅ Implémenté

1. **Pas de BYOK (Bring Your Own Key)** : La clé OpenAI est stockée côté serveur
2. **CORS Restreint** : Seulement POST et OPTIONS
3. **Validation Zod** : Toutes les cartes générées sont validées avant affichage
4. **FSRS Intelligent** : Queue basée sur les dates d'échéance, pas l'ordre d'insertion
5. **Persistance Locale** : État complet sauvegardé (deck + FSRS state)
6. **Erreurs Génériques** : Pas de fuite d'informations sensibles
7. **Verifier Pass** : 3-step pipeline (Reader → Composer → Verifier)

### 🔒 Recommandations Additionnelles

Pour un environnement production :

1. **Restreindre CORS** : Remplacez `"*"` par votre domaine exact
   ```ts
   "Access-Control-Allow-Origin": "https://votre-app.com"
   ```

2. **Rate Limiting** : Ajoutez Supabase Edge Function rate limiting

3. **Monitoring** : Activez les logs Supabase pour surveiller l'utilisation

4. **Backup** : Exportez régulièrement vos données (JSON export inclut FSRS state)

## Utilisation

1. **Générer** : Collez vos notes et cliquez sur "Générer des Cartes"
2. **Réviser** : Acceptez/rejetez les cartes proposées
3. **Étudier** : Session avec algorithme FSRS de répétition espacée
4. **Exporter** : JSON (avec état FSRS) ou CSV (cartes seulement)

### Raccourcis Clavier (Mode Étude)

- **Espace/Enter** : Révéler la réponse
- **1-4** : Noter la difficulté
  - 1 = Encore (revoir bientôt)
  - 2 = Difficile (revoir dans quelques jours)
  - 3 = Bien (intervalle moyen)
  - 4 = Facile (intervalle long)

## Algorithme FSRS

L'application utilise FSRS (Free Spaced Repetition Scheduler) :

- **Due-first** : Les cartes sont présentées par ordre d'échéance
- **Learning** : Cartes en phase d'apprentissage
- **Review** : Cartes déjà apprises, révisées selon l'algorithme
- **Relearning** : Cartes oubliées, en réapprentissage

**Métriques de Maîtrise :**
- Stability ≥ 40 jours
- Retrievability ≥ 0.9
- State = "review"

## Troubleshooting

### Erreur "VITE_SUPABASE_FUNCTION_URL not configured"

Vérifiez que `.env` contient :
```bash
VITE_SUPABASE_FUNCTION_URL=https://your-project.functions.supabase.co
```

### Erreur 404/405 lors de la génération

**Problème** : Mauvaise URL d'edge function

**Solutions** :
1. Vérifiez que `VITE_SUPABASE_FUNCTION_URL` ne contient PAS `/functions/v1`
   - ✅ Correct : `https://xxx.functions.supabase.co`
   - ❌ Incorrect : `https://xxx.supabase.co/functions/v1`

2. Pour dev local avec Supabase CLI :
   ```bash
   VITE_SUPABASE_FUNCTION_URL=http://localhost:54321
   ```

### Erreur "Service misconfigured"

La fonction edge ne trouve pas `OPENAI_API_KEY`.

**Solution** :
1. Allez dans **Supabase Dashboard** → **Edge Functions** → **Secrets**
2. Ajoutez `OPENAI_API_KEY=sk-...`
3. Redéployez la fonction si nécessaire

### Erreur "Invalid JSON" ou "Missing 'text'"

Vérifiez que vous envoyez bien du texte dans le champ de génération.

### Tester manuellement l'edge function

```bash
# Production
curl -X POST https://your-project.functions.supabase.co/generate-flashcards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"text":"La photosynthèse est le processus..."}'

# Local (avec Supabase CLI)
curl -X POST http://localhost:54321/functions/v1/generate-flashcards \
  -H "Content-Type: application/json" \
  -d '{"text":"La photosynthèse est le processus..."}'
```

## Support

Pour des questions ou problèmes :
1. Vérifiez que `OPENAI_API_KEY` est configuré dans Supabase Edge Functions
2. Vérifiez que toutes les variables `.env` sont correctes
3. Testez l'edge function manuellement (voir ci-dessus)
4. Consultez les logs dans **Supabase Dashboard** → **Edge Functions** → Logs
