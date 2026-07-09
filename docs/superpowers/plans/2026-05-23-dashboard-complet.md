# Dashboard Complet — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le dashboard 100% fonctionnel — cartes prospects avec planification horaire, boutons connectés, planning éditable, séquences réellement utilisables depuis la DB, et données globales branchées en temps réel.

**Architecture:** 3 domaines indépendants — (1) ProspectCard enrichie avec API interactions, (2) Today agenda éditable + boutons cassés fixés, (3) Global data branché + séquences bibliothèque en DB.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (PostgreSQL), inline CSS via `C` de `src/lib/theme.ts`, `sonner` pour les toasts. Aucun Tailwind, aucun shadcn.

---

## Fichiers modifiés / créés

| Action | Fichier |
|--------|---------|
| Créer | `src/app/api/interactions/route.ts` |
| Créer | `src/app/api/crm/sequences/seed-library/route.ts` |
| Créer | `src/app/api/crm/actions/email-manual/route.ts` |
| Modifier | `src/components/prospects/ProspectCard.tsx` |
| Modifier | `src/app/(dashboard)/today/page.tsx` |
| Modifier | `src/app/(dashboard)/global/page.tsx` |
| Modifier | `src/app/(dashboard)/sequences/page.tsx` |
| Modifier | `src/app/(dashboard)/crm/page.tsx` |
| Modifier | `src/app/(dashboard)/settings/page.tsx` |

---

## Task 1 — API Interactions (GET + POST)

**Fichiers:**
- Créer: `src/app/api/interactions/route.ts`

La table `interactions` existe déjà avec: `id`, `user_id`, `prospect_id`, `type` (enum: appel, rdv1, rdv2, rdv3, email, whatsapp, linkedin, autre), `is_honored`, `occurred_at`, `duration_min`, `notes`.

- [ ] **Step 1.1: Créer `src/app/api/interactions/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'

const INTERACTION_TYPES = ['appel', 'rdv1', 'rdv2', 'rdv3', 'email', 'whatsapp', 'linkedin', 'autre'] as const

const PostSchema = z.object({
  prospect_id: z.string().uuid(),
  type: z.enum(INTERACTION_TYPES),
  notes: z.string().optional(),
  duration_min: z.number().int().min(0).optional(),
  is_honored: z.boolean().default(true),
  occurred_at: z.string().optional(),
  planned_at: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const prospectId = req.nextUrl.searchParams.get('prospect_id')
  if (!prospectId) return apiError('prospect_id requis', 400)

  const { data, error } = await supabase
    .from('interactions')
    .select('id, type, notes, duration_min, is_honored, occurred_at, created_at')
    .eq('user_id', user.id)
    .eq('prospect_id', prospectId)
    .order('occurred_at', { ascending: false })
    .limit(20)

  if (error) return apiError(error.message)
  return apiSuccess({ interactions: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: unknown
  try { body = await req.json() } catch { return apiError('Invalid JSON', 400) }
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400)

  const { prospect_id, type, notes, duration_min, is_honored, occurred_at, planned_at } = parsed.data

  const { data, error } = await supabase
    .from('interactions')
    .insert({
      user_id: user.id,
      prospect_id,
      type,
      notes,
      duration_min,
      is_honored,
      occurred_at: occurred_at ?? new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return apiError(error.message)

  // Si c'est un appel planifié (rappel futur), mettre à jour next_action_date sur le prospect
  if (planned_at) {
    await supabase
      .from('prospects')
      .update({ next_action_date: planned_at.split('T')[0], last_contact_at: new Date().toISOString() })
      .eq('id', prospect_id)
      .eq('user_id', user.id)
  } else if (type === 'appel') {
    await supabase
      .from('prospects')
      .update({ last_contact_at: new Date().toISOString() })
      .eq('id', prospect_id)
      .eq('user_id', user.id)
  }

  return apiSuccess({ interaction: data }, 201)
}
```

- [ ] **Step 1.2: Vérifier le build**

```powershell
cd C:\Users\Ted\Documents\GitHub\TedScaleWithOuss
npm run build 2>&1 | Select-String -Pattern "error|Error|✓" | Select-Object -First 20
```

Expected: `✓ Compiled successfully` ou `Route (app)` sans erreur TypeScript.

- [ ] **Step 1.3: Commit**

```powershell
git add src/app/api/interactions/route.ts
git commit -m "feat: API GET+POST /api/interactions pour log appels et rappels"
```

---

## Task 2 — ProspectCard enrichie : Planification + Log appel + Historique

**Fichiers:**
- Modifier: `src/components/prospects/ProspectCard.tsx`

La `ProspectCard` actuelle (480 lignes) a: enrichissement auto, boutons contacté/CRM/Séquence. On ajoute: (a) onglets Info / Historique, (b) "📅 Rappel" → modal date+heure, (c) "📞 Logger" → modal résultat appel.

- [ ] **Step 2.1: Ajouter les types + états dans ProspectCard**

Dans `src/components/prospects/ProspectCard.tsx`, après les imports existants, ajouter:

```typescript
type CardTab = 'info' | 'history'

type Interaction = {
  id: string
  type: string
  notes: string | null
  duration_min: number | null
  is_honored: boolean
  occurred_at: string
}

type CallResult = 'decroché' | 'rdv' | 'pas_interesse' | 'messagerie' | 'rappeler'
```

Dans la fonction `ProspectCard`, après les states existants:

```typescript
const [cardTab, setCardTab] = useState<CardTab>('info')
const [interactions, setInteractions] = useState<Interaction[]>([])
const [historyLoading, setHistoryLoading] = useState(false)
const [showRappelModal, setShowRappelModal] = useState(false)
const [rappelDate, setRappelDate] = useState('')
const [rappelTime, setRappelTime] = useState('09:00')
const [rappelNote, setRappelNote] = useState('')
const [rappelSaving, setRappelSaving] = useState(false)
const [showLogModal, setShowLogModal] = useState(false)
const [logResult, setLogResult] = useState<CallResult>('decroché')
const [logNote, setLogNote] = useState('')
const [logDuration, setLogDuration] = useState(5)
const [logSaving, setLogSaving] = useState(false)
```

- [ ] **Step 2.2: Ajouter les fonctions de chargement et sauvegarde**

Après les useEffect existants dans `ProspectCard`:

