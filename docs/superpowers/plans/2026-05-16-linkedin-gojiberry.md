# LinkedIn Gojiberry Playbook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un playbook `c1-linkedin` (uniquement, les playbooks A et B n'utilisent pas Gojiberry) avec une boucle bidirectionnelle complète : Gojiberry détecte des signaux LinkedIn → Make.com → Dashboard (inbound) + Dashboard valide → Make.com → Gojiberry envoie le message sur LinkedIn (outbound).

**Architecture:** INBOUND : Make.com/Gojiberry détecte un signal LinkedIn → POST JSON à `/api/playbooks/linkedin-signal` → 3 messages Claude générés → prospect affiché dans dashboard. OUTBOUND : User valide un prospect c1-linkedin → `validate/route.ts` appelle Make.com webhook sortant → Make.com/Gojiberry envoie le message sur LinkedIn. Le dashboard est le quarterback : tout part de lui.

**Tech Stack:** Next.js 15 App Router, Supabase, @anthropic-ai/sdk (claude-sonnet-4-6), Make.com (externe), Gojiberry AI (externe)

---

## File Structure

**Créer :**
- `supabase/migrations/20260516_linkedin.sql` — Colonne linkedin_profile_url + RPC increment_prospects_found
- `src/app/api/playbooks/linkedin-signal/route.ts` — Endpoint webhook Make.com

**Modifier :**
- `src/lib/playbooks/config.ts` — Ajouter `'c1-linkedin'` à PlaybookId + type family `'C'` + config
- `src/lib/playbooks/message-generator.ts` — Ajouter LINKEDIN_SIGNAL_CONTEXT + generateLinkedinMessage()
- `src/app/(dashboard)/playbooks/page.tsx` — Ajouter section Famille C
- `src/app/api/playbooks/validate/route.ts` — Appel Make.com outbound si playbook_id === 'c1-linkedin'
- `.env.local` — Ajouter LINKEDIN_WEBHOOK_SECRET + ANTHROPIC_API_KEY + MAKECOM_LINKEDIN_SEND_WEBHOOK
- `deploy-cloudrun.ps1` — Ajouter les 3 nouvelles variables aux secrets

---

## Task 1 — Config : ajouter le playbook c1-linkedin

**Files:**
- Modify: `src/lib/playbooks/config.ts`

- [ ] **Step 1: Ajouter `'c1-linkedin'` au type PlaybookId et `'C'` au type family**

Remplacer dans `src/lib/playbooks/config.ts` :
```typescript
export type PlaybookId =
  | 'a1-creations'
  | 'a2-cessions'
  | 'a3-holdings'
  | 'a4-dividendes'
  | 'a5-dirigeants'
  | 'b1-surveillance'
  | 'b2-rdv'
  | 'b3-liquidite'
  | 'b4-cartographie'
  | 'c1-linkedin'

// Dans PlaybookConfig, changer :
  family: 'A' | 'B' | 'C'
```

- [ ] **Step 2: Ajouter l'entrée c1-linkedin dans PLAYBOOKS**

Ajouter à la fin du tableau `PLAYBOOKS` (avant la fermeture `]`) :
```typescript
  {
    id: 'c1-linkedin',
    name: 'LinkedIn Gojiberry',
    family: 'C',
    description: 'Signaux LinkedIn détectés par Gojiberry (cessions, promotions, levées de fonds) — via Make.com',
    signalType: 'linkedin',
    scheduleDescription: 'Temps réel via webhook Make.com',
    urgencyDays: 2,
    sequenceSlug: 'linkedin',
    isOnDemand: false,
  },
```

- [ ] **Step 3: Vérifier que TypeScript compile**

```powershell
cd C:\Users\Ted\Documents\GitHub\TedScaleWithOuss
npx tsc --noEmit 2>&1 | Select-Object -First 20
```
Résultat attendu : aucune erreur.

- [ ] **Step 4: Commit**

```powershell
git add src/lib/playbooks/config.ts
git commit -m "feat: add c1-linkedin playbook to config"
```

---

## Task 2 — Migration : colonne linkedin_profile_url + RPC

**Files:**
- Create: `supabase/migrations/20260516_linkedin.sql`

- [ ] **Step 1: Créer la migration**

