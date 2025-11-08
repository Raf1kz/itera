# Checklist de Déploiement StudyFlash

## ✅ État Actuel

### Edge Function
- ✅ Déployée : `https://wlzyfvywhpoahctwcpos.functions.supabase.co/generate-flashcards`
- ✅ Status : ACTIVE
- ✅ Code : Reader → Composer → Verifier pipeline
- ✅ CORS : Configurable via `ALLOWED_ORIGIN` (fallback : `http://localhost:5173`)
- ✅ Validation : Zod server-side + client-side

### Frontend
- ✅ Build : RÉUSSI (242.17 kB JS, 38.53 kB CSS)
- ✅ URL dynamique : `functionUrl()` détecte local vs production
- ✅ Headers : Authorization + apikey automatiques
- ✅ Error handling : Robuste (text → JSON, abort, timeout)

### Configuration
- ✅ `.env` : Production configuré
- ✅ `.env.development` : Local Supabase CLI
- ✅ `.env.production` : Cloud Supabase
- ✅ `.env.example` : Template documenté

## ⚠️ ACTION REQUISE

### 1. Configurer OPENAI_API_KEY (CRITIQUE)

**Sans cette étape, aucune carte ne sera générée !**

```bash
# Manuellement dans Dashboard
Supabase → Project Settings → Edge Functions → Secrets
Name:  OPENAI_API_KEY
Value: sk-...
```

### 2. (Optionnel) Restreindre CORS en Production

```bash
# Dans Supabase Edge Function Secrets
Name:  ALLOWED_ORIGIN
Value: https://votre-domaine.com
```

Sans cela, le fallback `http://localhost:5173` est utilisé.

## 🧪 Tests de Vérification

### 1. Test Edge Function (sans clé configurée)

```bash
curl -X POST https://wlzyfvywhpoahctwcpos.functions.supabase.co/generate-flashcards \
  -H "Content-Type: application/json" \
  -d '{"text":"La photosynthèse convertit lumière en glucose"}'
```

**Résultat actuel :**
```json
{"summary":"- Section 1 (X chars)","cards":[]}
```

`cards: []` = `OPENAI_API_KEY` manquante

### 2. Test après configuration OPENAI_API_KEY

**Résultat attendu :**
```json
{
  "summary":"- Section 1 (X chars)",
  "cards":[
    {
      "id":"...",
      "question":"Qu'est-ce que la photosynthèse ?",
      "answer":"Processus de conversion de lumière en glucose",
      "type":"Definition",
      "category":"Section 1",
      "difficulty":2,
      "bloom":"Remember"
    }
  ]
}
```

### 3. Test Frontend Local

```bash
npm run dev
# Ouvrir http://localhost:5173
# Coller des notes → Générer des Cartes
```

**Attendu :** Toast "X cartes générées avec succès !"

## 📋 Architecture Finale

```
Client (React)
├─ functionUrl() → détecte env
│  ├─ Dev:  http://localhost:54321/functions/v1/generate-flashcards
│  └─ Prod: https://xxx.functions.supabase.co/generate-flashcards
│
├─ Headers automatiques
│  ├─ Content-Type: application/json
│  ├─ Authorization: Bearer ANON_KEY (si disponible)
│  └─ apikey: ANON_KEY (si disponible)
│
└─ Validation Zod client-side
   └─ Normalisation types EN→FR

Edge Function (Deno)
├─ Env vars
│  ├─ OPENAI_API_KEY (OBLIGATOIRE)
│  └─ ALLOWED_ORIGIN (optionnel)
│
├─ Pipeline 3-step
│  ├─ Reader: Extract facts
│  ├─ Composer: Create cards
│  └─ Verifier: Validate quality
│
├─ CORS dynamique
└─ Erreurs uniformes (jsonErr)
```

## 🔒 Sécurité

✅ Pas de BYOK (clé côté serveur)
✅ CORS restreint (configurable)
✅ Validation Zod stricte
✅ Erreurs génériques (pas de fuite)
✅ FSRS avec due-date initialization
✅ Persistance complète (deck + FSRS)

## 📚 Documentation

- `SETUP.md` : Configuration complète
- `DEPLOYMENT_CHECKLIST.md` : Ce fichier
- `.env.example` : Template
- `SETUP.md` → Troubleshooting : 404/405, missing key, JSON errors

## 🚀 Prochaines Étapes

1. **MAINTENANT** : Configurer `OPENAI_API_KEY` dans Supabase
2. Tester la génération dans l'UI
3. (Optionnel) Configurer `ALLOWED_ORIGIN` pour production
4. Vérifier les logs : Supabase → Edge Functions → Logs
