# ⚠️ ACTION IMMÉDIATE REQUISE

## Le Problème

L'edge function est **déployée et fonctionne**, mais retourne `{"cards":[]}` car **`OPENAI_API_KEY` n'est pas configurée**.

**Test de confirmation :**
```bash
curl https://wlzyfvywhpoahctwcpos.functions.supabase.co/generate-flashcards \
  -H "Content-Type: application/json" \
  -d '{"text":"Test"}'

# Résultat actuel : {"summary":"...","cards":[]}
# ❌ cards vide = pas de clé OpenAI
```

## La Solution (5 minutes)

### Étape 1 : Obtenir une Clé OpenAI

1. Aller sur [platform.openai.com](https://platform.openai.com)
2. Se connecter / créer un compte
3. Cliquer **API Keys** (menu gauche)
4. Cliquer **Create new secret key**
5. Copier la clé (format : `sk-proj-...` ou `sk-...`)
6. ⚠️ La clé ne sera plus visible après !

### Étape 2 : Configurer dans Supabase

1. Ouvrir [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionner le projet `wlzyfvywhpoahctwcpos`
3. Aller dans **Project Settings** (⚙️ en bas à gauche)
4. Cliquer **Edge Functions** dans la barre latérale
5. Cliquer l'onglet **Secrets**
6. Cliquer **Add New Secret**
7. Remplir :
   ```
   Name:  OPENAI_API_KEY
   Value: sk-proj-... (votre clé copiée)
   ```
8. Cliquer **Create**

### Étape 3 : Vérifier

Attendre 10 secondes, puis tester :

```bash
curl https://wlzyfvywhpoahctwcpos.functions.supabase.co/generate-flashcards \
  -H "Content-Type: application/json" \
  -d '{"text":"La photosynthèse convertit lumière en énergie"}'
```

**Résultat attendu :**
```json
{
  "summary":"- Section 1 (45 chars)",
  "cards":[
    {
      "id":"...",
      "question":"Qu'est-ce que la photosynthèse ?",
      "answer":"Processus de conversion de lumière en énergie",
      "type":"Definition",
      ...
    }
  ]
}
```

✅ Si `cards` contient des objets → **Succès !**

### Étape 4 : Tester l'UI

1. Ouvrir l'application dans le navigateur
2. Coller du texte dans le champ
3. Cliquer "Générer des Cartes"
4. Voir le toast "X cartes générées avec succès !"

## Diagnostic Actuel

### ✅ Ce qui fonctionne

- Edge function déployée : `https://wlzyfvywhpoahctwcpos.functions.supabase.co/generate-flashcards`
- Endpoint répond : `HTTP 200 OK`
- CORS configuré : `access-control-allow-origin: http://localhost:5173`
- Frontend : `functionUrl()` détecte correctement l'environnement
- Build : Succès (242 kB)

### ❌ Ce qui manque

- `OPENAI_API_KEY` non configurée dans Supabase Edge Function Secrets
- Résultat : LLM ne peut pas être appelé → `cards: []`

## (Optionnel) Sécuriser CORS en Production

Une fois que la génération fonctionne, restreindre CORS :

1. Supabase Dashboard → Edge Functions → Secrets
2. Ajouter :
   ```
   Name:  ALLOWED_ORIGIN
   Value: https://votre-domaine.com
   ```

Sans cela, le fallback `http://localhost:5173` est utilisé (OK pour dev, problématique en prod).

## Troubleshooting

### Erreur "Service misconfigured"
→ `OPENAI_API_KEY` mal orthographiée ou manquante

### Erreur "Invalid JSON"
→ Body mal formé, vérifier `{"text":"..."}`

### CORS error dans le navigateur
→ Vérifier que `ALLOWED_ORIGIN` correspond à `window.location.origin`

### `cards: []` même après config
→ Attendre 30s propagation, vérifier l'orthographe de la clé

---

**Une fois `OPENAI_API_KEY` configurée, l'application est 100% fonctionnelle.**
