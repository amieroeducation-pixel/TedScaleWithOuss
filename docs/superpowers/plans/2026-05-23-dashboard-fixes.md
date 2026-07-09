# Dashboard Fixes — 6 points post-test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger 6 problèmes remontés après test du dashboard : TNS données figées, liaison compteurs Today↔Global, séquences depuis cartes, multi-métiers TNS, bouton fin de journée, chronomètre persistant.

**Architecture:**
- Today counters → localStorage + UPSERT Supabase `daily_kpis` au clic "Terminer la journée"
- TNS page : remplace `BASE_PROSPECTS` hardcodés par données Supabase + multi-select métiers avec fusion côté client
- Chronomètre : stocke `{ startedAt, pausedSec, running }` dans localStorage pour survivre à la navigation
- Séquences : ajoute un bouton "▶ Séquence" dans `ProspectCard` (TNS) ; dans le CRM, affiche un message clair si aucun template n'existe

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase PostgreSQL (UPSERT), inline CSS via `C` de `src/lib/theme.ts`

---

## Fichiers modifiés

| Fichier | Rôle |
|---------|------|
| `src/app/(dashboard)/today/page.tsx` | Chronomètre persistant + bouton fin de journée |
| `src/app/(dashboard)/prospection/tns/page.tsx` | Multi-select métiers + remplace BASE_PROSPECTS |
| `src/components/prospects/ProspectCard.tsx` | Bouton séquence |
| `src/app/api/today/kpis/route.ts` | Nouveau : UPSERT daily_kpis |
| `src/app/api/global/stats/route.ts` | Lit aussi daily_kpis |
| `supabase/migrations/008_daily_kpis.sql` | Nouveau : table daily_kpis |

---

## Task 1 — Migration Supabase : table `daily_kpis`

**Files:**
- Create: `supabase/migrations/008_daily_kpis.sql`

- [ ] **Step 1 : Créer le fichier de migration**

```sql
-- supabase/migrations/008_daily_kpis.sql
CREATE TABLE IF NOT EXISTS daily_kpis (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          date        NOT NULL,
  contacts      integer     NOT NULL DEFAULT 0,
  calls         integer     NOT NULL DEFAULT 0,
  rdv1          integer     NOT NULL DEFAULT 0,
  rdv2          integer     NOT NULL DEFAULT 0,
  blocks        integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE daily_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_kpis_self"
  ON daily_kpis FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 2 : Appliquer la migration via Supabase Dashboard**

Aller sur https://supabase.com → projet `vqtzcxvmzznbepyvlcut` → SQL Editor → coller et exécuter le SQL ci-dessus.

Vérifier : aucune erreur dans la console.

---

## Task 2 — API `POST /api/today/kpis` (UPSERT daily_kpis)

**Files:**
- Create: `src/app/api/today/kpis/route.ts`

- [ ] **Step 1 : Créer la route API**

```typescript
// src/app/api/today/kpis/route.ts
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { contacts?: number; calls?: number; rdv1?: number; rdv2?: number; blocks?: number }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const { error } = await supabase
    .from('daily_kpis')
    .upsert(
      {
        user_id:  user.id,
        date:     today,
        contacts: body.contacts ?? 0,
        calls:    body.calls    ?? 0,
        rdv1:     body.rdv1    ?? 0,
        rdv2:     body.rdv2    ?? 0,
        blocks:   body.blocks  ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' }
    )

  if (error) return apiError(error.message, 500)
  return apiSuccess({ saved: true })
}
```

- [ ] **Step 2 : Build check**

```powershell
npm run build 2>&1 | Select-Object -Last 10
```

Attendu : aucune erreur TypeScript.

---

## Task 3 — Global stats : lire aussi `daily_kpis`

**Files:**
- Modify: `src/app/api/global/stats/route.ts`

- [ ] **Step 1 : Ajouter la lecture daily_kpis au GET**

Dans `src/app/api/global/stats/route.ts`, après la requête `calling_session_contacts`, ajouter :

```typescript
  // Today manual KPIs
  const todayDate = new Date().toISOString().split('T')[0]
  const { data: dailyRow } = await supabase
    .from('daily_kpis')
    .select('contacts, calls, rdv1, rdv2, blocks')
    .eq('user_id', user.id)
    .eq('date', todayDate)
    .maybeSingle()