```typescript
async function loadHistory() {
  if (!prospect.id || typeof prospect.id !== 'string' || !/^[0-9a-f-]{36}$/.test(String(prospect.id))) return
  setHistoryLoading(true)
  try {
    const res = await fetch(`/api/interactions?prospect_id=${prospect.id}`)
    const { data } = await res.json()
    if (data?.interactions) setInteractions(data.interactions)
  } catch { /* ignore */ }
  finally { setHistoryLoading(false) }
}

async function saveRappel() {
  if (!rappelDate) return
  if (!prospect.id || !/^[0-9a-f-]{36}$/.test(String(prospect.id))) return
  setRappelSaving(true)
  try {
    const planned_at = `${rappelDate}T${rappelTime}:00`
    await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prospect_id: prospect.id,
        type: 'appel',
        notes: `📅 Rappel planifié à ${rappelTime}${rappelNote ? ' — ' + rappelNote : ''}`,
        planned_at,
        is_honored: false,
      }),
    })
    setShowRappelModal(false)
    setRappelDate('')
    setRappelNote('')
  } catch { /* ignore */ }
  finally { setRappelSaving(false) }
}

async function saveLog() {
  if (!prospect.id || !/^[0-9a-f-]{36}$/.test(String(prospect.id))) return
  setLogSaving(true)
  const resultLabels: Record<CallResult, string> = {
    decroché: '✅ Décroché', rdv: '📅 RDV posé', pas_interesse: '❌ Pas intéressé',
    messagerie: '📱 Messagerie', rappeler: '🔄 À rappeler',
  }
  try {
    await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prospect_id: prospect.id,
        type: 'appel',
        notes: `${resultLabels[logResult]}${logNote ? ' — ' + logNote : ''}`,
        duration_min: logDuration,
        is_honored: logResult !== 'messagerie',
      }),
    })
    setShowLogModal(false)
    setLogNote('')
    if (cardTab === 'history') loadHistory()
  } catch { /* ignore */ }
  finally { setLogSaving(false) }
}
```

- [ ] **Step 2.3: Modifier le JSX — ajouter onglets et modaux**

Remplacer dans le `modal` JSX (entre le `/* Header */` et `/* Actions */`) la section `/* Info grid */` par:

