---
phase: 02-sequences-multicanales
plan: 02D
type: execute
wave: 3
depends_on: [02B, 02C]
files_modified:
  - src/app/api/pipeline/move/route.ts
  - src/app/api/crm/sequences/templates/route.ts
  - src/lib/sequences/client-actions.ts
autonomous: true
requirements: [SEQ-02, SEQ-03, SEQ-07]
tags: [api, pipeline, whatsapp, linkedin, auto-trigger, sequences]

must_haves:
  truths:
    - "Déplacer un prospect dans le Kanban déclenche automatiquement une séquence si un template auto_trigger=true existe pour ce stade"
    - "L'auto-trigger est non-bloquant — une erreur de séquence ne fait pas échouer le déplacement de carte"
    - "La route GET /api/crm/sequences/templates retourne la liste des templates du user"
    - "Les helpers client-side openWhatsApp() et openLinkedIn() sont disponibles dans crm/page.tsx pour les étapes WhatsApp et LinkedIn"
    - "Les étapes WhatsApp et LinkedIn dans une séquence présentent un bouton d'action manuelle dans le drawer"
  artifacts:
    - path: "src/app/api/pipeline/move/route.ts"
      provides: "Hook SEQ-02 : triggerSequenceForStage() appelé après pipeline_events insert"
      contains: "triggerSequenceForStage"
    - path: "src/app/api/crm/sequences/templates/route.ts"
      provides: "GET liste des templates — alimentant le sélecteur drawer"
      exports: ["GET"]
    - path: "src/lib/sequences/client-actions.ts"
      provides: "openWhatsApp() + openLinkedIn() — helpers navigateur uniquement"
      exports: ["openWhatsApp", "openLinkedIn"]
  key_links:
    - from: "POST /api/pipeline/move"
      to: "triggerSequenceForStage()"
      via: "void triggerSequenceForStage(...) — non-bloquant"
      pattern: "void triggerSequenceForStage"
    - from: "crm/page.tsx ProspectDrawer"
      to: "openWhatsApp() / openLinkedIn()"
      via: "import depuis '@/lib/sequences/client-actions'"
      pattern: "client-actions"
---

## Phase Goal

**As a** CGP utilisant le dashboard, **I want to** que les séquences se déclenchent automatiquement quand je déplace un prospect dans le Kanban et que les étapes WhatsApp et LinkedIn s'ouvrent en un clic, **so that** je n'aie pas à démarrer manuellement chaque relance et que les canaux client-side soient intégrés au flux de séquence.

<objective>
Ce plan livre trois éléments : (1) le hook SEQ-02 dans `POST /api/pipeline/move` qui appelle `triggerSequenceForStage()` en fire-and-forget, (2) la route GET `/api/crm/sequences/templates` qui alimente le sélecteur drawer 02C, (3) les helpers client-side `openWhatsApp()` et `openLinkedIn()` dans `src/lib/sequences/client-actions.ts` pour que les étapes de ces canaux dans le drawer présentent un bouton d'action manuelle.

Purpose: Le déclenchement auto (SEQ-02) est le principal vecteur d'utilisation des séquences — sans lui, l'utilisateur doit tout démarrer manuellement. Les helpers WhatsApp/LinkedIn complètent les canaux client-side (SEQ-03, SEQ-07) qui ne peuvent pas s'exécuter côté serveur (Pitfall 2 RESEARCH).
Output: pipeline/move/route.ts modifié + 2 nouveaux fichiers de route et lib.
</objective>

<execution_context>
@C:\Users\Ted\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\Ted\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@C:\Users\Ted\Documents\GitHub\TedScaleWithOuss\.planning\phases\02-sequences-multicanales\02-RESEARCH.md
@C:\Users\Ted\Documents\GitHub\TedScaleWithOuss\src\app\api\pipeline\move\route.ts
@C:\Users\Ted\Documents\GitHub\TedScaleWithOuss\src\lib\api.ts