Créer `supabase/migrations/20260516_linkedin.sql` avec ce contenu exact :
```sql
-- supabase/migrations/20260516_linkedin.sql

ALTER TABLE playbook_prospects
  ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT;

-- RPC utilisée par le webhook pour incrémenter prospects_found
CREATE OR REPLACE FUNCTION increment_prospects_found(p_run_id UUID, p_count INT DEFAULT 1)
RETURNS VOID AS $$
  UPDATE playbook_runs
  SET prospects_found = prospects_found + p_count
  WHERE id = p_run_id;
$$ LANGUAGE SQL;
```

- [ ] **Step 2: Appliquer la migration**

```powershell
npx supabase db push
```
Résultat attendu : `Applying migration 20260516_linkedin.sql... done`

- [ ] **Step 3: Commit**

```powershell
git add supabase/migrations/20260516_linkedin.sql
git commit -m "feat: add linkedin_profile_url column + increment_prospects_found RPC"
```

---

## Task 3 — Message Generator : templates LinkedIn + generateLinkedinMessage

**Files:**
- Modify: `src/lib/playbooks/message-generator.ts`

- [ ] **Step 1: Ajouter LINKEDIN_SIGNAL_CONTEXT juste avant la fonction buildMessages**

Après la constante `PREWRITTEN_MESSAGES`, insérer :
```typescript
export const LINKEDIN_SIGNAL_CONTEXT: Record<string, {
  context: string
  angles: [string, string, string]
}> = {
  cession: {
    context: "Ce dirigeant a annoncé ou réalisé une cession d'entreprise récemment.",
    angles: ['fiscalité du produit de cession', 'réinvestissement et structuration post-cession', 'transmission familiale et protection du capital'],
  },
  promotion: {
    context: "Ce profil vient d'être promu ou a changé de poste vers un rôle de direction.",
    angles: ['revalorisation de rémunération et prévoyance dirigeant', 'optimisation du nouveau package (BSPCE, stock-options)', 'protection patrimoniale personnelle en tant que cadre dirigeant'],
  },
  levee_fonds: {
    context: "Cette entreprise vient de réaliser une levée de fonds.",
    angles: ['diversification du patrimoine personnel hors de l\'entreprise', 'structuration entre patrimoine pro et perso', 'protection du dirigeant fondateur en phase de croissance'],
  },
  creation_holding: {
    context: "Ce dirigeant vient de créer ou restructurer une holding.",
    angles: ['optimisation de la remontée de dividendes', 'structuration IS et patrimoine via la holding', 'préparation de la transmission capitalistique'],
  },
  retraite: {
    context: "Ce profil prépare activement son départ à la retraite.",
    angles: ['bilan retraite et optimisation des droits acquis', 'transmission progressive de l\'entreprise', 'gestion du capital post-activité professionnelle'],
  },
  recrutement: {
    context: "Cette entreprise recrute massivement, signe de forte croissance.",
    angles: ['prévoyance collective et épargne salariale en phase de croissance', 'protection du dirigeant face aux risques opérationnels', 'structuration patrimoniale pour une cession future'],
  },
}
```

- [ ] **Step 2: Ajouter la fonction generateLinkedinMessage après generateClaudeMessage**

```typescript
export async function generateLinkedinMessage(params: {
  signal_gojiberry: string
  signal_description: string
  prenom: string
  societe: string
  angle: string
}): Promise<string> {
  const { signal_gojiberry, signal_description, prenom, societe, angle } = params
  const signalCtx = LINKEDIN_SIGNAL_CONTEXT[signal_gojiberry]
  const context = signalCtx?.context ?? `Signal LinkedIn détecté : ${signal_description}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Tu es un expert en gestion de patrimoine avec 15 ans d'expérience. Rédige un message LinkedIn de premier contact.
Prénom : ${prenom}
Société : ${societe}
Contexte : ${context}
Description précise du signal : ${signal_description}
Angle patrimonial à aborder (implicitement) : ${angle}
Objectif : obtenir un échange informel de 20 minutes.
Règles absolues : maximum 5 lignes, référence naturelle à l'événement, aucun jargon financier, ton pair-à-pair chaleureux, jamais de produits financiers mentionnés.
Réponds uniquement avec le message, sans guillemets ni préambule.`,
    }],
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text.trim() : ''
}
```

- [ ] **Step 3: Vérifier TypeScript**

```powershell
npx tsc --noEmit 2>&1 | Select-Object -First 20
```
Résultat attendu : aucune erreur.

- [ ] **Step 4: Commit**