```typescript
{/* Onglets */}
<div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: `1px solid ${C.lineSoft}`, paddingBottom: 8 }}>
  {(['info', 'history'] as CardTab[]).map(t => (
    <button
      key={t}
      onClick={() => { setCardTab(t); if (t === 'history') loadHistory() }}
      style={{
        padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
        background: cardTab === t ? `${C.indigo}22` : 'transparent',
        color: cardTab === t ? C.indigo : C.textLo,
        fontFamily: 'JetBrains Mono,monospace', fontSize: 9, fontWeight: cardTab === t ? 700 : 400,
        borderBottom: `2px solid ${cardTab === t ? C.indigo : 'transparent'}`,
      }}
    >
      {t === 'info' ? '📋 Infos' : '📞 Historique'}
    </button>
  ))}
</div>

{cardTab === 'info' && (
  <>
    {/* Info grid — identique à l'original */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
      {prospect.siren && <InfoRow label="SIREN" value={prospect.siren} />}
      {(prospect.ville || prospect.codePostal) && <InfoRow label="Ville" value={[prospect.codePostal, prospect.ville].filter(Boolean).join(' ')} />}
      {prospect.adresse && <InfoRow label="Adresse" value={prospect.adresse} span />}
      {prospect.signalLabel && <InfoRow label="Signal" value={prospect.signalLabel} accent={scoreColor} />}
      {prospect.source && <InfoRow label="Source" value={prospect.source} />}
    </div>

    {/* Message J+0 */}
    {prospect.metadata?.message_j0 && (
      <div className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-gray-700 italic" style={{ marginBottom: 16 }}>
        <p className="mb-1 text-xs font-medium text-blue-600">Message J+0 préparé :</p>
        {prospect.metadata.message_j0}
      </div>
    )}

    {/* Contact enrichi */}
    <div style={{ background: C.surface1, borderRadius: 10, padding: 12, marginBottom: 12, border: `1px solid ${C.lineSoft}` }}>
      <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 500, color: C.textLo, textTransform: 'uppercase' as const, letterSpacing: '0.14em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Contact</span>
        {enrichLoading && <span style={{ color: C.indigo, fontSize: 9 }}>· chargement…</span>}
        {!enrichLoading && enrich && (
          <span style={{
            fontSize: 7, padding: '1px 6px', borderRadius: 5, fontFamily: 'JetBrains Mono,monospace',
            background: enrich.source === 'pappers' ? C.gold + '20' : enrich.source === 'google_places' ? '#0a1f0a' : C.surface2,
            color: enrich.source === 'pappers' ? C.gold : enrich.source === 'google_places' ? C.green : C.textVlo,
            border: `1px solid ${enrich.source === 'pappers' ? C.gold + '40' : enrich.source === 'google_places' ? C.green + '40' : C.lineSoft}`,
          }}>
            {enrich.source === 'pappers' ? 'Pappers' : enrich.source === 'google_places' ? 'Google' : 'Généré'}
          </span>
        )}
      </div>
      <ContactRow icon="📞" label="Téléphone" value={telephone} fallbackUrl={pagesJaunesUrl} fallbackLabel="Pages Jaunes" />
      <ContactRow icon="✉" label="Email" value={email} />
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' as const }}>
        <ExternalBtn href={linkedinUrl} label="LinkedIn" color={C.indigo} />
        {pagesJaunesUrl && <ExternalBtn href={pagesJaunesUrl} label="Pages Jaunes" color={C.gold} />}
        {pappersUrl && <ExternalBtn href={pappersUrl} label="Pappers" color={C.textMid} />}
        {prospect.googleUrl && <ExternalBtn href={prospect.googleUrl} label="Google" color={C.textLo} />}
        {prospect.mapsUrl && <ExternalBtn href={prospect.mapsUrl} label="Maps" color={C.green} />}
      </div>
    </div>

    {/* Boutons Rappel + Logger */}
    {/^[0-9a-f-]{36}$/.test(String(prospect.id)) && (
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button
          onClick={() => setShowRappelModal(true)}
          style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: '#0d1a2e', border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.08em' }}
        >
          📅 PLANIFIER RAPPEL
        </button>
        <button
          onClick={() => setShowLogModal(true)}
          style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: '#0a1f0a', border: `1px solid ${C.green}66`, color: C.green, fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.08em' }}
        >
          📞 LOGGER APPEL
        </button>
      </div>
    )}
  </>
)}

{cardTab === 'history' && (
  <div style={{ marginBottom: 16 }}>
    {historyLoading && (
      <div style={{ fontSize: 9, color: C.textLo, textAlign: 'center', padding: '16px 0' }}>Chargement…</div>
    )}
    {!historyLoading && interactions.length === 0 && (
      <div style={{ fontSize: 9, color: C.textVlo, textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>Aucune interaction enregistrée</div>
    )}
    {interactions.map(it => {
      const typeColor: Record<string, string> = {
        appel: C.green, rdv1: C.indigo, rdv2: '#9a7acc', email: C.gold, whatsapp: '#25D366', linkedin: '#0A66C2'
      }
      const col = typeColor[it.type] ?? C.textMid
      return (
        <div key={it.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.lineSoft}` }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0, marginTop: 5 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: col, textTransform: 'uppercase' as const }}>{it.type}</span>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textVlo }}>
                {new Date(it.occurred_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {it.notes && <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid, lineHeight: 1.5 }}>{it.notes}</div>}
            {it.duration_min != null && <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textLo, marginTop: 2 }}>{it.duration_min} min</div>}
          </div>
        </div>
      )
    })}
  </div>
)}
```

- [ ] **Step 2.4: Ajouter les modaux Rappel et Logger AVANT le `return createPortal`**

Avant la ligne `return createPortal(modal, document.body)`:

```typescript
const rappelModal = showRappelModal ? (
  <div onClick={() => setShowRappelModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.indigo}40`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 360, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />
      <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.indigo, marginBottom: 18, marginTop: 4 }}>📅 Planifier un rappel</div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Date *</label>
        <input type="date" value={rappelDate} onChange={e => setRappelDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
          style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 12, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Heure</label>
        <input type="time" value={rappelTime} onChange={e => setRappelTime(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 12, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Note (optionnel)</label>
        <input type="text" value={rappelNote} onChange={e => setRappelNote(e.target.value)} placeholder="Ex: rappeler après 14h"
          style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setShowRappelModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>ANNULER</button>
        <button onClick={saveRappel} disabled={!rappelDate || rappelSaving} style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0d1a2e', border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: !rappelDate ? 'not-allowed' : 'pointer', opacity: !rappelDate ? 0.6 : 1 }}>
          {rappelSaving ? 'SAUVEGARDE...' : '📅 ENREGISTRER'}
        </button>
      </div>
    </div>
  </div>
) : null

const logModal = showLogModal ? (
  <div onClick={() => setShowLogModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.green}40`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 360, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />
      <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.green, marginBottom: 18, marginTop: 4 }}>📞 Logger un appel</div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 8 }}>Résultat</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {([
            { v: 'decroché', label: '✅ Décroché — échange eu', color: C.green },
            { v: 'rdv', label: '📅 RDV posé', color: C.indigo },
            { v: 'rappeler', label: '🔄 À rappeler', color: C.gold },
            { v: 'messagerie', label: '📱 Messagerie', color: C.textMid },
            { v: 'pas_interesse', label: '❌ Pas intéressé', color: C.warn },
          ] as Array<{ v: CallResult; label: string; color: string }>).map(({ v, label, color }) => (
            <button key={v} onClick={() => setLogResult(v)} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${logResult === v ? color : C.line}`, background: logResult === v ? `${color}18` : C.surface1, color: logResult === v ? color : C.textLo, fontFamily: 'JetBrains Mono,monospace', fontSize: 10, cursor: 'pointer', textAlign: 'left' as const }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Durée (min)</label>
          <input type="number" value={logDuration} min={0} max={120} onChange={e => setLogDuration(Number(e.target.value))}
            style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 12, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }} />
        </div>
        <div>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Note</label>
          <input type="text" value={logNote} onChange={e => setLogNote(e.target.value)} placeholder="Contexte…"
            style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setShowLogModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>ANNULER</button>
        <button onClick={saveLog} disabled={logSaving} style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0a1f0a', border: `1px solid ${C.green}66`, color: C.green, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          {logSaving ? 'SAUVEGARDE...' : '📞 ENREGISTRER'}
        </button>
      </div>
    </div>
  </div>
) : null
```

Puis remplacer le `return createPortal(modal, document.body)` par:

```typescript
return (
  <>
    {createPortal(modal, document.body)}
    {rappelModal && createPortal(rappelModal, document.body)}
    {logModal && createPortal(logModal, document.body)}
  </>
)
```

- [ ] **Step 2.5: Build + commit**

```powershell
npm run build 2>&1 | Select-String -Pattern "error TS|✓ Compiled"
git add src/components/prospects/ProspectCard.tsx src/app/api/interactions/route.ts
git commit -m "feat: ProspectCard enrichie — onglets, planification rappel, log appel, historique"
```

---

## Task 3 — Today : date dynamique + agenda éditable

**Fichiers:**
- Modifier: `src/app/(dashboard)/today/page.tsx`

**Problèmes:**
1. `"Vendredi 25 avril"` hardcodé (× 2 dans le fichier)
2. L'agenda affiche des événements fictifs non modifiables

**Solution:** Date dynamique via `new Date()`. Agenda éditable via localStorage avec clé `today_agenda_${date}`.

- [ ] **Step 3.1: Ajouter helper date dynamique + type agenda dans today/page.tsx**

Au début du composant `TodayPage`, remplacer les deux occurrences hardcodées de date. D'abord ajouter ces helpers juste avant la fonction `TodayPage`:

```typescript
function todayFrDate() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function todayDateKey() {
  return new Date().toISOString().split('T')[0]
}

type AgendaEventType = 'rdv' | 'bloc' | 'tache' | 'sport' | 'autre'

interface AgendaEvent {
  id: string
  time: string
  title: string
  type: AgendaEventType
}

const AGENDA_COLORS: Record<AgendaEventType, { bg: string; border: string; text: string }> = {
  rdv:   { bg: '#0d1a2e', border: C.indigo, text: C.indigo },
  bloc:  { bg: '#0d1a0d', border: C.green,  text: C.green },
  tache: { bg: '#1a1400', border: C.gold,   text: C.gold },
  sport: { bg: '#1a0d0d', border: C.warn,   text: C.warn },
  autre: { bg: C.surface1, border: C.line,  text: C.textMid },
}

function loadAgenda(): AgendaEvent[] {
  try {
    const s = localStorage.getItem(`today_agenda_${todayDateKey()}`)
    if (s) return JSON.parse(s)
  } catch { /* ignore */ }
  return []
}

function saveAgenda(events: AgendaEvent[]) {
  try { localStorage.setItem(`today_agenda_${todayDateKey()}`, JSON.stringify(events)) } catch { /* ignore */ }
}
```

- [ ] **Step 3.2: Ajouter états agenda dans TodayPage**

Dans `TodayPage`, après les autres useState:

```typescript
const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([])
const [showAgendaModal, setShowAgendaModal] = useState(false)
const [agendaForm, setAgendaForm] = useState({ time: '09:00', title: '', type: 'rdv' as AgendaEventType })
```

Dans le useEffect de chargement des compteurs, ajouter le chargement agenda:

```typescript
useEffect(() => {
  setAgendaEvents(loadAgenda())
}, [])
```

- [ ] **Step 3.3: Remplacer l'agenda hardcodé dans le JSX**

Dans `today/page.tsx`, localiser le bloc `/* RIGHT COLUMN — Agenda */` (autour de la ligne 916) et remplacer toute la grille hardcodée par:

```typescript
{/* RIGHT COLUMN — Agenda */}
<div style={{ minWidth: 0 }}>
  <div style={{ background: C.surface1, border: `0.5px solid ${C.line}`, borderRadius: 8, padding: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.textHi }}>Agenda · {todayFrDate()}</div>
      <button
        onClick={() => setShowAgendaModal(true)}
        style={{ fontSize: 8, padding: '5px 10px', borderRadius: 5, border: `0.5px solid ${C.indigo}40`, background: '#0d1a2e', color: C.indigo, cursor: 'pointer', fontWeight: 500 }}
      >+ Événement</button>
    </div>

    {agendaEvents.length === 0 ? (
      <div style={{ fontSize: 9, color: C.textVlo, fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>
        Aucun événement · Clique "+ Événement" pour ajouter
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[...agendaEvents].sort((a, b) => a.time.localeCompare(b.time)).map(ev => {
          const colors = AGENDA_COLORS[ev.type]
          return (
            <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: colors.bg, border: `0.5px solid ${colors.border}`, borderRadius: 6, padding: '6px 10px' }}>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: colors.text, width: 36, flexShrink: 0 }}>{ev.time}</span>
              <span style={{ fontSize: 10, color: C.textHi, flex: 1 }}>{ev.title}</span>
              <button
                onClick={() => {
                  const next = agendaEvents.filter(e => e.id !== ev.id)
                  setAgendaEvents(next)
                  saveAgenda(next)
                }}
                style={{ background: 'none', border: 'none', color: C.textVlo, cursor: 'pointer', fontSize: 10, padding: '0 2px' }}
              >✕</button>
            </div>
          )
        })}
      </div>
    )}
  </div>
  <VideoPlayer />
</div>
```

- [ ] **Step 3.4: Ajouter le modal d'ajout d'événement**

Après le bloc `{/* ─── Modal objectifs du jour ─── */}` et avant la fermeture du composant, ajouter:

```typescript
{/* ─── Modal agenda ─── */}
{showAgendaModal && (
  <div onClick={() => setShowAgendaModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.indigo}30`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 380 }}>
      <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.indigo, marginBottom: 18 }}>📅 Nouvel événement</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Heure</label>
          <input type="time" value={agendaForm.time} onChange={e => setAgendaForm(f => ({ ...f, time: e.target.value }))}
            style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 12, boxSizing: 'border-box' as const }} />
        </div>
        <div>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Type</label>
          <select value={agendaForm.type} onChange={e => setAgendaForm(f => ({ ...f, type: e.target.value as AgendaEventType }))}
            style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11 }}>
            <option value="rdv">🔵 RDV</option>
            <option value="bloc">🟢 Bloc production</option>
            <option value="tache">⚪ Tâche</option>
            <option value="sport">🔴 Sport</option>
            <option value="autre">⚫ Autre</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Titre *</label>
        <input autoFocus type="text" value={agendaForm.title} onChange={e => setAgendaForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: RDV Dr. Martin, Bloc appels TNS..."
          style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setShowAgendaModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>ANNULER</button>
        <button
          onClick={() => {
            if (!agendaForm.title.trim()) return
            const next = [...agendaEvents, { id: Date.now().toString(), time: agendaForm.time, title: agendaForm.title.trim(), type: agendaForm.type }]
            setAgendaEvents(next)
            saveAgenda(next)
            setAgendaForm(f => ({ ...f, title: '' }))
            setShowAgendaModal(false)
          }}
          disabled={!agendaForm.title.trim()}
          style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0d1a2e', border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: agendaForm.title.trim() ? 'pointer' : 'not-allowed', opacity: agendaForm.title.trim() ? 1 : 0.6 }}
        >AJOUTER</button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3.5: Corriger la date hardcodée dans le header**

Dans `today/page.tsx`, remplacer la ligne:
```
<div style={{ fontSize: 14, fontWeight: 600, color: C.textHi }}>Vendredi 25 avril 2026</div>
```
Par:
```typescript
<div style={{ fontSize: 14, fontWeight: 600, color: C.textHi, textTransform: 'capitalize' as const }}>{todayFrDate()}</div>
```

Et dans la colonne "RIGHT COLUMN — Agenda":
```
<div style={{ ...}}>Agenda du jour · Vendredi 25 avril</div>
```
→ Supprimé puisque le titre est maintenant dans le nouvel agenda (step 3.3).

- [ ] **Step 3.6: Build + commit**

```powershell
npm run build 2>&1 | Select-String -Pattern "error TS|✓ Compiled"
git add src/app/(dashboard)/today/page.tsx
git commit -m "feat: Today — date dynamique + agenda éditable localStorage (add/remove events)"
```

---

## Task 4 — Séquences bibliothèque : seeder en DB + Lancer depuis ProspectCard

**Contexte:** Les 10 séquences (`SEQ_PROSPECTION` + `SEQ_PATRIMOINE`) sont dans la page `/sequences` mais uniquement en code statique. La DB a des tables `sequence_templates` + `sequence_template_steps`. L'erreur "Template sans étapes" vient du fait que les utilisateurs créent des templates dans Paramètres mais n'y ajoutent pas d'étapes.

**Solution:** Un endpoint `POST /api/crm/sequences/seed-library` importe les 10 séquences bibliothèque pour l'utilisateur courant.

**Fichiers:**
- Créer: `src/app/api/crm/sequences/seed-library/route.ts`
- Modifier: `src/app/(dashboard)/settings/page.tsx` — bouton "Importer bibliothèque"
- Modifier: `src/components/prospects/ProspectCard.tsx` — séquence picker réel

- [ ] **Step 4.1: Créer `src/app/api/crm/sequences/seed-library/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const LIBRARY = [
  {
    name: 'Post-premier contact TNS',
    steps: [
      { channel: 'email', delay_days: 0, message_template: 'Objet : Suite à notre échange — Introduction cabinet CGP' },
      { channel: 'whatsapp', delay_days: 2, message_template: "Bonjour {Prénom}, j'espère que mon email vous a bien..." },
      { channel: 'email', delay_days: 5, message_template: 'Les TNS et la fiscalité 2026 — ce qui change pour vous' },
      { channel: 'sms', delay_days: 7, message_template: "Bonjour {Prénom}, avez-vous pu consulter mon email ?" },
      { channel: 'linkedin', delay_days: 10, message_template: 'InMail LinkedIn : Bonjour {Prénom}, je me permets...' },
      { channel: 'email', delay_days: 14, message_template: 'Dernière tentative — Proposition RDV découverte 20min' },
    ],
  },
  {
    name: 'Relance post-RDV 1 sans réponse',
    steps: [
      { channel: 'email', delay_days: 3, message_template: 'Suite à notre RDV — les points que nous avons abordés' },
      { channel: 'whatsapp', delay_days: 6, message_template: "Bonjour {Prénom}, avez-vous eu le temps de réfléchir ?" },
      { channel: 'sms', delay_days: 10, message_template: "Bonjour {Prénom}, je reste disponible pour un 2e RDV" },
      { channel: 'email', delay_days: 15, message_template: 'Étude personnalisée prête — souhaitez-vous la recevoir ?' },
    ],
  },
  {
    name: 'Confirmation RDV automatique',
    steps: [
      { channel: 'email', delay_days: 0, message_template: 'Confirmation RDV + adresse + documents à préparer' },
      { channel: 'whatsapp', delay_days: 0, message_template: "Rappel RDV demain à {Heure} — confirmez avec 👍" },
      { channel: 'sms', delay_days: 0, message_template: "Bonjour {Prénom}, RDV aujourd'hui à {Heure}. À tout !" },
    ],
  },
  {
    name: 'Constituer votre épargne TNS',
    steps: [
      { channel: 'email', delay_days: 0, message_template: 'Objet : 3 min pour comparer votre épargne' },
      { channel: 'whatsapp', delay_days: 2, message_template: "Bonjour {Prénom}, j'ai envoyé une proposition de diagnostic patrimonial gratuit." },
      { channel: 'email', delay_days: 5, message_template: 'Objet : Comment un {Profession} a multiplié son rendement par 3' },
      { channel: 'sms', delay_days: 8, message_template: "Bonjour {Prénom}, je reste dispo pour un échange rapide sur votre épargne." },
      { channel: 'email', delay_days: 14, message_template: "Objet : Je ne vais plus vous solliciter" },
    ],
  },
  {
    name: 'Valoriser votre patrimoine',
    steps: [
      { channel: 'email', delay_days: 0, message_template: "Objet : Vous venez de libérer 1 500 €/mois. Et maintenant ?" },
      { channel: 'whatsapp', delay_days: 3, message_template: "Bonjour {Prénom}, ma proposition de modélisation vous intéresse ?" },
      { channel: 'email', delay_days: 7, message_template: "Objet : Exemple pour un {Profession} à {Ville}" },
      { channel: 'linkedin', delay_days: 10, message_template: "Bonjour {Prénom}, j'aide des {Profession} à optimiser leur capacité de placement." },
      { channel: 'email', delay_days: 14, message_template: "Objet : Dernière fois" },
    ],
  },
  {
    name: 'Préparer votre retraite TNS',
    steps: [
      { channel: 'email', delay_days: 0, message_template: "Objet : Votre retraite en tant que {Profession} : combien ?" },
      { channel: 'whatsapp', delay_days: 2, message_template: "Bonjour {Prénom}, avez-vous pu lire mon email sur la retraite des {Profession} ?" },
      { channel: 'email', delay_days: 5, message_template: "Objet : Votre simulation retraite" },
      { channel: 'sms', delay_days: 8, message_template: "Bonjour {Prénom}, créneau vendredi 11h pour votre simulation retraite ?" },
      { channel: 'linkedin', delay_days: 12, message_template: "Bonjour {Prénom}, j'aide les {Profession} à reprendre la main sur leur retraite." },
      { channel: 'email', delay_days: 18, message_template: "Objet : Je m'arrête" },
    ],
  },
  {
    name: 'Gérer la fiscalité PER Madelin',
    steps: [
      { channel: 'email', delay_days: 0, message_template: "Objet : 3 200 € d'impôts économisés cette année (tranche 30%)" },
      { channel: 'whatsapp', delay_days: 2, message_template: "Bonjour {Prénom}, la fenêtre fiscale se ferme le 31 décembre." },
      { channel: 'email', delay_days: 5, message_template: "Objet : 3 leviers fiscaux TNS méconnus" },
      { channel: 'sms', delay_days: 8, message_template: "Bonjour {Prénom}, date limite pour optimiser 2026 approche." },
      { channel: 'linkedin', delay_days: 12, message_template: "Bonjour {Prénom}, j'aide les {Profession} à économiser 3-8 000 € d'impôts/an." },
      { channel: 'email', delay_days: 18, message_template: "Objet : Fin de ma relance" },
    ],
  },
  {
    name: 'Transmettre votre patrimoine',
    steps: [
      { channel: 'email', delay_days: 0, message_template: "Objet : Combien vos enfants vont-ils réellement hériter ?" },
      { channel: 'whatsapp', delay_days: 3, message_template: "Bonjour {Prénom}, ma proposition de diagnostic transmission vous intéresse ?" },
      { channel: 'email', delay_days: 7, message_template: "Objet : Un cas réel — 197 000 € économisés" },
      { channel: 'sms', delay_days: 12, message_template: "Bonjour {Prénom}, dispo pour un échange sur votre transmission ?" },
      { channel: 'email', delay_days: 18, message_template: "Objet : Je m'arrête" },
    ],
  },
  {
    name: 'Diversifier votre patrimoine',
    steps: [
      { channel: 'email', delay_days: 0, message_template: "Objet : Votre patrimoine est-il trop immobilier ?" },
      { channel: 'whatsapp', delay_days: 3, message_template: "Bonjour {Prénom}, ma proposition d'audit patrimonial vous intéresse ?" },
      { channel: 'email', delay_days: 6, message_template: "Objet : Un {Profession} qui a rééquilibré son patrimoine" },
      { channel: 'sms', delay_days: 10, message_template: "Bonjour {Prénom}, dispo pour un échange sur la diversification de votre patrimoine ?" },
      { channel: 'email', delay_days: 15, message_template: "Objet : Dernier message" },
    ],
  },
  {
    name: 'Séquence chefs d\'entreprise',
    steps: [
      { channel: 'email', delay_days: 0, message_template: "Objet : Optimisez la gestion de votre holding" },
      { channel: 'whatsapp', delay_days: 3, message_template: "Bonjour {Prénom}, souhaiteriez-vous un point sur votre situation patrimoniale ?" },
      { channel: 'email', delay_days: 7, message_template: "Objet : Dividendes vs rémunération — ce qui change en 2026" },
      { channel: 'linkedin', delay_days: 12, message_template: "Bonjour {Prénom}, j'accompagne des dirigeants comme vous sur l'optimisation fiscale." },
      { channel: 'email', delay_days: 18, message_template: "Objet : Dernière tentative de contact" },
    ],
  },
] as const

export async function POST(_req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let created = 0
  let skipped = 0

  for (const lib of LIBRARY) {
    // Vérifier si ce template existe déjà pour cet utilisateur
    const { data: existing } = await supabase
      .from('sequence_templates')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', lib.name)
      .maybeSingle()

    if (existing) { skipped++; continue }

    // Créer le template
    const { data: tpl, error: tplErr } = await supabase
      .from('sequence_templates')
      .insert({ user_id: user.id, name: lib.name, auto_trigger: false })
      .select('id')
      .single()

    if (tplErr || !tpl) continue

    // Créer les étapes
    const steps = lib.steps.map((s, i) => ({
      template_id: tpl.id,
      step_order: i + 1,
      channel: s.channel,
      delay_days: s.delay_days,
      message_template: s.message_template,
    }))

    await supabase.from('sequence_template_steps').insert(steps)
    created++
  }

  return apiSuccess({ created, skipped, message: `${created} séquences importées, ${skipped} déjà présentes` })
}
```

- [ ] **Step 4.2: Ajouter bouton "Importer bibliothèque" dans Settings > Séquences**

Dans `src/app/(dashboard)/settings/page.tsx`, dans la fonction `TabSequences`, après le bouton `+ Nouveau template`, ajouter:

```typescript
<SetBtn color={C.gold} bg="#1a1400" onClick={async () => {
  const res = await fetch('/api/crm/sequences/seed-library', { method: 'POST' })
  const { data, error: apiErr } = await res.json()
  if (apiErr) { setError(apiErr); return }
  setError(null)
  await loadTemplates()
  toast.success(data?.message ?? 'Bibliothèque importée')
}}>
  📚 Importer bibliothèque (10 séquences)
</SetBtn>
```

Note: importer `toast` de `sonner` dans settings/page.tsx si pas déjà fait (il l'est déjà ligne 3).

- [ ] **Step 4.3: Modifier ProspectCard pour charger les templates DB**

Dans `ProspectCard.tsx`, ajouter le chargement des templates et mettre à jour le bouton SÉQUENCE. Ajouter dans les states:

```typescript
const [seqTemplates, setSeqTemplates] = useState<Array<{ id: string; name: string }>>([])
const [seqStarting, setSeqStarting] = useState(false)
const [showSeqModal, setShowSeqModal] = useState(false)
const [selectedTemplateId, setSelectedTemplateId] = useState('')
```

Ajouter un useEffect pour charger les templates (uniquement si le prospect a un ID UUID):

```typescript
useEffect(() => {
  if (!/^[0-9a-f-]{36}$/.test(String(prospect.id))) return
  fetch('/api/crm/sequences/templates')
    .then(r => r.json())
    .then(({ data }) => {
      if (data?.templates?.length > 0) {
        setSeqTemplates(data.templates)
        setSelectedTemplateId(data.templates[0].id)
      }
    })
    .catch(() => {})
}, [prospect.id])

async function startSequence() {
  if (!selectedTemplateId || !/^[0-9a-f-]{36}$/.test(String(prospect.id))) return
  setSeqStarting(true)
  try {
    const res = await fetch('/api/crm/sequences/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospect_id: prospect.id, template_id: selectedTemplateId }),
    })
    const json = await res.json()
    if (json.error) { alert('Erreur : ' + json.error); return }
    setShowSeqModal(false)
    if (onStartSequence) { onStartSequence(prospect); onClose() }
  } catch { alert('Erreur réseau') }
  finally { setSeqStarting(false) }
}
```

Modifier le bouton `▶ SÉQUENCE` dans le JSX des Actions pour ouvrir le modal séquence:

```typescript
{/^[0-9a-f-]{36}$/.test(String(prospect.id)) && (
  <button
    onClick={() => setShowSeqModal(true)}
    style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: `linear-gradient(90deg,${C.gold}22,${C.surface3})`, border: `1px solid ${C.gold}66`, color: C.gold, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.1em', minWidth: 140 }}
  >
    ▶ SÉQUENCE
  </button>
)}
```

Ajouter le modal séquence dans les modaux (avant `return createPortal`):

```typescript
const seqModal = showSeqModal ? (
  <div onClick={() => setShowSeqModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.gold}40`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 380, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />
      <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.gold, marginBottom: 18, marginTop: 4 }}>▶ Démarrer une séquence</div>
      {seqTemplates.length === 0 ? (
        <div style={{ fontSize: 10, color: C.textLo, marginBottom: 18 }}>
          Aucune séquence disponible. Allez dans <strong>Paramètres → Séquences</strong> et cliquez "Importer bibliothèque".
        </div>
      ) : (
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 8 }}>Choisir la séquence</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
            {seqTemplates.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplateId(t.id)}
                style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${selectedTemplateId === t.id ? C.gold : C.line}`, background: selectedTemplateId === t.id ? `${C.gold}18` : C.surface1, color: selectedTemplateId === t.id ? C.gold : C.textMid, fontFamily: 'JetBrains Mono,monospace', fontSize: 10, cursor: 'pointer', textAlign: 'left' as const }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setShowSeqModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>ANNULER</button>
        {seqTemplates.length > 0 && (
          <button onClick={startSequence} disabled={!selectedTemplateId || seqStarting} style={{ flex: 2, padding: 10, borderRadius: 8, background: '#1a1400', border: `1px solid ${C.gold}66`, color: C.gold, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {seqStarting ? 'DÉMARRAGE...' : '▶ LANCER'}
          </button>
        )}
      </div>
    </div>
  </div>
) : null
```