```

Puis dans le `return apiSuccess({...})`, enrichir `prospection` :

```typescript
  return apiSuccess({
    tasks: {
      done_today:               tasksDoneToday,
      active:                   tasksActive,
      high_priority_remaining:  tasksHighPriorityRemaining,
      this_week:                tasksThisWeek,
      total:                    tasks.length,
    },
    prospection: {
      contacts_today:       Math.max(contactsToday ?? 0, dailyRow?.contacts ?? 0),
      prospects_this_week:  prospectsThisWeek ?? 0,
      calls_today:          dailyRow?.calls  ?? 0,
      rdv1_today:           dailyRow?.rdv1   ?? 0,
      rdv2_today:           dailyRow?.rdv2   ?? 0,
      blocks_today:         dailyRow?.blocks ?? 0,
    },
  })
```

- [ ] **Step 2 : Build check**

```powershell
npm run build 2>&1 | Select-Object -Last 10
```

---

## Task 4 — Chronomètre persistant dans Today

**Files:**
- Modify: `src/app/(dashboard)/today/page.tsx`

Le timer actuel : `timerSec` (useState 0) + `timerRunning` (useState false). Quand on quitte /today le composant démonte et tout est perdu.

- [ ] **Step 1 : Ajouter les helpers de persistance (avant `export default`)**

Localiser la ligne `const BLOCK_DURATION = 52 * 60` (ligne ~63) et ajouter après :

```typescript
const TIMER_KEY = () => `today_timer_${new Date().toDateString()}`

function loadTimer(): { timerSec: number; running: boolean; startedAt: number } {
  try {
    const s = localStorage.getItem(TIMER_KEY())
    if (s) return JSON.parse(s)
  } catch { /* ignore */ }
  return { timerSec: 0, running: false, startedAt: 0 }
}

function saveTimer(timerSec: number, running: boolean, startedAt: number) {
  try { localStorage.setItem(TIMER_KEY(), JSON.stringify({ timerSec, running, startedAt })) } catch { /* ignore */ }
}
```

- [ ] **Step 2 : Restaurer le timer au montage**

Remplacer le `useEffect` qui lit `blocks_` (ligne ~433) — juste APRÈS le `useEffect` qui charge `blocks_`, ajouter un nouvel `useEffect` :

```typescript
  useEffect(() => {
    const stored = loadTimer()
    if (stored.running && stored.startedAt > 0) {
      const elapsed = Math.floor((Date.now() - stored.startedAt) / 1000)
      const resumeSec = Math.min(stored.timerSec + elapsed, BLOCK_DURATION - 1)
      setTimerSec(resumeSec)
      // Ne pas relancer automatiquement — laisser l'utilisateur reprendre
    } else {
      setTimerSec(stored.timerSec)
    }
  }, [])