```powershell
git add src/lib/playbooks/message-generator.ts
git commit -m "feat: add LinkedIn signal contexts and generateLinkedinMessage"
```

---

## Task 4 — Endpoint webhook /api/playbooks/linkedin-signal

**Files:**
- Create: `src/app/api/playbooks/linkedin-signal/route.ts`

- [ ] **Step 1: Créer le répertoire et le fichier**

Créer `src/app/api/playbooks/linkedin-signal/route.ts` avec ce contenu :

```typescript
// src/app/api/playbooks/linkedin-signal/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateLinkedinMessage, LINKEDIN_SIGNAL_CONTEXT } from '@/lib/playbooks/message-generator'
import { sendTelegramMessage } from '@/lib/telegram/bot'
import type { SignalType } from '@/lib/playbooks/config'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SIGNAL_TO_TYPE: Record<string, SignalType> = {
  cession: 'cession',
  promotion: 'linkedin',
  levee_fonds: 'linkedin',
  creation_holding: 'holding',
  retraite: 'dirigeant_55',
  recrutement: 'linkedin',
}

const SIGNAL_SCORE: Record<string, number> = {
  cession: 9,
  levee_fonds: 8,
  creation_holding: 7,
  retraite: 7,
  promotion: 6,
  recrutement: 5,
}

// Corps attendu depuis Make.com
// {
//   prenom: string
//   nom?: string
//   societe: string
//   linkedin_url?: string
//   signal_gojiberry: 'cession' | 'promotion' | 'levee_fonds' | 'creation_holding' | 'retraite' | 'recrutement'
//   signal_description: string
//   localisation?: string
// }

export async function POST(req: NextRequest) {
  const secret = process.env.LINKEDIN_WEBHOOK_SECRET
  if (secret) {
    const provided = req.headers.get('x-webhook-secret')
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { prenom, nom, societe, linkedin_url, signal_gojiberry, signal_description, localisation } = body

  if (!prenom || !societe || !signal_gojiberry) {
    return NextResponse.json(
      { error: 'Champs requis manquants : prenom, societe, signal_gojiberry' },
      { status: 400 }
    )
  }

  const validSignals = Object.keys(SIGNAL_SCORE)
  if (!validSignals.includes(signal_gojiberry)) {
    return NextResponse.json(
      { error: `signal_gojiberry invalide. Valeurs acceptées : ${validSignals.join(', ')}` },
      { status: 400 }
    )
  }

  const signalType: SignalType = SIGNAL_TO_TYPE[signal_gojiberry] ?? 'linkedin'
  const score = SIGNAL_SCORE[signal_gojiberry]
  const dirigeantName = `${prenom} ${nom ?? ''}`.trim()
  const description = signal_description ?? signal_gojiberry

  // Trouver ou créer le run du jour pour c1-linkedin
  const sb = getSupabase()
  const today = new Date().toISOString().split('T')[0]

  const { data: existingRun } = await sb
    .from('playbook_runs')
    .select('id')
    .eq('playbook_id', 'c1-linkedin')
    .gte('started_at', `${today}T00:00:00Z`)
    .eq('status', 'running')
    .maybeSingle()

  let runId: string
  if (existingRun) {
    runId = existingRun.id
  } else {
    const { data: newRun, error: runError } = await sb
      .from('playbook_runs')
      .insert({ playbook_id: 'c1-linkedin', status: 'running' })
      .select('id')
      .single()
    if (runError || !newRun) {
      return NextResponse.json({ error: 'Failed to create run' }, { status: 500 })
    }
    runId = newRun.id
  }

  // Générer 3 messages personnalisés en parallèle (angles différents)
  const angles = LINKEDIN_SIGNAL_CONTEXT[signal_gojiberry]?.angles ?? [
    'patrimonial global',
    'protection personnelle',
    'transmission',
  ]

  const [msgA, msgB, msgC] = await Promise.all([
    generateLinkedinMessage({ signal_gojiberry, signal_description: description, prenom, societe, angle: angles[0] }),
    generateLinkedinMessage({ signal_gojiberry, signal_description: description, prenom, societe, angle: angles[1] }),
    generateLinkedinMessage({ signal_gojiberry, signal_description: description, prenom, societe, angle: angles[2] }),
  ])

  // Insérer le prospect
  const { error: insertError } = await sb.from('playbook_prospects').insert({
    run_id: runId,
    playbook_id: 'c1-linkedin',
    signal_type: signalType,
    score,
    company_name: societe,
    dirigeant_name: dirigeantName,
    localisation: localisation ?? null,
    linkedin_profile_url: linkedin_url ?? null,
    signal_data: { signal_gojiberry, signal_description: description, linkedin_url },
    message_j0_a: msgA,
    message_j0_b: msgB,
    message_j0_c: msgC,
    status: 'pending',
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Incrémenter le compteur du run
  await sb.rpc('increment_prospects_found', { p_run_id: runId, p_count: 1 })

  // Notifier Telegram
  const SIGNAL_EMOJI: Record<string, string> = {
    cession: '🔴',
    promotion: '🚀',
    levee_fonds: '💸',
    creation_holding: '🏗️',
    retraite: '🌅',
    recrutement: '📈',
  }
  const emoji = SIGNAL_EMOJI[signal_gojiberry] ?? '🔵'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  await sendTelegramMessage(
    `${emoji} *LinkedIn — ${signal_gojiberry}*\n${dirigeantName} · ${societe}\n${description}\n\nScore : ${score}/10 — 3 messages générés`,
    {
      inline_keyboard: [[
        { text: '👀 Valider dans le dashboard', url: `${appUrl}/playbooks/c1-linkedin` },
      ]],
    }
  )

  return NextResponse.json({ ok: true, runId, prospect: { dirigeantName, societe, score } })
}
```