<interfaces>
<!-- État actuel de pipeline/move/route.ts -->
```typescript
// src/app/api/pipeline/move/route.ts — état AVANT modification
// La fonction POST retourne apiSuccess({ prospect_id, to_stage }) après :
//   1. supabase.auth.getUser() — authentification
//   2. moveSchema.safeParse(body) — validation Zod
//   3. supabase.from('prospects').update({ pipeline_stage: to_stage })
//   4. supabase.from('pipeline_events').insert({ ... })  ← insérer hook SEQ-02 APRÈS cette ligne
//   5. return apiSuccess({ prospect_id, to_stage })      ← ne pas bloquer

// Hook point SEQ-02 (Pattern 2 RESEARCH) :
// Ajouter APRÈS le pipeline_events insert, AVANT le return :
import { triggerSequenceForStage } from '@/lib/sequences/trigger'
void triggerSequenceForStage({ supabase, userId: user.id, prospectId: prospect_id, toStage: to_stage })
// "void" = fire-and-forget non-bloquant (Pitfall 6 RESEARCH)
```

<!-- Interface lib/sequences/trigger.ts (créée en 02B) -->
```typescript
// src/lib/sequences/trigger.ts — signature existante
export async function triggerSequenceForStage(args: {
  supabase: SupabaseLike
  userId: string
  prospectId: string
  templateId?: string
  toStage?: string
}): Promise<{ instanceId?: string; error?: string; alreadyActive?: boolean }>
```

<!-- Patterns client-side RESEARCH -->
```typescript
// Pattern 6 RESEARCH — WhatsApp
function openWhatsApp(phone: string, message: string) {
  const phoneClean = phone.replace(/\s/g,'').replace(/^0/,'33').replace(/[^0-9]/g,'')
  const encoded = encodeURIComponent(message)
  window.open(`https://wa.me/${phoneClean}?text=${encoded}`, '_blank')
}

// Pattern 7 RESEARCH — LinkedIn
async function openLinkedIn(linkedinUrl: string | null, prospectName: string, inmailTemplate: string) {
  const url = linkedinUrl || `https://linkedin.com/search/results/people/?keywords=${encodeURIComponent(prospectName)}`
  window.open(url, '_blank')
  try { await navigator.clipboard.writeText(inmailTemplate) } catch { }
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Hook SEQ-02 dans pipeline/move + route GET templates</name>
  <read_first>
    - src/app/api/pipeline/move/route.ts (lire complet avant de modifier)
    - src/lib/sequences/trigger.ts (vérifier signature exacte après 02B)
    - src/lib/api.ts (helpers existants)
  </read_first>
  <files>src/app/api/pipeline/move/route.ts, src/app/api/crm/sequences/templates/route.ts</files>
  <action>
**1. Modifier `src/app/api/pipeline/move/route.ts`** — ajouter le hook SEQ-02 :

Ajouter l'import en haut du fichier (après les imports existants) :
```typescript
import { triggerSequenceForStage } from '@/lib/sequences/trigger'
```

Dans la fonction POST, APRÈS le bloc pipeline_events.insert (les lignes qui logguent l'event) et AVANT le `return apiSuccess(...)` final :
```typescript
// SEQ-02 : déclencher séquence auto si un template auto_trigger existe pour ce stade
// Non-bloquant : void + pas de await (Pitfall 6 RESEARCH)
void triggerSequenceForStage({
  supabase,
  userId: user.id,
  prospectId: prospect_id,
  toStage: to_stage,
})
```

NE PAS changer la logique existante. NE PAS bloquer sur le résultat du trigger. Le `return apiSuccess({ prospect_id, to_stage })` reste identique.

**2. Créer `src/app/api/crm/sequences/templates/route.ts`** — GET liste templates :

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data: templates, error } = await supabase
    .from('sequence_templates')
    .select('id, name, pipeline_stage, auto_trigger')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) return apiError(error.message)
  return apiSuccess({ templates: templates ?? [] })
}
```
  </action>
  <verify>
    <automated>npx tsc --noEmit --project C:\Users\Ted\Documents\GitHub\TedScaleWithOuss\tsconfig.json 2>&1 | Select-String "error TS" | Measure-Object | Select-Object -ExpandProperty Count</automated>
  </verify>
  <done>
pipeline/move/route.ts contient `triggerSequenceForStage` avec `void` (non-bloquant). La route GET /api/crm/sequences/templates existe et retourne la liste des templates. TypeScript compile sans erreur.
  </done>
</task>

<task type="auto">
  <name>Task 2: Helpers client-side WhatsApp + LinkedIn (SEQ-03, SEQ-07) et intégration drawer</name>
  <read_first>
    - src/app/(dashboard)/crm/page.tsx (état après 02C — chercher les étapes SEQ-03/07 à intégrer)
    - .planning/phases/02-sequences-multicanales/02-RESEARCH.md (Patterns 6, 7 + Pitfall 2)
  </read_first>
  <files>src/lib/sequences/client-actions.ts, src/app/(dashboard)/crm/page.tsx</files>
  <action>
**1. Créer `src/lib/sequences/client-actions.ts`** — helpers navigateur (NE PAS importer dans des Route Handlers — navigateur uniquement, Pitfall 2 RESEARCH) :

```typescript
'use client'
// IMPORTANT : Ce fichier contient des APIs navigateur (window, navigator).
// Ne jamais importer dans des Route Handlers ou Edge Functions.

