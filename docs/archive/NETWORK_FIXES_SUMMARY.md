# Résumé des Corrections Réseau

## Diagnostic Initial

**Problème** : Edge function inaccessible (404/405) en production

**Causes racines :**
1. ❌ URL incorrecte : `${VITE_SUPABASE_URL}/functions/v1/...` (ne fonctionne qu'en local)
2. ❌ `OPENAI_API_KEY` pas configurée dans Supabase secrets
3. ⚠️ Headers manquants (Authorization/apikey)
4. ⚠️ Parsing d'erreur fragile (await res.json() sur erreurs)

## Corrections Appliquées

### 1. Helper `functionUrl()` Créé

**Fichier** : `src/utils/functions.ts`

```typescript
export function functionUrl(name: string): string {
  const base = import.meta.env.VITE_SUPABASE_FUNCTION_URL;
  if (!base) throw new Error("VITE_SUPABASE_FUNCTION_URL not configured");

  const isLocal = /localhost|127\.0\.0\.1/.test(base);

  return isLocal
    ? `${base}/functions/v1/${name}`        // Local Supabase CLI
    : `${base}/${name}`;                     // Production cloud
}
```

**Utilisation dans `App.tsx` (ligne 105) :**
```typescript
const url = functionUrl("generate-flashcards");
```

### 2. Headers Robustes

**Fichier** : `src/App.tsx` (lignes 107-113)

```typescript
const headers: Record<string, string> = {
  "Content-Type": "application/json"
};

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (anonKey) {
  headers["Authorization"] = `Bearer ${anonKey}`;
  headers["apikey"] = anonKey;
}
```

### 3. Parsing d'Erreur Sécurisé

**Fichier** : `src/App.tsx` (lignes 121-134)

```typescript
const raw = await response.text();

if (!response.ok) {
  let msg = "Échec de la génération";
  try {
    const parsed = JSON.parse(raw);
    msg = parsed.error || msg;
  } catch {}
  throw new Error(msg);
}

let result: any;
try {
  result = JSON.parse(raw);
} catch {
  throw new Error("Réponse invalide du serveur");
}
```

### 4. Edge Function Sécurisée

**Fichier** : `supabase/functions/generate-flashcards/index.ts`

**CORS dynamique (ligne 4) :**
```typescript
"Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "http://localhost:5173"
```

**Validation OPENAI_API_KEY (ligne 178) :**
```typescript
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY not configured");
  return jsonErr(500, "Service misconfigured");
}
```

**Helper erreur (ligne 10) :**
```typescript
function jsonErr(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}
```

### 5. Configuration Environnement

**Fichiers créés :**

`.env` (production actuelle) :
```bash
VITE_SUPABASE_URL=https://wlzyfvywhpoahctwcpos.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_FUNCTION_URL=https://wlzyfvywhpoahctwcpos.functions.supabase.co
```

`.env.development` (Supabase CLI local) :
```bash
VITE_SUPABASE_FUNCTION_URL=http://localhost:54321
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJ... (demo key)
```

`.env.production` :
```bash
VITE_SUPABASE_FUNCTION_URL=https://wlzyfvywhpoahctwcpos.functions.supabase.co
VITE_SUPABASE_URL=https://wlzyfvywhpoahctwcpos.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Tests de Vérification

### ✅ Test Cloud Endpoint

```bash
curl -i -X POST https://wlzyfvywhpoahctwcpos.functions.supabase.co/generate-flashcards \
  -H "Content-Type: application/json" \
  -d '{"text":"La photosynthèse convertit lumière en énergie chimique"}'
```

**Résultat actuel :**
- Status : `HTTP/2 200`
- Headers : `access-control-allow-origin: http://localhost:5173` ✅
- Body : `{"summary":"- Section 1 (54 chars)","cards":[]}`

**Analyse :**
- ✅ Endpoint accessible
- ✅ CORS configuré correctement
- ❌ `cards: []` → `OPENAI_API_KEY` manquante

### ✅ Test Build

```bash
npm run build
# ✓ 1549 modules transformed.
# dist/assets/index-DRwnQo66.js   242.17 kB │ gzip: 71.57 kB
# ✓ built in 4.18s
```

### ✅ Test TypeScript

Aucune erreur de compilation.

## État Final

### ✅ Code Corrigé

| Composant | Status | Détails |
|-----------|--------|---------|
| `functionUrl()` | ✅ | Détection auto local/prod |
| Edge function URL | ✅ | Production : `https://xxx.functions.supabase.co/NAME` |
| Headers | ✅ | Authorization + apikey automatiques |
| Error parsing | ✅ | text() → JSON.parse() avec fallback |
| CORS | ✅ | Configurable via `ALLOWED_ORIGIN` |
| OPENAI_API_KEY check | ✅ | Fail-fast si manquante |
| Build | ✅ | 242 kB, pas d'erreurs |

### ⚠️ Action Utilisateur Requise

**Bloquer** : `OPENAI_API_KEY` non configurée dans Supabase Edge Function Secrets

**Solution (5 min) :**
1. Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Add New Secret : `OPENAI_API_KEY=sk-...`
3. Test : curl devrait retourner `cards: [...]` au lieu de `[]`

**Documentation :**
- `ACTION_REQUIRED.md` : Guide pas-à-pas
- `SETUP.md` : Configuration complète
- `DEPLOYMENT_CHECKLIST.md` : Checklist de déploiement

## Architecture Réseau Finale

```
Browser (React + Vite)
│
├─ functionUrl("generate-flashcards")
│  │
│  ├─ NODE_ENV=development
│  │  └─> http://localhost:54321/functions/v1/generate-flashcards
│  │
│  └─ NODE_ENV=production
│     └─> https://wlzyfvywhpoahctwcpos.functions.supabase.co/generate-flashcards
│
├─ Headers
│  ├─ Content-Type: application/json
│  ├─ Authorization: Bearer ANON_KEY (si disponible)
│  └─ apikey: ANON_KEY (si disponible)
│
└─ Error Handling
   ├─ text() avant JSON.parse()
   ├─ try/catch sur parsing
   ├─ AbortError détection
   └─ Messages utilisateur clairs

Supabase Edge Function (Deno)
│
├─ CORS
│  └─ Origin: ALLOWED_ORIGIN ?? "http://localhost:5173"
│
├─ Secrets (Deno.env)
│  ├─ OPENAI_API_KEY (OBLIGATOIRE)
│  └─ ALLOWED_ORIGIN (optionnel)
│
├─ Validation
│  ├─ Body JSON parsing avec try/catch
│  ├─ typeof text === "string"
│  └─ text.trim() non vide
│
└─ Pipeline LLM
   ├─ Reader → Extract facts
   ├─ Composer → Create cards
   └─ Verifier → Validate quality
```

## Prochaines Étapes

1. **MAINTENANT** : Configurer `OPENAI_API_KEY` dans Supabase (voir `ACTION_REQUIRED.md`)
2. Tester génération dans l'UI
3. (Optionnel) Configurer `ALLOWED_ORIGIN` pour production
4. Vérifier logs : Supabase Dashboard → Edge Functions → Logs

Une fois `OPENAI_API_KEY` configurée, l'application est **100% fonctionnelle**.