- [ ] **Step 2: Vérifier TypeScript**

```powershell
npx tsc --noEmit 2>&1 | Select-Object -First 20
```
Résultat attendu : aucune erreur.

- [ ] **Step 3: Commit**

```powershell
git add src/app/api/playbooks/linkedin-signal/route.ts
git commit -m "feat: add LinkedIn signal webhook endpoint"
```

---

## Task 5 — Dashboard : section Famille C LinkedIn

**Files:**
- Modify: `src/app/(dashboard)/playbooks/page.tsx`

- [ ] **Step 1: Ajouter le filtre familyC et la section dans le JSX**

Dans `src/app/(dashboard)/playbooks/page.tsx`, ajouter après `const familyB = ...` :
```typescript
const familyC = PLAYBOOKS.filter(p => p.family === 'C')
```

Dans le JSX, ajouter après la section Famille B (avant `</div>` final) :
```typescript
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-green-600">
          Famille C — LinkedIn Gojiberry
        </h2>
        <div className="space-y-3">
          {familyC.map(p => (
            <Link key={p.id} href={`/playbooks/${p.id}`} className="block">
              <PlaybookCard
                playbook={p}
                lastRun={lastRuns[p.id]}
                onRun={(id) => { handleRun(id) }}
                isRunning={runningIds.has(p.id)}
              />
            </Link>
          ))}
        </div>
      </section>
```

- [ ] **Step 2: Vérifier TypeScript**

```powershell
npx tsc --noEmit 2>&1 | Select-Object -First 20
```
Résultat attendu : aucune erreur.

- [ ] **Step 3: Commit**

```powershell
git add src/app/(dashboard)/playbooks/page.tsx
git commit -m "feat: add Famille C LinkedIn section in playbooks dashboard"
```

---

## Task 6 — Env, deploy script et déploiement

**Files:**
- Modify: `.env.local`
- Modify: `deploy-cloudrun.ps1`

- [ ] **Step 1: Ajouter les variables dans .env.local**

Ajouter à la fin de `.env.local` :
```
# Claude API (LinkedIn message generation)
ANTHROPIC_API_KEY=<ta_clé_anthropic>

# LinkedIn Gojiberry webhook secret (à définir librement, copier dans Make.com)
LINKEDIN_WEBHOOK_SECRET=linkedin_secret_ted_2026
```

Pour ANTHROPIC_API_KEY : récupérer sur console.anthropic.com → API Keys.

- [ ] **Step 2: Ajouter les deux variables dans deploy-cloudrun.ps1**

Dans le tableau `$secretsArg` de `deploy-cloudrun.ps1`, ajouter `"ANTHROPIC_API_KEY"` et `"LINKEDIN_WEBHOOK_SECRET"` :
```powershell
$secretsArg = (
  "SUPABASE_SERVICE_ROLE_KEY",
  "BREVO_API_KEY",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_ACCESS_TOKEN",
  "CRON_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "PAPPERS_API_KEY",
  "GOOGLE_PLACES_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "ANTHROPIC_API_KEY",
  "LINKEDIN_WEBHOOK_SECRET"
) | Where-Object { $envVars.ContainsKey($_) } | ForEach-Object {
```