/**
 * Ouvre WhatsApp Web avec le numéro normalisé et le message pré-rempli.
 * Normalisation : 0612345678 -> 33612345678 (France)
 */
export function openWhatsApp(phone: string, message: string): void {
  const phoneClean = phone
    .replace(/\s/g, '')
    .replace(/^\+/, '')      // supprimer + initial si E.164
    .replace(/^0/, '33')     // normaliser France 06/07 -> 33
    .replace(/[^0-9]/g, '')
  const encoded = encodeURIComponent(message)
  window.open(`https://wa.me/${phoneClean}?text=${encoded}`, '_blank')
}

/**
 * Ouvre le profil LinkedIn et copie le template InMail dans le presse-papier.
 * Si linkedinUrl est null, recherche par nom.
 */
export async function openLinkedIn(args: {
  linkedinUrl: string | null
  prospectName: string
  inmailTemplate: string
  onCopied?: () => void
}): Promise<void> {
  const { linkedinUrl, prospectName, inmailTemplate, onCopied } = args
  const url = linkedinUrl
    ?? `https://linkedin.com/search/results/people/?keywords=${encodeURIComponent(prospectName)}`
  window.open(url, '_blank')
  try {
    await navigator.clipboard.writeText(inmailTemplate)
    onCopied?.()
  } catch {
    // Clipboard API silencieusement ignorée si non disponible (ex: non-HTTPS)
    // Sur localhost, elle fonctionne normalement (Pitfall 7 RESEARCH)
  }
}
```

**2. Intégrer dans crm/page.tsx** — ajouter import + boutons d'action manuelle dans le drawer pour les étapes client-side :

Ajouter au bloc d'imports de crm/page.tsx :
```typescript
import { openWhatsApp, openLinkedIn } from '@/lib/sequences/client-actions'
```

Dans la section Séquences du drawer (créée en 02C), dans le rendu de chaque `step`, ajouter un bouton "Agir" conditionnel POUR les canaux client-side pending :

```tsx
{/* Bouton action manuelle pour étapes client-side (WhatsApp, LinkedIn) */}
{(step.channel === 'whatsapp' || step.channel === 'linkedin') && step.status === 'pending' && (
  <button
    onClick={() => {
      if (step.channel === 'whatsapp') {
        openWhatsApp(
          prospect.telephone ?? '',
          `Bonjour ${prospect.nom.split(' ')[0]}, suite à notre échange...`
        )
      } else {
        openLinkedIn({
          linkedinUrl: null,  // prospect.linkedin_url si disponible dans le type Prospect
          prospectName: prospect.nom,
          inmailTemplate: `Bonjour ${prospect.nom.split(' ')[0]}, je me permets de vous contacter...`,
          onCopied: () => toast.success('Template InMail copié dans le presse-papier'),
        })
      }
    }}
    style={{
      fontSize: 9, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
      border: `1px solid ${step.channel === 'whatsapp' ? '#25D366' : '#0A66C2'}`,
      background: step.channel === 'whatsapp' ? 'rgba(37,211,102,0.1)' : 'rgba(10,102,194,0.1)',
      color: step.channel === 'whatsapp' ? '#25D366' : '#0A66C2',
    }}
  >
    {step.channel === 'whatsapp' ? 'Ouvrir WA' : 'Ouvrir LinkedIn'}
  </button>
)}
```

Placer ce bouton juste après le span de statut dans le map des étapes (déjà rendu en 02C), à l'intérieur du `div` flex par étape.

Note : Si le type `Prospect` local dans crm/page.tsx n'a pas de champ `linkedin_url`, passer `null` — l'utilisateur sera redirigé vers la recherche LinkedIn par nom.
  </action>
  <verify>
    <automated>powershell.exe -Command "Select-String -Path 'C:\Users\Ted\Documents\GitHub\TedScaleWithOuss\src\lib\sequences\client-actions.ts' -Pattern 'export function openWhatsApp|export async function openLinkedIn' | Measure-Object | Select-Object -ExpandProperty Count"</automated>
  </verify>
  <done>
`client-actions.ts` existe avec openWhatsApp et openLinkedIn exportés. crm/page.tsx importe ces helpers et affiche des boutons "Ouvrir WA" / "Ouvrir LinkedIn" pour les étapes pending de ces canaux. TypeScript compile sans erreur.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| POST /api/pipeline/move → triggerSequenceForStage | Fonction lib — données issues de la requête validée, userId de getUser() |
| Browser → wa.me / linkedin.com | Ouvertures navigateur — aucune donnée sensible transmise à ces URLs sauf numéro de téléphone |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02D-01 | Spoofing | Hook SEQ-02 — userId dans trigger | mitigate | userId extrait de `getUser()` dans pipeline/move — jamais du body |
| T-02D-02 | Denial of Service | Double-trigger sur drag-and-drop rapide | mitigate | Guard doublon dans triggerSequenceForStage (alreadyActive check) — créé en 02B |
| T-02D-03 | Information Disclosure | Numéro téléphone dans URL wa.me | accept | Usage délibéré — l'utilisateur initie l'ouverture WA, comportement attendu |
| T-02D-04 | Tampering | client-actions.ts importé côté serveur | mitigate | Directive 'use client' en tête du fichier — Next.js refuse l'import dans Route Handlers |
</threat_model>

<verification>
1. Déplacer un prospect vers un stade ayant un template auto_trigger=true en DB
2. Vérifier dans Supabase Studio : une sequence_instance est créée avec les steps planifiés
3. Vérifier que la réponse de /api/pipeline/move est toujours rapide (pas bloquée par le trigger)
4. GET /api/crm/sequences/templates retourne les templates du user (test curl avec session)
5. Dans le drawer, une étape WhatsApp pending affiche "Ouvrir WA" — clic ouvre wa.me dans un nouvel onglet
6. Une étape LinkedIn pending affiche "Ouvrir LinkedIn" — clic ouvre linkedin.com et copie le template
</verification>

<success_criteria>
- pipeline/move/route.ts contient `void triggerSequenceForStage(...)` après le pipeline_events insert
- GET /api/crm/sequences/templates retourne 200 avec `{ data: { templates: [...] } }`
- client-actions.ts existe avec les deux exports et la directive 'use client'
- Les boutons WA/LinkedIn apparaissent dans le drawer pour les étapes client-side pending
- Drag-and-drop Kanban crée une instance si template auto configuré pour ce stade
- TypeScript compile sans erreur
</success_criteria>

<output>
After completion, create `.planning/phases/02-sequences-multicanales/02D-SUMMARY.md`
</output>