```

- [ ] **Step 3 : Sauvegarder le timer à chaque tick**

Dans la fonction `startTimer`, dans le `setInterval`, modifier pour sauvegarder :

Remplacer le corps du `setInterval` callback : après `setTimerSec(s => {`, à l'intérieur, juste avant `return s + 1`, ajouter :

```typescript
          saveTimer(s + 1, true, Date.now() - (s + 1) * 1000)
```

Et dans `pauseTimer`, après `setTimerRunning(false)`, ajouter :

```typescript
    setTimerSec(s => { saveTimer(s, false, 0); return s })
```

Et dans `completeBlock`, après `setTimerSec(0)`, ajouter :

```typescript
    saveTimer(0, false, 0)
```

- [ ] **Step 4 : Build check**

```powershell
npm run build 2>&1 | Select-Object -Last 10
```

---

## Task 5 — Bouton "Terminer la journée" dans Today

**Files:**
- Modify: `src/app/(dashboard)/today/page.tsx`

- [ ] **Step 1 : Ajouter l'état du modal fin de journée**

Dans la section états du composant `TodayPage` (après `celebratedAllRef`), ajouter :

```typescript
  const [showEndDay, setShowEndDay] = useState(false)
  const [endDaySaving, setEndDaySaving] = useState(false)
  const [endDaySaved, setEndDaySaved] = useState(false)
```

- [ ] **Step 2 : Ajouter la fonction de sauvegarde**

Juste avant le `return (` du composant, ajouter :

```typescript
  async function handleEndDay() {
    setEndDaySaving(true)
    try {
      await fetch('/api/today/kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts, calls, rdv1, rdv2, blocks: blocksCompleted }),
      })
      setEndDaySaved(true)
      celebrate('objectif_journee', 'JOURNÉE TERMINÉE !')
    } catch { /* ignore */ }
    finally { setEndDaySaving(false) }
  }
```

- [ ] **Step 3 : Ajouter le bouton dans le header**

Localiser le header du Today (ligne ~663) :
```typescript
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
```

À la fin du header (avant le `</div>` fermant), ajouter le bouton :

```typescript
        <button
          onClick={() => setShowEndDay(true)}
          style={{ fontSize: 8, padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.gold}55`, background: '#1a1400', color: C.gold, cursor: 'pointer', fontWeight: 600, letterSpacing: 0.5 }}
        >
          ✓ Fin de journée
        </button>
```

- [ ] **Step 4 : Ajouter le modal fin de journée**

À la fin du `return (`, avant le `</div>` final, ajouter le modal :

```typescript
      {/* Modal fin de journée */}
      {showEndDay && (
        <div onClick={() => { if (!endDaySaving) setShowEndDay(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '16px 16px 0 0' }} />
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 18, fontWeight: 700, color: C.gold, marginBottom: 20, marginTop: 4 }}>Bilan de journée</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Contacts', value: contacts, target: targets.contacts, color: C.green },
                { label: 'Appels',   value: calls,    target: targets.calls,    color: C.cyan  },
                { label: 'RDV R1',   value: rdv1,     target: targets.rdv1,     color: C.gold  },
                { label: 'RDV R2',   value: rdv2,     target: targets.rdv2,     color: C.gold  },
              ].map(({ label, value, target, color }) => (
                <div key={label} style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: C.textLo, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: value >= target ? color : C.textMid }}>{value}</div>
                  <div style={{ fontSize: 8, color: C.textLo }}>/ {target}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.textMid, marginBottom: 20, textAlign: 'center' }}>
              {blocksCompleted} bloc{blocksCompleted > 1 ? 's' : ''} de travail complété{blocksCompleted > 1 ? 's' : ''}
            </div>
            {endDaySaved ? (
              <div style={{ textAlign: 'center', color: C.green, fontSize: 13, fontWeight: 600 }}>✓ Données sauvegardées</div>
            ) : (
              <button
                onClick={handleEndDay}
                disabled={endDaySaving}
                style={{ width: '100%', padding: '12px 0', borderRadius: 8, border: `1px solid ${C.gold}`, background: `${C.gold}22`, color: C.gold, fontSize: 12, fontWeight: 700, cursor: endDaySaving ? 'not-allowed' : 'pointer', fontFamily: 'Oswald,sans-serif', letterSpacing: 1 }}
              >
                {endDaySaving ? '...' : 'SAUVEGARDER & TERMINER'}
              </button>
            )}
          </div>
        </div>
      )}
```

- [ ] **Step 5 : Build check**

```powershell
npm run build 2>&1 | Select-Object -Last 10
```

---

## Task 6 — TNS : multi-select métiers

**Files:**
- Modify: `src/app/(dashboard)/prospection/tns/page.tsx`

- [ ] **Step 1 : Changer `metier` en tableau**

Ligne ~174 : `const [metier, setMetier] = useState('')`

Remplacer par :

```typescript
  const [metiersSelected, setMetiersSelected] = useState<string[]>([])
```

- [ ] **Step 2 : Adapter `handleSearch` pour boucler sur les métiers**

Remplacer la fonction `handleSearch` (ligne ~247) par :

```typescript
  async function handleSearch() {
    if (metiersSelected.length === 0 || !ville) return
    setSearchLoading(true)
    setSearchError(null)
    setShowResults(false)
    try {
      const allResults = await Promise.all(
        metiersSelected.map(m =>
          fetch('/api/prospection/tns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metier: m, ville, limite: parseInt(limite) || 10 }),
          })
          .then(r => r.json())
          .then(d => (d.success ? (d.data.prospects as SearchResult[]) : []))
          .catch(() => [] as SearchResult[])
        )
      )
      // Fusion + dédoublonnage par téléphone
      const seen = new Set<string>()
      const merged: SearchResult[] = []
      for (const r of allResults.flat()) {
        const key = normPhone(r.telephone)
        if (!key || seen.has(key)) continue
        seen.add(key)
        merged.push(r)
      }
      setSearchResults(merged.map((r, i) => ({ ...r, id: i + 1 })))
      setShowResults(true)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSearchLoading(false)
    }
  }
```

- [ ] **Step 3 : Remplacer le `<select>` métier par des checkboxes**

Localiser le JSX du `<select>` métier (chercher `value={metier}`) et remplacer toute la section par :

```typescript
              {/* Multi-select métiers */}
              <div>
                <div style={{ fontSize: 9, color: C.textLo, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Métier(s) — {metiersSelected.length === 0 ? 'Sélectionner' : `${metiersSelected.length} choisi${metiersSelected.length > 1 ? 's' : ''}`}
                </div>
                <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
                  {METIERS.map(m => {
                    const checked = metiersSelected.includes(m.value)
                    return (
                      <label key={m.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 8px', borderRadius: 5, background: checked ? `${C.indigo}18` : 'transparent', border: `1px solid ${checked ? C.indigo : 'transparent'}` }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setMetiersSelected(prev => checked ? prev.filter(v => v !== m.value) : [...prev, m.value])}
                          style={{ accentColor: C.indigo, width: 12, height: 12 }}
                        />
                        <span style={{ fontSize: 10, color: checked ? C.textHi : C.textMid }}>{m.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
```

- [ ] **Step 4 : Adapter le bouton Rechercher**

Localiser `if (!metier || !ville) return` dans `handleSearch` — c'est déjà remplacé à l'étape 2.

Localiser le bouton "Rechercher" et vérifier que `disabled` utilise bien `metiersSelected.length === 0` :

```typescript
disabled={searchLoading || metiersSelected.length === 0 || !ville}
```

- [ ] **Step 5 : Adapter `exportCSV` et `addAllToProspection`**

Dans `addAllToProspection`, la ligne `tags: [metier]` devient :

```typescript
              tags: metiersSelected,
```

- [ ] **Step 6 : Build check**

```powershell
npm run build 2>&1 | Select-Object -Last 10
```

---

## Task 7 — TNS : remplacer BASE_PROSPECTS par données Supabase

**Files:**
- Modify: `src/app/(dashboard)/prospection/tns/page.tsx`

Les 13 `BASE_PROSPECTS` hardcodés ne correspondent pas à de vrais contacts. On les remplace par les prospects Supabase de source `tns`.

- [ ] **Step 1 : Supprimer `BASE_PROSPECTS` et charger depuis Supabase**

Supprimer le bloc `const BASE_PROSPECTS: Prospect[] = [...]` (lignes 60–74).

Dans `TnsPage`, remplacer `const [prospects, setProspects] = useState<Prospect[]>(BASE_PROSPECTS)` par :

```typescript
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [prospectsLoading, setProspectsLoading] = useState(true)
```

Ajouter un `useEffect` de chargement après le `useEffect` de `contactedPhones` :

```typescript
  useEffect(() => {
    fetch('/api/prospects?source=tns&limit=50')
      .then(r => r.json())
      .then(j => {
        if (j.data?.prospects) {
          setProspects(j.data.prospects.map((p: {
            id: string; full_name: string; profession?: string; city?: string;
            phone?: string; pipeline_stage?: string; lead_score?: number; source?: string;
          }, i: number): Prospect => ({
            id: i + 1,
            initials: p.full_name.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '??',
            nom: p.full_name,
            metier: p.profession ?? '',
            ville: p.city ?? '',
            telephone: p.phone ?? '—',
            status: (p.pipeline_stage === 'converti' ? 'Converti' : p.pipeline_stage === 'perdu' ? 'Perdu' : p.pipeline_stage === 'rdv1' ? 'En cours' : 'Non contacté') as ProspectStatus,
            score: p.lead_score ?? 0.5,
            source: p.source ?? 'tns',
            actions: ['WA', 'seq'] as ('WA' | 'email' | 'SMS' | 'LI' | 'seq')[],
            metierFilter: 'all' as MetierFilter,
          })))
        }
      })
      .catch(() => {})
      .finally(() => setProspectsLoading(false))
  }, [])
```

- [ ] **Step 2 : Vérifier l'API prospects — elle accepte `source` en query param**

Lire `src/app/api/prospects/route.ts` et vérifier qu'il y a un filtre `source`. Si non, ajouter :

```typescript
  const source = searchParams.get('source')
  if (source) query = query.eq('source', source)
```

- [ ] **Step 3 : Afficher un état "Aucun prospect TNS" si la liste est vide**

Dans le JSX de la liste des prospects (section filtrée `filteredProspects`), avant la map, ajouter :

```typescript
{prospectsLoading && <div style={{ fontSize: 10, color: C.textLo, padding: 16 }}>Chargement...</div>}
{!prospectsLoading && filteredProspects.length === 0 && (
  <div style={{ fontSize: 10, color: C.textLo, padding: 16, textAlign: 'center' }}>
    Aucun prospect TNS. Lancez une recherche et ajoutez des contacts.
  </div>
)}
```

- [ ] **Step 4 : Mettre à jour les stats (total, nonContactes, etc.)**

Les `stats` lisent déjà `prospects.length` — rien à changer.

- [ ] **Step 5 : Build check**

```powershell
npm run build 2>&1 | Select-Object -Last 10
```

---

## Task 8 — Séquences depuis ProspectCard (bouton dans la fiche TNS)

**Files:**
- Modify: `src/components/prospects/ProspectCard.tsx`

- [ ] **Step 1 : Ajouter les props nécessaires**

Dans le type `Props`, ajouter :

```typescript
  onStartSequence?: (prospect: ProspectCardData) => void
```

- [ ] **Step 2 : Ajouter le bouton "▶ Séquence" dans les Actions**

Dans la section `{/* Actions */}` (juste avant le bouton FERMER), ajouter :

```typescript
          {onStartSequence && (
            <button
              onClick={() => { onStartSequence(prospect); onClose() }}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: `linear-gradient(90deg,${C.gold}22,${C.surface3})`, border: `1px solid ${C.gold}66`, color: C.gold, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.1em', minWidth: 140 }}
            >
              ▶ SÉQUENCE
            </button>
          )}
```

- [ ] **Step 3 : Brancher dans la page TNS**

Dans `src/app/(dashboard)/prospection/tns/page.tsx`, localiser le `<ProspectCard>` et ajouter :

```typescript
onStartSequence={async (p) => {
  // 1. Ajouter au CRM si pas encore fait
  const res = await fetch('/api/prospects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: p.nom,
      company: p.entreprise ?? '',
      profession: p.metier ?? '',
      city: p.ville ?? '',
      phone: p.telephone ?? '',
      source: 'tns',
    }),
  })
  const json = await res.json()
  const prospectId = json.data?.prospect?.id ?? json.data?.id
  if (!prospectId) return
  // 2. Récupérer le premier template disponible
  const tplRes = await fetch('/api/crm/sequences/templates')
  const tplJson = await tplRes.json()
  const templates = tplJson.data?.templates ?? []
  if (templates.length === 0) {
    alert('Aucun template de séquence. Créez-en un dans Paramètres → Séquences.')
    return
  }
  // 3. Démarrer la séquence avec le premier template
  await fetch('/api/crm/sequences/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prospect_id: prospectId, template_id: templates[0].id }),
  })
  alert(`Séquence "${templates[0].name}" démarrée pour ${p.nom}`)
}}
```

- [ ] **Step 4 : Message d'aide dans le CRM si 0 templates**

Dans `src/app/(dashboard)/crm/page.tsx`, dans le `ProspectDrawer`, localiser le message `Aucun template disponible` et enrichir :

```typescript
{seqTemplates.length === 0
  ? <option value="">Aucun template — créer dans Paramètres</option>
  : seqTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
}
```

Et afficher un lien sous le select quand vide :

```typescript
{seqTemplates.length === 0 && (
  <div style={{ fontSize: 9, color: C.textLo, marginTop: 6 }}>
    → <a href="/settings" style={{ color: C.indigo, textDecoration: 'none' }}>Paramètres → Séquences</a> pour créer un template
  </div>
)}
```

- [ ] **Step 5 : Build + déploiement**

```powershell
npm run build 2>&1 | Select-Object -Last 15
.\deploy-cloudrun.ps1 -ProjectId integration-make-365608 2>&1 | Select-Object -Last 15
```

---

## Self-Review

**Spec coverage :**
1. ✅ TNS nombres toujours pareils → Task 6 (multi-métiers) + Task 7 (BASE_PROSPECTS → Supabase)
2. ✅ Liaison compteurs Today↔Global → Task 1 (migration) + Task 2 (API) + Task 3 (global stats lit daily_kpis) + Task 5 (fin de journée écrit)
3. ✅ Séquences depuis cartes → Task 8 (bouton ProspectCard TNS + lien settings CRM)
4. ✅ Multi-select métiers TNS → Task 6
5. ✅ Bouton "fin de journée" → Task 5
6. ✅ Chronomètre persistant → Task 4

**Dépendances :**
- Task 3 (global stats) dépend de Task 1 (migration) et Task 2 (API)
- Task 5 (fin de journée) dépend de Task 2 (API)
- Toutes les autres tasks sont indépendantes

**Ordre d'exécution recommandé :** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