- [ ] **Step 3: Commit**

```powershell
git add deploy-cloudrun.ps1
git commit -m "feat: add ANTHROPIC_API_KEY and LINKEDIN_WEBHOOK_SECRET to deploy script"
```

- [ ] **Step 4: Déployer**

```powershell
.\deploy-cloudrun.ps1 -ProjectId integration-make-365608
```
Résultat attendu : `=== DEPLOY TERMINE ===`

- [ ] **Step 5: Tester le webhook en local (avant Make.com)**

```powershell
$body = @{
  prenom = "Jean"
  nom = "Dupont"
  societe = "Dupont Industrie SAS"
  linkedin_url = "https://www.linkedin.com/in/jean-dupont/"
  signal_gojiberry = "cession"
  signal_description = "Jean Dupont a annoncé la cession de Dupont Industrie SAS"
  localisation = "Paris (75)"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://ted-scale-with-ouss-272642857923.europe-west1.run.app/api/playbooks/linkedin-signal" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json"; "x-webhook-secret" = "linkedin_secret_ted_2026" } `
  -Body $body
```
Résultat attendu : `{"ok":true,"runId":"...","prospect":{"dirigeantName":"Jean Dupont","societe":"Dupont Industrie SAS","score":9}}`

Vérifier aussi : notification Telegram reçue + prospect visible sur `/playbooks/c1-linkedin`.

---

## Task 7 — Configuration Make.com (étape externe, documentée ici)

> Cette tâche est manuelle dans Make.com. Pas de code à écrire. Documenter pour référence.

- [ ] **Step 1: Créer le scénario Make.com**

Dans Make.com :
1. Nouveau scénario
2. Module 1 — **Trigger** : Gojiberry AI → "New Signal Detected"
3. Module 2 — **HTTP → Make a request** :
   - URL : `https://ted-scale-with-ouss-272642857923.europe-west1.run.app/api/playbooks/linkedin-signal`
   - Method : POST
   - Headers : `x-webhook-secret: linkedin_secret_ted_2026`
   - Body type : JSON
   - Body :
   ```json
   {
     "prenom": "{{1.firstName}}",
     "nom": "{{1.lastName}}",
     "societe": "{{1.company}}",
     "linkedin_url": "{{1.profileUrl}}",
     "signal_gojiberry": "{{1.signalType}}",
     "signal_description": "{{1.signalDescription}}",
     "localisation": "{{1.location}}"
   }
   ```
4. Activer le scénario (toggle ON)

Les valeurs `signal_gojiberry` valides que Make.com doit envoyer :
- `cession` — Annonce de cession
- `promotion` — Changement de poste / promotion
- `levee_fonds` — Levée de fonds
- `creation_holding` — Création de holding
- `retraite` — Départ à la retraite
- `recrutement` — Recrutement massif

---

## Task 8 — Outbound : dashboard envoie le message validé vers LinkedIn via Make.com

**Files:**
- Modify: `src/app/api/playbooks/validate/route.ts`
- Modify: `.env.local`
- Modify: `deploy-cloudrun.ps1`

- [ ] **Step 1: Ajouter MAKECOM_LINKEDIN_SEND_WEBHOOK dans .env.local**

```
# Make.com webhook sortant — envoie le message validé vers LinkedIn via Gojiberry
MAKECOM_LINKEDIN_SEND_WEBHOOK=https://hook.eu1.make.com/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
(URL à copier depuis le scénario Make.com sortant une fois créé — voir Task 9)

- [ ] **Step 2: Ajouter la variable dans deploy-cloudrun.ps1**

Dans le tableau `$secretsArg`, ajouter `"MAKECOM_LINKEDIN_SEND_WEBHOOK"` après `"LINKEDIN_WEBHOOK_SECRET"` :
```powershell
  "LINKEDIN_WEBHOOK_SECRET",
  "MAKECOM_LINKEDIN_SEND_WEBHOOK"