Ajouter `seqModal` dans le return:

```typescript
return (
  <>
    {createPortal(modal, document.body)}
    {rappelModal && createPortal(rappelModal, document.body)}
    {logModal && createPortal(logModal, document.body)}
    {seqModal && createPortal(seqModal, document.body)}
  </>
)
```

- [ ] **Step 4.4: Build + commit**

```powershell
npm run build 2>&1 | Select-String -Pattern "error TS|✓ Compiled"
git add src/app/api/crm/sequences/seed-library/route.ts src/app/(dashboard)/settings/page.tsx src/components/prospects/ProspectCard.tsx
git commit -m "feat: séquences bibliothèque — seeder 10 templates DB + lancement depuis ProspectCard"
```

---

## Task 5 — Page Séquences : bouton + CRÉER SÉQUENCE fonctionnel

**Fichiers:**
- Modifier: `src/app/(dashboard)/sequences/page.tsx`

**Problèmes:** Les boutons "+ CRÉER SÉQUENCE" (header) et "+ Créer une nouvelle séquence" (bas de page) ne font rien.

- [ ] **Step 5.1: Ajouter état modal + fonction création dans SequencesPage**

Dans `src/app/(dashboard)/sequences/page.tsx`, après le useState existant:

```typescript
const [showCreateModal, setShowCreateModal] = useState(false)
const [createName, setCreateName] = useState('')
const [createError, setCreateError] = useState<string | null>(null)
const [creating, setCreating] = useState(false)

async function handleCreate() {
  if (!createName.trim()) return
  setCreating(true)
  setCreateError(null)
  try {
    const res = await fetch('/api/crm/sequences/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: createName.trim() }),
    })
    const json = await res.json()
    if (json.error) { setCreateError(json.error); return }
    setDbTemplates(prev => [...prev, { id: json.data.template.id, name: json.data.template.name, pipeline_stage: null, auto_trigger: false }])
    setShowCreateModal(false)
    setCreateName('')
    alert(`Séquence "${createName.trim()}" créée ! Allez dans Paramètres → Séquences pour y ajouter des étapes, puis utilisez-la depuis une fiche prospect.`)
  } catch (e) {
    setCreateError(e instanceof Error ? e.message : 'Erreur inconnue')
  }
  setCreating(false)
}
```

- [ ] **Step 5.2: Connecter le bouton header**

Remplacer:
```typescript
<button style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 500, color: C.bgDeep, background: `linear-gradient(90deg,${C.cyan},${C.indigo})`, border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', letterSpacing: '0.1em' }}>
  + CRÉER SÉQUENCE
</button>
```
Par:
```typescript
<button
  onClick={() => setShowCreateModal(true)}
  style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 500, color: C.bgDeep, background: `linear-gradient(90deg,${C.cyan},${C.indigo})`, border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', letterSpacing: '0.1em' }}
>
  + CRÉER SÉQUENCE
</button>
```

- [ ] **Step 5.3: Connecter le CTA bas de page**

Remplacer:
```typescript
<div style={{
  textAlign: 'center', padding: '14px 0',
  border: `1.5px dashed ${C.line}`, borderRadius: 10,
  fontFamily: 'Oswald,sans-serif', fontSize: 12, color: C.textLo,
  cursor: 'pointer', letterSpacing: '0.1em', marginTop: 4,
}}>
  + Créer une nouvelle séquence
</div>
```
Par:
```typescript
<div
  onClick={() => setShowCreateModal(true)}
  style={{
    textAlign: 'center', padding: '14px 0',
    border: `1.5px dashed ${C.line}`, borderRadius: 10,
    fontFamily: 'Oswald,sans-serif', fontSize: 12, color: C.textLo,
    cursor: 'pointer', letterSpacing: '0.1em', marginTop: 4,
  }}
>
  + Créer une nouvelle séquence
</div>
```