```

- [ ] **Step 3: Modifier validate/route.ts pour l'envoi outbound**

Dans `src/app/api/playbooks/validate/route.ts`, après la boucle `for (const pp of playProspects ?? [])` (après les inserts dans `prospects`), ajouter avant `if (runId)` :

```typescript
    // Outbound LinkedIn : si playbook c1-linkedin, envoyer le message validé via Make.com → Gojiberry
    const makecomUrl = process.env.MAKECOM_LINKEDIN_SEND_WEBHOOK
    if (makecomUrl) {
      const linkedinProspects = (playProspects ?? []).filter(
        (pp: any) => pp.playbook_id === 'c1-linkedin' && pp.signal_data?.linkedin_url
      )
      for (const pp of linkedinProspects) {
        const messageField = `message_j0_${variant}` as keyof typeof pp
        const chosenMessage = pp[messageField] as string ?? ''
        await fetch(makecomUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            linkedin_url: pp.signal_data.linkedin_url,
            message: chosenMessage,
            prenom: pp.dirigeant_name?.split(' ')[0] ?? '',
            societe: pp.company_name ?? '',
            signal_gojiberry: pp.signal_data?.signal_gojiberry ?? '',
          }),
        }).catch(() => {}) // non-bloquant
      }
    }
```

- [ ] **Step 4: Vérifier TypeScript**

```powershell
npx tsc --noEmit 2>&1 | Select-Object -First 20
```
Résultat attendu : aucune erreur.

- [ ] **Step 5: Commit + déployer**

```powershell
git add src/app/api/playbooks/validate/route.ts deploy-cloudrun.ps1
git commit -m "feat: outbound LinkedIn send on c1-linkedin prospect validation"
.\deploy-cloudrun.ps1 -ProjectId integration-make-365608
```

---

## Task 9 — Scénario Make.com sortant (étape externe documentée)

> Tâche manuelle dans Make.com. Pas de code.

- [ ] **Step 1: Créer le scénario outbound dans Make.com**

1. Nouveau scénario
2. Module 1 — **Trigger** : Webhooks → Custom webhook → Créer → copier l'URL → la mettre dans `MAKECOM_LINKEDIN_SEND_WEBHOOK`
3. Module 2 — **Gojiberry AI → Send LinkedIn message** :
   - LinkedIn URL : `{{1.linkedin_url}}`
   - Message : `{{1.message}}`
4. Activer le scénario

Corps reçu par Make.com depuis le dashboard :
```json
{
  "linkedin_url": "https://www.linkedin.com/in/jean-dupont/",
  "message": "Bonjour Jean, j'ai vu l'annonce concernant...",
  "prenom": "Jean",
  "societe": "Dupont Industrie SAS",
  "signal_gojiberry": "cession"
}
```

- [ ] **Step 2: Tester le flux complet**

1. Envoyer un signal test via webhook inbound (Task 6 Step 5)
2. Aller sur `/playbooks/c1-linkedin` dans le dashboard
3. Sélectionner Variant A, cliquer "Valider + Séquence"
4. Vérifier dans Make.com → historique du scénario sortant → exécution reçue
5. Vérifier que Gojiberry a bien déclenché l'envoi LinkedIn

---

## Self-Review

**Spec coverage :**
- ✅ Gojiberry uniquement pour c1-linkedin (playbooks A et B non touchés)
- ✅ INBOUND : webhook Make.com → `/api/playbooks/linkedin-signal`
- ✅ Authentification par secret header (LINKEDIN_WEBHOOK_SECRET)
- ✅ Création/réutilisation run journalier
- ✅ 3 messages Claude personnalisés par signal (angles différents)
- ✅ Prospect stocké dans playbook_prospects (intégration existante)
- ✅ Notification Telegram avec lien dashboard
- ✅ Validation depuis `/playbooks/c1-linkedin` (UI existante réutilisée)
- ✅ OUTBOUND : validate → Make.com → Gojiberry → LinkedIn (dashboard quarterback)
- ✅ Famille C dans le dashboard
- ✅ Variables d'env (ANTHROPIC_API_KEY, LINKEDIN_WEBHOOK_SECRET, MAKECOM_LINKEDIN_SEND_WEBHOOK)

**Placeholder scan :** Aucun TBD, aucun "à compléter".

**Cohérence des types :**
- `generateLinkedinMessage` définie en Task 3, importée en Task 4 ✅
- `LINKEDIN_SIGNAL_CONTEXT` définie en Task 3, importée en Task 4 ✅
- `SignalType` importé depuis config.ts dans le webhook ✅
- `increment_prospects_found` créée en Task 2, appelée en Task 4 avec paramètres `p_run_id` et `p_count` ✅
- `linkedin_profile_url` colonne créée en Task 2, insérée en Task 4 ✅