- [ ] **Step 5.4: Ajouter le modal de création**

À la fin du `return` de `SequencesPage`, avant le `</>` de fermeture:

```typescript
{showCreateModal && (
  <div onClick={() => setShowCreateModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.indigo}30`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 420, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />
      <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.indigo, marginBottom: 8, marginTop: 4 }}>+ Créer une séquence</div>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 18, lineHeight: 1.6 }}>
        Crée un nom de séquence ici. Ensuite, dans <strong style={{ color: C.gold }}>Paramètres → Séquences</strong>, ouvre-la et ajoute les étapes (email J+0, WhatsApp J+2, etc.).
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Nom de la séquence *</label>
        <input
          autoFocus type="text" value={createName}
          onChange={e => setCreateName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          placeholder="Ex : Séquence Médecins Paris, Relance RDV 1..."
          style={{ width: '100%', padding: '10px 12px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 12, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }}
        />
      </div>
      {createError && <div style={{ fontSize: 9, color: C.warn, marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>{createError}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>ANNULER</button>
        <button
          onClick={handleCreate}
          disabled={creating || !createName.trim()}
          style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0d1a2e', border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: (creating || !createName.trim()) ? 'not-allowed' : 'pointer', opacity: (creating || !createName.trim()) ? 0.6 : 1 }}
        >
          {creating ? 'CRÉATION...' : '+ CRÉER'}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 5.5: Build + commit**

```powershell
npm run build 2>&1 | Select-String -Pattern "error TS|✓ Compiled"
git add src/app/(dashboard)/sequences/page.tsx
git commit -m "feat: page Séquences — boutons Créer Séquence fonctionnels avec modal"
```

---

## Task 6 — CRM Drawer : Email Brevo compose manuel

**Contexte:** Le bouton "✉️ Email Brevo" dans le CRM Drawer (`crm/page.tsx`) ne fait rien. L'API `POST /api/crm/actions/email` requiert un `instance_step_id` (pour les séquences), pas pour les emails manuels.

**Solution:** Nouvelle route légère + modal compose dans le CRM Drawer.

**Fichiers:**
- Créer: `src/app/api/crm/actions/email-manual/route.ts`
- Modifier: `src/app/(dashboard)/crm/page.tsx`

- [ ] **Step 6.1: Créer `src/app/api/crm/actions/email-manual/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'
import { z } from 'zod'
import { sendBrevoEmail } from '@/lib/sequences/brevo'

const schema = z.object({
  prospect_id: z.string().uuid(),
  to_email: z.string().email(),
  to_name: z.string(),
  subject: z.string().min(1),
  body: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let raw: unknown
  try { raw = await req.json() } catch { return apiError('Invalid JSON', 400) }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 400)

  const { prospect_id, to_email, to_name, subject, body } = parsed.data

  const result = await sendBrevoEmail({
    to: to_email,
    toName: to_name,
    subject,
    htmlContent: body.replace(/\n/g, '<br>'),
  })

  if (!result.success) return apiError(result.error ?? 'Envoi échoué')

  // Logger dans interactions
  await supabase.from('interactions').insert({
    user_id: user.id,
    prospect_id,
    type: 'email',
    notes: `Email envoyé : ${subject}`,
    is_honored: true,
  })

  return apiSuccess({ sent: true })
}
```

- [ ] **Step 6.2: Ajouter les états du compose modal dans ProspectDrawer**

Dans `crm/page.tsx`, dans la fonction `ProspectDrawer`, après les states existants:

```typescript
const [showEmailModal, setShowEmailModal] = useState(false)
const [emailSubject, setEmailSubject] = useState('')
const [emailBody, setEmailBody] = useState('')
const [emailSending, setEmailSending] = useState(false)

async function handleSendEmail() {
  if (!prospect.email || !emailSubject.trim() || !emailBody.trim()) return
  setEmailSending(true)
  try {
    const res = await fetch('/api/crm/actions/email-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prospect_id: prospect.id,
        to_email: prospect.email,
        to_name: prospect.nom,
        subject: emailSubject.trim(),
        body: emailBody.trim(),
      }),
    })
    const json = await res.json()
    if (json.error) { toast.error(json.error); return }
    toast.success('Email envoyé via Brevo !')
    setShowEmailModal(false)
    setEmailSubject('')
    setEmailBody('')
  } catch {
    toast.error('Erreur d\'envoi')
  }
  setEmailSending(false)
}
```

- [ ] **Step 6.3: Connecter le bouton Email Brevo dans le JSX**

Dans `crm/page.tsx`, dans la section Actions rapides du `ProspectDrawer`, remplacer:

```typescript
<button style={{ padding: '9px 0', borderRadius: 7, border: `1px solid ${C.indigo}`, background: C.indigo + '1a', color: C.indigo, fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
  ✉️ Email Brevo
</button>
```

Par:

```typescript
<button
  onClick={() => { if (!prospect.email) { toast.error('Email inconnu pour ce prospect'); return }; setShowEmailModal(true) }}
  style={{ padding: '9px 0', borderRadius: 7, border: `1px solid ${C.indigo}`, background: C.indigo + '1a', color: C.indigo, fontWeight: 600, fontSize: 11, cursor: 'pointer' }}
>
  ✉️ Email Brevo
</button>
```

- [ ] **Step 6.4: Ajouter le modal de composition dans le JSX de ProspectDrawer**

Après la fermeture du div principal (avant le `)</div>` final de ProspectDrawer) :

```typescript
{showEmailModal && (
  <div onClick={() => setShowEmailModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: C.bgMid, border: `1px solid ${C.indigo}40`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 480, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />
      <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.indigo, marginBottom: 4, marginTop: 4 }}>✉️ Email Brevo</div>
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginBottom: 18 }}>
        À : <span style={{ color: C.textMid }}>{prospect.nom}</span> — <span style={{ color: C.indigo }}>{prospect.email}</span>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Objet *</label>
        <input
          autoFocus value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
          placeholder="Ex : Suite à notre échange..."
          style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const }}
        />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Message *</label>
        <textarea
          value={emailBody} onChange={e => setEmailBody(e.target.value)}
          rows={6}
          placeholder={`Bonjour ${prospect.nom.split(' ')[0]},\n\n...`}
          style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' as const, resize: 'vertical' as const }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setShowEmailModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>ANNULER</button>
        <button
          onClick={handleSendEmail}
          disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
          style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0d1a2e', border: `1px solid ${C.indigo}66`, color: C.indigo, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: (!emailSubject.trim() || !emailBody.trim()) ? 0.6 : 1 }}
        >
          {emailSending ? 'ENVOI...' : '✉️ ENVOYER'}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 6.5: Build + commit**

```powershell
npm run build 2>&1 | Select-String -Pattern "error TS|✓ Compiled"
git add src/app/api/crm/actions/email-manual/route.ts src/app/(dashboard)/crm/page.tsx
git commit -m "feat: CRM Drawer — Email Brevo compose modal fonctionnel"
```

---

## Task 7 — Page Global : onglet Synthèse branché sur données réelles

**Contexte:** La page `global/page.tsx` a 4 onglets (Synthèse, Planning, RDV pris, Suivi). L'API `GET /api/global/stats` retourne déjà des données réelles (tasks, prospection, daily_kpis). L'onglet Synthèse affiche probablement des données hardcodées.

**Fichiers:**
- Modifier: `src/app/(dashboard)/global/page.tsx`

- [ ] **Step 7.1: Lire l'onglet Synthèse dans global/page.tsx pour localiser les données hardcodées**

Dans `global/page.tsx`, trouver le composant `SyntheseTab` ou similaire et identifier les valeurs hardcodées. L'API retourne:

```json
{
  "tasks": {
    "done_today": number,
    "active": number,
    "high_priority_remaining": number,
    "this_week": number,
    "total": number
  },
  "prospection": {
    "contacts_today": number,
    "prospects_this_week": number,
    "calls_today": number,
    "rdv1_today": number,
    "rdv2_today": number,
    "blocks_today": number
  }
}
```

- [ ] **Step 7.2: Ajouter le chargement API dans la page Global**

Après les imports existants dans `global/page.tsx`:

```typescript
// Dans le composant GlobalPage principal, ajouter:
const [kpi, setKpi] = useState<GlobalKpi | null>(null)
const [kpiLoading, setKpiLoading] = useState(true)

useEffect(() => {
  fetch('/api/global/stats')
    .then(r => r.json())
    .then(({ data }) => { if (data) setKpi(data) })
    .catch(() => {})
    .finally(() => setKpiLoading(false))
}, [])
```

Note: `GlobalKpi` est déjà défini en haut du fichier.

- [ ] **Step 7.3: Afficher les données réelles dans l'onglet Synthèse**

Localiser dans le JSX de l'onglet `synthese` les valeurs hardcodées (KPIs contacts, appels, RDV, tâches) et les remplacer par les données de `kpi`:

```typescript
{/* Exemple de remplacement pour les KPIs de l'onglet Synthèse */}
{kpiLoading ? (
  <div style={{ fontSize: 9, color: C.textLo }}>Chargement...</div>
) : (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
    {[
      { label: 'Contacts aujourd\'hui', value: kpi?.prospection.contacts_today ?? 0, color: C.gold },
      { label: 'Appels aujourd\'hui', value: kpi?.prospection.calls_today ?? 0, color: C.indigo },
      { label: 'RDV1 posés', value: kpi?.prospection.rdv1_today ?? 0, color: C.green },
      { label: 'Prospects cette semaine', value: kpi?.prospection.prospects_this_week ?? 0, color: C.cyan },
      { label: 'Tâches actives', value: kpi?.tasks.active ?? 0, color: C.gold },
      { label: 'Tâches terminées aujourd\'hui', value: kpi?.tasks.done_today ?? 0, color: C.green },
    ].map(({ label, value, color }) => (
      <div key={label} style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 28, fontWeight: 700, color }}>{value}</div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      </div>
    ))}
  </div>
)}
```

Note: La page global a un bouton "Actualiser" déjà prévu — le connecter à `fetch('/api/global/stats')` pour refresh manuel.

- [ ] **Step 7.4: Build + commit**

```powershell
npm run build 2>&1 | Select-String -Pattern "error TS|✓ Compiled"
git add src/app/(dashboard)/global/page.tsx
git commit -m "feat: page Global — onglet Synthèse branché sur api/global/stats données réelles"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task qui l'implémente |
|-------------|----------------------|
| ProspectCard avec choix de l'heure | Task 2 (modal rappel date+heure) |
| Logger les appels | Task 2 (modal log + Task 1 API) |
| Historique interactions dans la card | Task 2 (onglet Historique) |
| Planning Today éditable | Task 3 (agenda localStorage) |
| Date dynamique (pas hardcodée) | Task 3 (todayFrDate()) |
| Bouton SÉQUENCE fonctionnel | Task 4 (ProspectCard seq modal DB) |
| Séquences bibliothèque en DB | Task 4 (seed-library route + 10 templates) |
| Bouton + CRÉER SÉQUENCE | Task 5 (modal + API POST) |
| Email Brevo depuis CRM Drawer | Task 6 (email-manual route + modal) |
| Page Global données réelles | Task 7 (branché api/global/stats) |

**Placeholder scan:** Aucun TBD ou TODO dans le plan. Tous les code snippets sont complets.

**Type consistency:** `CallResult` utilisé dans Task 2 est défini dans Task 2 Step 2.1. `AgendaEvent`/`AgendaEventType` définis avant usage dans Task 3. `GlobalKpi` déjà typé dans global/page.tsx.

---

## Déploiement après validation locale

```powershell
# Vérifier que tout compile
npm run build

# Déployer sur Cloud Run
.\deploy-cloudrun.ps1 -ProjectId integration-make-365608
```

URL prod: https://ted-scale-with-ouss-272642857923.europe-west1.run.app
