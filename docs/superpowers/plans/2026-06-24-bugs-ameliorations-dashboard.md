# Bugs & Améliorations Dashboard PSG Cosmos — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger 11 bugs (5 critiques données, 6 fonctionnels) et implémenter 5 améliorations/features sur le dashboard CGP PSG Cosmos.

**Architecture:** Corrections data-flow dans les API routes de prospection (TNS + Chefs), ajout d'édition inline des fiches prospect dans le drawer CRM, persistance vidéos/navigation via localStorage + Supabase, et nouvelles features (filtre portables, export Excel, graphiques KPI, notifications mobile).

**Tech Stack:** Next.js 15 App Router, Supabase PostgreSQL, Recharts, xlsx, Telegram Bot API, Web Push API, localStorage.

---

## Scope Split

Ce plan couvre 16 items regroupés en 6 tâches indépendantes :
- **Task 1** : Bugs critiques données (items 1-5) — prospection TNS/Chefs
- **Task 2** : Édition fiches prospects (item 6)
- **Task 3** : Agenda synchronisation + navigation persistence (items 7, 10)
- **Task 4** : Cercle LinkedIn + Vidéos persistantes + Playbooks historique (items 8, 9, 11)
- **Task 5** : Améliorations — filtre portables + vouvoiement (items 12, 13)
- **Task 6** : Nouvelles features — Notifications mobile, Export Excel, Graphiques KPI (items 14, 15, 16)

---

## File Structure

```
src/
  app/
    api/
      prospection/
        tns/route.ts                    ← MODIFY: fix métier mapping, add mobile filter, fix rotation
        chefs/workflow/route.ts          ← MODIFY: add phone enrichment via Pappers
      prospects/
        [id]/route.ts                   ← OK (PATCH already works)
      videos/route.ts                   ← CREATE: CRUD vidéos persistantes
      export/rdv/route.ts               ← CREATE: export Excel RDV
    (dashboard)/
      today/page.tsx                    ← MODIFY: fix TNS rotation, video persistence, navigation state
      crm/page.tsx                      ← MODIFY: add edit form in drawer
      cercle/page.tsx                   ← MODIFY: wire LinkedIn button
      playbooks/[id]/page.tsx           ← MODIFY: show validated contacts in history
      global/page.tsx                   ← MODIFY: add Recharts graphs
  lib/
    phone-utils.ts                      ← CREATE: mobile detection + validation helpers
    navigation-state.ts                 ← CREATE: section persistence helper
  components/
    prospects/ProspectEditForm.tsx       ← CREATE: inline edit form for drawer
supabase/
  migrations/
    015_videos_table.sql                ← CREATE: videos persistence table
```

---

### Task 1: Bugs critiques données — Prospection TNS & Chefs

**Files:**
- Modify: `src/app/api/prospection/tns/route.ts`
- Modify: `src/app/api/prospection/chefs/workflow/route.ts`
- Modify: `src/app/(dashboard)/today/page.tsx`
- Create: `src/lib/phone-utils.ts`

#### Bug 1 — Numéros non reportés dans les cartes prospects (Chefs)

Le problème : dans `chefs-entreprise/page.tsx:196-210`, la fonction `addLeadToCRM()` ne passe PAS le téléphone lors du POST `/api/prospects`. Le type `WorkflowLead` n'a pas de champ téléphone car l'API `/api/prospection/chefs/workflow/route.ts` ne fait aucun enrichissement téléphonique (elle retourne siren, nom, forme, ville — mais pas de phone).

- [ ] **Step 1: Ajouter l'enrichissement téléphonique à l'API Chefs workflow**

Dans `src/app/api/prospection/chefs/workflow/route.ts`, ajouter un appel Pappers pour récupérer le téléphone de chaque lead :

```typescript
// Ajouter en haut du fichier
type PappersEntreprise = {
  siege?: { telephone?: string }
  dirigeants?: Array<{ email?: string; telephone?: string }>
}

// Modifier le type Lead — ajouter le champ phone
type Lead = {
  id: string
  siren: string | null
  nom: string
  forme: string
  ville: string
  codePostal: string
  dateCreation: string | null
  signal: string
  signalLabel: string
  score: number
  scoreColor: string
  urgence: boolean
  phone: string | null  // ← AJOUT
}

// Modifier la fonction toLead pour accepter un phone
function toLead(e: ApiResult, signal: string, signalLabel: string, urgence: boolean, phone: string | null = null): Lead {
  return {
    id: e.siren ?? Math.random().toString(36).slice(2),
    siren: e.siren ?? null,
    nom: e.nom_complet ?? 'Entreprise',
    forme: e.libelle_nature_juridique ?? '',
    ville: e.siege?.libelle_commune ?? '',
    codePostal: e.siege?.code_postal ?? '',
    dateCreation: e.date_creation ?? null,
    signal,
    signalLabel,
    score: urgence ? 9 + Math.floor(Math.random() * 2) : 6 + Math.floor(Math.random() * 4),
    scoreColor: urgence ? '#00d4ff' : '#e8c878',
    urgence,
    phone,
  }
}
```

- [ ] **Step 2: Enrichir les résultats avec Pappers dans la route POST**

Après les appels `searchEntreprises`, enrichir avec Pappers :

```typescript
// Dans la function POST, après la constitution des leads bruts
const pappersKey = process.env.PAPPERS_API_KEY

async function enrichPhone(siren: string | null): Promise<string | null> {
  if (!pappersKey || !siren) return null
  try {
    const res = await fetch(
      `https://api.pappers.fr/v2/entreprise?api_token=${pappersKey}&siren=${siren}`,
      { cache: 'no-store', signal: AbortSignal.timeout(4000) }
    )
    if (!res.ok) return null
    const p = await res.json() as PappersEntreprise
    return p.siege?.telephone ?? p.dirigeants?.[0]?.telephone ?? null
  } catch { return null }
}

// Remplacer les .map(e => toLead(...)) par des versions enrichies :
// Exemple pour creations :
const creationsEnriched = await Promise.all(
  [...r1, ...r2, ...r3].map(async (e) => {
    const phone = await enrichPhone(e.siren ?? null)
    return toLead(e, 'creation', 'Création récente', false, phone)
  })
)
creations.push(...creationsEnriched)
```

- [ ] **Step 3: Passer le phone dans addLeadToCRM**

Dans `src/app/(dashboard)/prospection/chefs-entreprise/page.tsx`, modifier le type `WorkflowLead` et `addLeadToCRM` :

```typescript
// Ajouter au type WorkflowLead
type WorkflowLead = {
  id: string
  siren: string | null
  nom: string
  forme: string
  ville: string
  codePostal: string
  dateCreation: string | null
  signal: string
  signalLabel: string
  score: number
  scoreColor: string
  urgence: boolean
  phone: string | null  // ← AJOUT
}

// Modifier addLeadToCRM pour passer le phone
async function addLeadToCRM(lead: WorkflowLead) {
  setAddingLead(lead.id)
  try {
    await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: lead.nom,
        company: lead.nom,
        city: lead.ville,
        phone: lead.phone,  // ← AJOUT
        source: 'chefs_entreprise',
        tags: [lead.signal],
        notes: `Forme: ${lead.forme} · Création: ${lead.dateCreation ?? 'N/A'} · Signal: ${lead.signalLabel}`,
      }),
    })
    setWorkflowLeads(prev => prev.filter(l => l.id !== lead.id))
    const res = await fetch('/api/prospects?source=chefs_entreprise&limit=50')
    const data = await res.json()
    if (data.success) setChefs(data.data ?? [])
  } catch { /* silently */ }
  finally { setAddingLead(null) }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/prospection/chefs/workflow/route.ts src/app/(dashboard)/prospection/chefs-entreprise/page.tsx
git commit -m "fix: pass phone from Pappers enrichment to prospect cards (chefs workflow)"
```

#### Bug 2 — TNS numéros toujours identiques dans "Aujourd'hui"

Le problème : la page Today utilise le `CallingSessionPanel` qui charge les contacts depuis une session de calling active en Supabase. Si la session contient toujours les mêmes contacts, les numéros ne changent pas. Il faut implémenter une rotation — soit une nouvelle session quotidienne, soit un tri aléatoire des contacts non-appelés.

- [ ] **Step 5: Ajouter la rotation des contacts dans CallingSessionPanel**

Dans `src/components/calling/CallingSessionPanel.tsx`, quand on charge la session active, trier les contacts `a_appeler` par un seed quotidien :

```typescript
// Après le chargement des contacts dans useEffect (ligne 38-56)
// Remplacer la logique de sélection du premier contact :

// Fonction shuffle déterministe par jour (même ordre pour toute la journée, différent le lendemain)
function dailyShuffle<T>(arr: T[]): T[] {
  const seed = new Date().toDateString()
  const shuffled = [...arr]
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash |= 0
  }
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash) + i
    hash |= 0
    const j = Math.abs(hash) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Dans le useEffect, après setSession(s) :
const nonCalled = s.contacts.filter(c => c.statut_appel === 'a_appeler')
const rotated = dailyShuffle(nonCalled)
const first = rotated[0] ?? s.contacts[0] ?? null
setActiveContact(first)
```

- [ ] **Step 6: Commit**

```bash
git add src/components/calling/CallingSessionPanel.tsx
git commit -m "fix: daily rotation of TNS contacts in today view"
```

#### Bug 3 — Certains numéros ne sont pas bons + Bug 12 — Filtre portables

- [ ] **Step 7: Créer le helper phone-utils.ts**

```typescript
// src/lib/phone-utils.ts

/**
 * Valide un numéro de téléphone français.
 * Retourne le numéro normalisé (format 0X XX XX XX XX) ou null si invalide.
 */
export function normalizePhoneFR(raw: string | null | undefined): string | null {
  if (!raw) return null
  // Supprimer espaces, points, tirets, parenthèses
  let cleaned = raw.replace(/[\s.\-()]/g, '')
  // +33 → 0
  if (cleaned.startsWith('+33')) cleaned = '0' + cleaned.slice(3)
  if (cleaned.startsWith('0033')) cleaned = '0' + cleaned.slice(4)
  // Vérifier longueur
  if (cleaned.length !== 10) return null
  // Vérifier début valide (01-09)
  if (!/^0[1-9]/.test(cleaned)) return null
  // Formater
  return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
}

/**
 * Détermine si un numéro est un portable (06 ou 07).
 */
export function isMobilePhone(normalized: string | null): boolean {
  if (!normalized) return false
  return normalized.startsWith('06') || normalized.startsWith('07')
}

/**
 * Filtre et valide une liste de prospects — ne garde que ceux avec téléphone valide.
 * Si mobileOnly=true, ne garde que les portables.
 */
export function filterValidPhones<T extends { telephone: string }>(
  prospects: T[],
  mobileOnly: boolean = false
): T[] {
  return prospects
    .map(p => {
      const norm = normalizePhoneFR(p.telephone)
      if (!norm) return null
      if (mobileOnly && !isMobilePhone(norm)) return null
      return { ...p, telephone: norm }
    })
    .filter((p): p is T => p !== null)
}
```

- [ ] **Step 8: Intégrer la validation dans l'API TNS**

Dans `src/app/api/prospection/tns/route.ts`, à la fin de la fonction POST, avant le return :

```typescript
import { normalizePhoneFR, isMobilePhone } from '@/lib/phone-utils'

// Remplacer la ligne 326 (const prospects = merged.slice(...))
// Par :
const mobileOnly = body.mobileOnly ?? false
const validated = merged
  .map(p => {
    const norm = normalizePhoneFR(p.telephone)
    if (!norm) return null
    if (mobileOnly && !isMobilePhone(norm)) return null
    return { ...p, telephone: norm }
  })
  .filter((p): p is Prospect => p !== null)

const prospects = validated.slice(0, Math.max(parseInt(String(limite)), 1)).map((p, i) => ({ ...p, id: i + 1 }))
```

- [ ] **Step 9: Ajouter le toggle "Portables uniquement" côté frontend TNS**

Dans `src/app/(dashboard)/prospection/tns/page.tsx`, ajouter un state `mobileOnly` et le passer dans le body du POST :

```typescript
const [mobileOnly, setMobileOnly] = useState(true)

// Dans le formulaire de recherche, ajouter un toggle :
<label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
  <input
    type="checkbox"
    checked={mobileOnly}
    onChange={e => setMobileOnly(e.target.checked)}
    style={{ accentColor: C.gold }}
  />
  <span style={{ fontSize: 9, color: C.textMid }}>Portables uniquement (06/07)</span>
</label>

// Dans le fetch, ajouter mobileOnly au body :
body: JSON.stringify({ metier, ville, departement, limite, mobileOnly })
```

- [ ] **Step 10: Commit**

```bash
git add src/lib/phone-utils.ts src/app/api/prospection/tns/route.ts src/app/(dashboard)/prospection/tns/page.tsx
git commit -m "fix: validate phone numbers + filter mobile-only in TNS prospection"
```

#### Bug 4 — Métiers incorrects dans les résultats

Le problème : plusieurs codes NAF partagent le même code (ex: `86.22A` = cardiologue, dermatologue, ophtalmologue, radiologue, pédiatre). L'API data.gouv retourne des résultats par NAF, mais le code les tag TOUS avec le `metierLabel` demandé. Un infirmier (86.90A) partage son NAF avec sage-femme.

- [ ] **Step 11: Utiliser le libellé d'activité réel retourné par l'API**

Dans `src/app/api/prospection/tns/route.ts`, modifier le type `GouvernResult` et la logique de mapping :

```typescript
// Ajouter au type GouvernResult :
type GouvernResult = {
  nom_complet?: string
  siren?: string
  siege?: { adresse?: string; code_postal?: string; libelle_commune?: string; latitude?: string; longitude?: string }
  dirigeants?: Array<{ nom?: string; prenoms?: string }>
  activite_principale?: string          // ← AJOUT
  libelle_activite_principale?: string  // ← AJOUT
}

// Créer un mapping inverse NAF → labels pour résolution
const NAF_TO_METIERS: Record<string, string[]> = {}
for (const [, config] of Object.entries(METIERS_CONFIG)) {
  if (!NAF_TO_METIERS[config.naf]) NAF_TO_METIERS[config.naf] = []
  NAF_TO_METIERS[config.naf].push(config.label)
}

// Dans canalDataGouv, ligne 187, remplacer :
//   metier: metierLabel,
// Par :
metier: e.libelle_activite_principale
  ? inferMetierFromLibelle(e.libelle_activite_principale, metierLabel)
  : metierLabel,
```

Ajouter la fonction d'inférence :

```typescript
function inferMetierFromLibelle(libelle: string, fallback: string): string {
  const norm = libelle.toLowerCase()
  // Mapping direct basé sur mots-clés dans le libellé d'activité
  const KEYWORDS: Record<string, string> = {
    'médecin': 'Médecin généraliste',
    'infirmier': 'Infirmier libéral',
    'kinésithérap': 'Kinésithérapeute',
    'dentiste': 'Chirurgien dentiste',
    'dentaire': 'Chirurgien dentiste',
    'pharmacie': 'Pharmacien',
    'ophtalmol': 'Ophtalmologue',
    'cardiolog': 'Cardiologue',
    'dermatol': 'Dermatologue',
    'pédiatr': 'Pédiatre',
    'radiolog': 'Radiologue',
    'ostéopath': 'Ostéopathe',
    'psycholog': 'Psychologue',
    'orthophon': 'Orthophoniste',
    'sage-femme': 'Sage femme',
    'sage femme': 'Sage femme',
    'podolog': 'Podologue',
    'vétérinair': 'Vétérinaire',
    'avocat': 'Avocat',
    'notaire': 'Notaire',
    'expert.compt': 'Expert comptable',
    'architect': 'Architecte',
    'naturopath': 'Naturopathe',
    'kinésiolog': 'Kinésiologue',
    'chiropract': 'Chiropracteur',
    'diététic': 'Diététicien',
    'ergothérap': 'Ergothérapeute',
    'orthoptist': 'Orthoptiste',
    'acupunct': 'Acupuncteur',
    'homéopath': 'Homéopathe',
    'psychothérap': 'Psychothérapeute',
  }
  for (const [keyword, metier] of Object.entries(KEYWORDS)) {
    if (norm.includes(keyword)) return metier
  }
  return fallback
}
```

- [ ] **Step 12: Même correction pour canalGooglePlaces**

Dans `canalGooglePlaces`, le `metier` est toujours `metierLabel` (ligne 263). Le résultat Google Places ne donne pas le code NAF, donc on garde le label demandé (c'est correct car la recherche Google est ciblée par nom de métier).

Pas de modification nécessaire pour Google Places — le problème vient uniquement du canal data.gouv.

- [ ] **Step 13: Commit**

```bash
git add src/app/api/prospection/tns/route.ts
git commit -m "fix: infer real profession from activite_principale instead of assuming NAF label"
```

#### Bug 5 — Métiers manquants dans la liste TNS

- [ ] **Step 14: Ajouter les métiers manquants**

Dans `src/app/api/prospection/tns/route.ts`, ajouter au `METIERS_CONFIG` :

```typescript
const METIERS_CONFIG: Record<string, { label: string; naf: string }> = {
  // ... existants ...
  // AJOUTS :
  opticien:             { label: 'Opticien',                  naf: '47.78A' },
  audioprothesiste:     { label: 'Audioprothésiste',          naf: '47.74Z' },
  biologiste:           { label: 'Biologiste médical',        naf: '86.90C' },
  chirurgien:           { label: 'Chirurgien',                naf: '86.22A' },
  gynecologue:          { label: 'Gynécologue',               naf: '86.22A' },
  urologue:             { label: 'Urologue',                  naf: '86.22A' },
  gastro_enterologue:   { label: 'Gastro-entérologue',        naf: '86.22A' },
  pneumologue:          { label: 'Pneumologue',               naf: '86.22A' },
  rhumatologue:         { label: 'Rhumatologue',              naf: '86.22A' },
  neurologue:           { label: 'Neurologue',                naf: '86.22A' },
  endocrinologue:       { label: 'Endocrinologue',            naf: '86.22A' },
  orl:                  { label: 'ORL',                       naf: '86.22A' },
  anesthesiste:         { label: 'Anesthésiste',              naf: '86.22A' },
  geometre_expert:      { label: 'Géomètre expert',           naf: '71.12B' },
  huissier:             { label: 'Huissier de justice',        naf: '69.10Z' },
  mandataire_judiciaire:{ label: 'Mandataire judiciaire',     naf: '69.10Z' },
  conseil_propriete:    { label: 'Conseil en propriété industrielle', naf: '69.10Z' },
  masseur_kine:         { label: 'Masseur-kinésithérapeute',  naf: '86.90B' },
  infirmier_iade:       { label: 'Infirmier anesthésiste',    naf: '86.90A' },
  prothesiste_dentaire: { label: 'Prothésiste dentaire',      naf: '32.50A' },
}
```

- [ ] **Step 15: Mettre à jour la liste de sélection côté frontend**

Dans `src/app/(dashboard)/prospection/tns/page.tsx`, s'assurer que la liste déroulante affiche tous les métiers de `METIERS_CONFIG`. Si la liste est hardcodée côté frontend, la remplacer par un appel qui liste les clés disponibles (ou dupliquer la config) :

```typescript
// Si les métiers sont hardcodés dans le frontend, les remplacer par une const partagée
// ou simplement ajouter les mêmes clés dans la liste de sélection du formulaire
```

- [ ] **Step 16: Commit**

```bash
git add src/app/api/prospection/tns/route.ts src/app/(dashboard)/prospection/tns/page.tsx
git commit -m "feat: add 20+ missing professions to TNS prospection list"
```

---

### Task 2: Édition des fiches prospects (Bug 6)

**Files:**
- Create: `src/components/prospects/ProspectEditForm.tsx`
- Modify: `src/app/(dashboard)/crm/page.tsx`

Le drawer CRM actuel permet de modifier stage, pressure et notes — mais pas les champs principaux (nom, téléphone, email, profession, ville). L'API PATCH `/api/prospects/[id]` supporte déjà tous les champs.

- [ ] **Step 1: Créer le composant ProspectEditForm**

```typescript
// src/components/prospects/ProspectEditForm.tsx
'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'

type EditableFields = {
  full_name: string
  phone: string
  email: string
  profession: string
  city: string
  company: string
}

type Props = {
  prospectId: string
  initial: EditableFields
  onSaved: (updated: EditableFields) => void
  onCancel: () => void
}

export default function ProspectEditForm({ prospectId, initial, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<EditableFields>(initial)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) onSaved(form)
    } catch { /* toast error handled by parent */ }
    finally { setSaving(false) }
  }

  const fields: Array<{ key: keyof EditableFields; label: string; placeholder: string }> = [
    { key: 'full_name', label: 'Nom complet', placeholder: 'Jean Dupont' },
    { key: 'phone', label: 'Téléphone', placeholder: '06 12 34 56 78' },
    { key: 'email', label: 'Email', placeholder: 'jean@example.com' },
    { key: 'profession', label: 'Profession', placeholder: 'Médecin' },
    { key: 'company', label: 'Entreprise', placeholder: 'Cabinet Dupont' },
    { key: 'city', label: 'Ville', placeholder: 'Paris' },
  ]

  return (
    <div style={{ padding: 16, background: C.surface2, borderRadius: 10, border: `1px solid ${C.gold}40` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 12, fontFamily: 'Oswald,sans-serif', letterSpacing: 1 }}>
        MODIFIER LA FICHE
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fields.map(f => (
          <div key={f.key}>
            <div style={{ fontSize: 8, color: C.textLo, marginBottom: 3, fontFamily: 'JetBrains Mono,monospace' }}>{f.label}</div>
            <input
              value={form[f.key]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              style={{
                width: '100%', padding: '7px 10px', background: C.surface1,
                border: `1px solid ${C.line}`, borderRadius: 6, color: C.text,
                fontSize: 10, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, padding: '8px 14px', borderRadius: 6,
            background: '#1a1400', border: `1px solid ${C.gold}60`,
            color: C.gold, fontSize: 10, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {saving ? '...' : '✓ Sauvegarder'}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 14px', borderRadius: 6, background: C.surface1,
            border: `1px solid ${C.line}`, color: C.textMid, fontSize: 10, cursor: 'pointer',
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Intégrer le formulaire d'édition dans le ProspectDrawer (crm/page.tsx)**

Dans le drawer, ajouter un bouton "✏️ Modifier" et un state `editing` :

```typescript
// Dans le ProspectDrawer component, ajouter :
const [editing, setEditing] = useState(false)

// Ajouter un bouton dans le header du drawer (après le nom) :
<button
  onClick={() => setEditing(e => !e)}
  style={{
    padding: '4px 10px', borderRadius: 5, border: `1px solid ${C.gold}40`,
    background: editing ? '#1a1400' : 'transparent',
    color: C.gold, fontSize: 9, cursor: 'pointer',
  }}
>
  {editing ? '✕ Fermer' : '✏️ Modifier'}
</button>

// Conditionnel : si editing, afficher ProspectEditForm
{editing && (
  <ProspectEditForm
    prospectId={prospect.id}
    initial={{
      full_name: prospect.nom,
      phone: prospect.telephone ?? '',
      email: prospect.email ?? '',
      profession: prospect.profession ?? '',
      city: prospect.ville ?? '',
      company: prospect.entreprise ?? '',
    }}
    onSaved={(updated) => {
      // Mettre à jour le state local
      setProspects(prev => prev.map(p => p.id === prospect.id ? {
        ...p,
        nom: updated.full_name,
        telephone: updated.phone,
        email: updated.email,
        profession: updated.profession,
        ville: updated.city,
        entreprise: updated.company,
      } : p))
      setSelectedProspect(prev => prev ? {
        ...prev,
        nom: updated.full_name,
        telephone: updated.phone,
        email: updated.email,
        profession: updated.profession,
        ville: updated.city,
        entreprise: updated.company,
      } : null)
      setEditing(false)
      toast.success('Fiche mise à jour')
    }}
    onCancel={() => setEditing(false)}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/prospects/ProspectEditForm.tsx src/app/(dashboard)/crm/page.tsx
git commit -m "feat: add inline edit form for prospect cards in CRM drawer"
```

---

### Task 3: Agenda synchronisation + Navigation persistence (Bugs 7, 10)

**Files:**
- Create: `src/lib/navigation-state.ts`
- Modify: `src/app/(dashboard)/today/page.tsx`
- Modify: `src/app/(dashboard)/layout.tsx` — NON, interdit de toucher layout.tsx

Alternative : persister le state via localStorage dans chaque page individuellement.

#### Bug 7 — Agenda Today vs Hebdo désynchronisé

Les deux vues utilisent déjà le même backend `loadDayAgenda(dateKey)` depuis `src/lib/agenda.ts` avec le même key pattern `shared_agenda_${dateKey}`. Le problème potentiel : Today modifie les events via `setAgendaEvents` + `saveDayAgenda`, mais le dashboard hebdo les recharge indépendamment. Si Today crée un event et l'utilisateur va sur Hebdo sans refresh, il ne le voit pas.

- [ ] **Step 1: Ajouter un event de synchronisation inter-pages via StorageEvent**

Dans `src/lib/agenda.ts`, ajouter un mécanisme de notification :

```typescript
// Ajouter à src/lib/agenda.ts :

/**
 * Dispatch un CustomEvent local pour signaler qu'un agenda a changé.
 * Les composants écoutent cet event pour se re-synchroniser.
 */
export function notifyAgendaChange(dateKey: string) {
  window.dispatchEvent(new CustomEvent('agenda-changed', { detail: { dateKey } }))
}

// Modifier saveDayAgenda pour inclure la notification :
export function saveDayAgenda(dateKey: string, events: AgendaEvent[]) {
  try {
    localStorage.setItem(`shared_agenda_${dateKey}`, JSON.stringify(events))
    notifyAgendaChange(dateKey)
  } catch { /* ignore */ }
}
```

- [ ] **Step 2: Écouter le StorageEvent dans le dashboard hebdo**

Dans `src/app/(dashboard)/dashboard/page.tsx`, ajouter un listener qui recharge les events quand un autre onglet ou la même page modifie l'agenda :

```typescript
// Dans le composant principal, ajouter un useEffect :
useEffect(() => {
  function handleAgendaChange() {
    // Recharger tous les jours de la semaine affichée
    const dates = getWeekDates(weekOffset)
    const loaded: Record<string, AgendaEvent[]> = {}
    dates.forEach(d => { loaded[d] = loadDayAgenda(d) })
    setWeekAgenda(loaded)
  }
  window.addEventListener('agenda-changed', handleAgendaChange)
  window.addEventListener('storage', (e) => {
    if (e.key?.startsWith('shared_agenda_')) handleAgendaChange()
  })
  return () => {
    window.removeEventListener('agenda-changed', handleAgendaChange)
    window.removeEventListener('storage', handleAgendaChange)
  }
}, [weekOffset])
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/agenda.ts src/app/(dashboard)/dashboard/page.tsx
git commit -m "fix: sync agenda between today and weekly views via storage events"
```

#### Bug 10 — Perte de la section active à la navigation

- [ ] **Step 4: Créer le helper de persistence de navigation**

```typescript
// src/lib/navigation-state.ts

const NAV_STATE_KEY = 'dashboard_last_section'

export function saveLastSection(path: string) {
  try { localStorage.setItem(NAV_STATE_KEY, path) } catch {}
}

export function getLastSection(): string | null {
  try { return localStorage.getItem(NAV_STATE_KEY) } catch { return null }
}
```

- [ ] **Step 5: Persister la section active dans chaque page**

Dans `src/app/(dashboard)/today/page.tsx` et les autres pages principales, ajouter au montage :

```typescript
import { saveLastSection } from '@/lib/navigation-state'

// Dans le useEffect de montage (ou en ajoutant un nouveau) :
useEffect(() => {
  saveLastSection('/today')
}, [])
```

Faire de même pour `/dashboard`, `/crm`, `/global`, `/prospection/tns`, etc.

- [ ] **Step 6: Rediriger vers la dernière section au chargement du dashboard**

Dans `src/app/(dashboard)/page.tsx` (ou créer un fichier si absent) — ou dans le middleware :

```typescript
// src/app/(dashboard)/page.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getLastSection } from '@/lib/navigation-state'

export default function DashboardRootPage() {
  const router = useRouter()
  useEffect(() => {
    const last = getLastSection()
    if (last) router.replace(last)
    else router.replace('/today')
  }, [router])
  return null
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/navigation-state.ts src/app/(dashboard)/page.tsx src/app/(dashboard)/today/page.tsx src/app/(dashboard)/dashboard/page.tsx src/app/(dashboard)/crm/page.tsx src/app/(dashboard)/global/page.tsx
git commit -m "feat: persist last active section and restore on navigation"
```

---

### Task 4: Cercle LinkedIn + Vidéos persistantes + Playbooks historique (Bugs 8, 9, 11)

**Files:**
- Modify: `src/app/(dashboard)/cercle/page.tsx`
- Modify: `src/app/(dashboard)/today/page.tsx`
- Modify: `src/app/(dashboard)/playbooks/[id]/page.tsx`
- Create: `supabase/migrations/015_videos_table.sql`
- Create: `src/app/api/videos/route.ts`

#### Bug 8 — Bouton "Depuis LinkedIn" dans Cercle

L'API officielle LinkedIn est trop restrictive. La seule approche viable : prendre l'URL LinkedIn du partenaire (déjà saisie dans le formulaire), et utiliser un service de scraping public ou un proxy-image pour extraire la photo.

Approche réaliste : ouvrir un popup qui invite l'utilisateur à coller l'URL de l'image LinkedIn (guidage amélioré).

- [ ] **Step 1: Implémenter le bouton LinkedIn comme popup guidée**

Dans `src/app/(dashboard)/cercle/page.tsx`, remplacer le bouton sans handler :

```typescript
// Remplacer le bouton ligne 832-838 par :
<button
  onClick={() => {
    const url = editForm.linkedin
    if (!url) {
      alert('Renseignez d\'abord l\'URL LinkedIn dans le champ ci-dessus.')
      return
    }
    // Ouvrir le profil LinkedIn dans un nouvel onglet pour copie facile
    window.open(url, '_blank')
    // Afficher instruction
    const photoUrl = prompt(
      '1. Sur le profil LinkedIn, clic droit sur la photo de profil\n' +
      '2. "Copier l\'adresse de l\'image"\n' +
      '3. Collez l\'URL ici :'
    )
    if (photoUrl && photoUrl.startsWith('http')) {
      setEditForm(prev => ({ ...prev, photoUrl }))
    }
  }}
  style={{
    padding: '6px 12px', background: '#0a66c2',
    border: 'none', color: '#fff', borderRadius: 5,
    fontSize: 10, cursor: 'pointer', fontWeight: 600,
  }}
>
  📸 Depuis LinkedIn
</button>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/cercle/page.tsx
git commit -m "feat: wire LinkedIn button with guided photo extraction flow"
```

#### Bug 9 — Vidéos ne persistent pas

- [ ] **Step 3: Créer la migration pour stocker les vidéos**

```sql
-- supabase/migrations/015_videos_table.sql
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  section text NOT NULL DEFAULT 'today',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own videos" ON videos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 4: Créer l'API route pour les vidéos**

```typescript
// src/app/api/videos/route.ts
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const section = new URL(request.url).searchParams.get('section') ?? 'today'
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', user.id)
    .eq('section', section)
    .order('position')
  if (error) return apiError(error.message, 500)
  return apiSuccess(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { name: string; url: string; section?: string }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { name, url, section = 'today' } = body
  if (!name || !url) return apiError('name et url requis', 400)

  const { data, error } = await supabase
    .from('videos')
    .insert({ user_id: user.id, name, url, section })
    .select().single()
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return apiError('id requis', 400)

  const { error } = await supabase.from('videos').delete().eq('id', id).eq('user_id', user.id)
  if (error) return apiError(error.message, 500)
  return apiSuccess({ deleted: true })
}
```

- [ ] **Step 5: Modifier le VideoPlayer dans today/page.tsx pour persister**

Remplacer la logique Blob-only par une approche hybride :
- Les vidéos uploadées localement restent en Blob URL (session)
- Mais aussi sauvegarder l'URL dans Supabase si c'est une URL externe
- Au montage, charger les vidéos persistées depuis l'API

```typescript
// Dans le composant VideoPlayer, ajouter :
const [savedVideos, setSavedVideos] = useState<Array<{ id: string; name: string; url: string }>>([])

useEffect(() => {
  fetch('/api/videos?section=today')
    .then(r => r.json())
    .then(d => {
      if (d.data) {
        setSavedVideos(d.data)
        setPlaylist(d.data.map((v: any) => ({ name: v.name, url: v.url })))
      }
    })
    .catch(() => {})
}, [])

// Modifier loadFiles pour sauvegarder aussi en DB :
const loadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files ?? [])
  const newTracks = files.map(f => ({ name: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f) }))
  setPlaylist(prev => [...prev, ...newTracks])
  // Note: les fichiers locaux restent en Blob URL (session-only)
  // Pour persistance: l'utilisateur peut aussi ajouter des URLs YouTube/externes
}

// Ajouter un bouton "Ajouter URL" pour vidéos persistantes :
const [showUrlInput, setShowUrlInput] = useState(false)
const [urlInput, setUrlInput] = useState('')

async function addVideoUrl() {
  if (!urlInput) return
  const name = urlInput.split('/').pop()?.split('?')[0] ?? 'Vidéo'
  await fetch('/api/videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, url: urlInput, section: 'today' }),
  })
  setPlaylist(prev => [...prev, { name, url: urlInput }])
  setUrlInput('')
  setShowUrlInput(false)
}
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/015_videos_table.sql src/app/api/videos/route.ts src/app/(dashboard)/today/page.tsx
git commit -m "feat: persist videos in Supabase for permanent dashboard access"
```

#### Bug 11 — Contacts validés absents de l'historique Playbook

Le problème : dans `playbooks/[id]/page.tsx`, l'historique (ligne 120-145) ne montre que `runs.slice(1)` avec date/prospects_found/status. Les contacts validés du run actuel sont visibles dans la section "Validés", mais les contacts des runs historiques ne sont PAS chargés.

- [ ] **Step 7: Charger les prospects des runs historiques**

```typescript
// Dans playbooks/[id]/page.tsx, modifier le rendering de l'historique :
{runs.length > 1 && (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <div style={{ width: 3, height: 14, background: C.textLo, borderRadius: 2 }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: C.textLo, textTransform: 'uppercase', letterSpacing: 1.5 }}>
        Historique
      </span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {runs.slice(1).map(r => (
        <div key={r.id} style={{
          background: C.surface1,
          border: `1px solid ${C.lineSoft}`,
          borderRadius: 6,
          padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: C.textMid }}>{new Date(r.started_at).toLocaleDateString('fr-FR')}</span>
            <span style={{ fontSize: 10, color: C.textLo }}>{r.prospects_found} trouvés</span>
            <span style={{ fontSize: 10, color: C.green }}>{r.prospects_validated ?? 0} validés</span>
            <span style={{ fontSize: 10, color: C.textLo }}>{r.status}</span>
          </div>
          {/* Afficher les contacts validés de ce run */}
          {(r.playbook_prospects ?? [])
            .filter((p: any) => p.status === 'validated')
            .map((p: any) => (
              <div key={p.id} style={{
                fontSize: 9, color: C.textMid, padding: '3px 8px',
                background: `${C.green}10`, borderRadius: 4, marginTop: 3,
                borderLeft: `2px solid ${C.green}40`,
              }}>
                {p.company_name} — {p.dirigeant_name}
              </div>
            ))
          }
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 8: S'assurer que l'API retourne les prospects dans les runs historiques**

Vérifier que `/api/playbooks/[id]/runs` retourne `playbook_prospects` pour chaque run. Si ce n'est pas le cas, modifier la query :

```typescript
// Dans l'API route /api/playbooks/[id]/runs, s'assurer du select :
const { data, error } = await supabase
  .from('playbook_runs')
  .select('*, playbook_prospects(*)')  // ← inclure les prospects
  .eq('playbook_id', id)
  .order('started_at', { ascending: false })
  .limit(20)
```

- [ ] **Step 9: Commit**

```bash
git add src/app/(dashboard)/playbooks/[id]/page.tsx src/app/api/playbooks/[id]/runs/route.ts
git commit -m "fix: show validated contacts in playbook run history"
```

---

### Task 5: Vouvoiement dans toutes les séquences (Bug 13)

**Files:**
- Modify: `src/app/(dashboard)/sequences/page.tsx`
- Check: Supabase `call_scripts` table data

- [ ] **Step 1: Auditer les séquences pour tutoiement**

D'après l'exploration, les séquences dans `sequences/page.tsx` utilisent DÉJÀ le vouvoiement. Vérifier les call scripts en DB (dynamiques) et le message WhatsApp dans le drawer CRM :

```typescript
// Dans crm/page.tsx ligne 438 :
const waMsg = encodeURIComponent(
  `Bonjour ${prospect.nom.split(' ').pop()}, je suis Ted, conseiller en gestion de patrimoine. Seriez-vous disponible pour un échange de 15 minutes cette semaine ?`
)
// ← OK, utilise "Seriez-vous" (vouvoiement)
```

- [ ] **Step 2: Vérifier et corriger tout tutoiement résiduel**

Faire un grep exhaustif pour "tu ", " te ", " ton ", " ta ", " tes " dans les templates/séquences :

```bash
grep -rn "\btu \b\|\ te \b\| ton \b\| ta \b\| tes \b" src/ --include="*.tsx" --include="*.ts" | grep -i "message\|template\|script\|sequence\|content\|contenu"
```

Si des occurrences sont trouvées, les corriger au cas par cas.

- [ ] **Step 3: Commit (si modifications)**

```bash
git add -A
git commit -m "fix: ensure formal 'vous' in all sequence templates and scripts"
```

---

### Task 6: Nouvelles features — Notifications, Export Excel, Graphiques KPI (Items 14, 15, 16)

**Files:**
- Create: `src/app/api/export/rdv/route.ts`
- Modify: `src/app/(dashboard)/global/page.tsx`
- Modify: `src/lib/telegram/bot.ts`

#### Feature 14 — Notifications version téléphone

Le bot Telegram est déjà fonctionnel. Les notifications mobiles passent par Telegram (déjà implémenté : playbook reports, status updates, validation callbacks). La seule amélioration : envoyer aussi les notifications de section (rappels RDV, alertes) via Telegram.

- [ ] **Step 1: Étendre les notifications Telegram aux alertes de section**

Dans `src/lib/telegram/bot.ts`, ajouter :

```typescript
export async function sendSectionNotification(section: string, message: string) {
  const emoji: Record<string, string> = {
    rdv: '📅',
    relance: '🔔',
    kpi: '📊',
    pipeline: '🎯',
    sequence: '▶️',
  }
  const prefix = emoji[section] ?? '💡'
  await sendTelegramMessage(`${prefix} *${section.toUpperCase()}*\n\n${message}`)
}
```

- [ ] **Step 2: Appeler sendSectionNotification depuis les cron jobs**

Dans les routes `/api/cron/rdv-reminder`, `/api/cron/ca-alert`, etc., ajouter un appel Telegram en plus de l'email/SMS existant :

```typescript
import { sendSectionNotification } from '@/lib/telegram/bot'

// Exemple dans rdv-reminder :
await sendSectionNotification('rdv', `RDV demain : ${prospect.full_name} à ${rdvTime}`)
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/telegram/bot.ts src/app/api/cron/rdv-reminder/route.ts src/app/api/cron/ca-alert/route.ts
git commit -m "feat: push section notifications to Telegram for mobile access"
```

#### Feature 15 — Export Excel des RDV

- [ ] **Step 4: Créer la route d'export Excel**

```typescript
// src/app/api/export/rdv/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: interactions } = await supabase
    .from('interactions')
    .select('*, prospects(full_name, company, phone, city)')
    .eq('user_id', user.id)
    .in('type', ['rdv1', 'rdv2', 'rdv3'])
    .order('occurred_at', { ascending: false })
    .limit(500)

  const rows = (interactions ?? []).map(i => ({
    'Date': new Date(i.occurred_at).toLocaleDateString('fr-FR'),
    'Heure': new Date(i.occurred_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    'Type': i.type.toUpperCase(),
    'Prospect': i.prospects?.full_name ?? '',
    'Entreprise': i.prospects?.company ?? '',
    'Téléphone': i.prospects?.phone ?? '',
    'Ville': i.prospects?.city ?? '',
    'Honoré': i.is_honored ? 'Oui' : 'Non',
    'Durée (min)': i.duration_min ?? '',
    'Notes': i.notes ?? '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'RDV')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="rdv_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  })
}
```

- [ ] **Step 5: Ajouter un bouton d'export dans la page Today ou Global**

Dans `src/app/(dashboard)/global/page.tsx` (section Suivi), ajouter :

```typescript
<button
  onClick={() => {
    window.open('/api/export/rdv', '_blank')
  }}
  style={{
    padding: '8px 14px', borderRadius: 6,
    background: '#0d1a0d', border: `1px solid ${C.green}60`,
    color: C.green, fontSize: 10, fontWeight: 600, cursor: 'pointer',
  }}
>
  📥 Export Excel RDV
</button>
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/export/rdv/route.ts src/app/(dashboard)/global/page.tsx
git commit -m "feat: add Excel export for RDV interactions"
```

#### Feature 16 — Graphiques pour les KPI

La page `global/page.tsx` a déjà des barres horizontales HTML. Ajouter des vrais graphiques Recharts pour les KPI importants.

- [ ] **Step 7: Ajouter un LineChart performance hebdomadaire**

Dans `src/app/(dashboard)/global/page.tsx`, dans l'onglet "Suivi", ajouter un graphique Recharts :

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

// Données de performance (à charger depuis /api/global/stats ou daily_kpis)
const [weeklyData, setWeeklyData] = useState<Array<{ day: string; performance: number }>>([])

useEffect(() => {
  fetch('/api/global/stats')
    .then(r => r.json())
    .then(d => {
      if (d.data?.weeklyPerformance) setWeeklyData(d.data.weeklyPerformance)
    })
    .catch(() => {})
}, [])

// Dans le JSX, section Suivi :
<div style={{ width: '100%', height: 200, marginTop: 16 }}>
  <ResponsiveContainer>
    <LineChart data={weeklyData}>
      <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
      <XAxis dataKey="day" tick={{ fill: C.textLo, fontSize: 9 }} />
      <YAxis tick={{ fill: C.textLo, fontSize: 9 }} />
      <Tooltip
        contentStyle={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8 }}
        labelStyle={{ color: C.textHi }}
      />
      <Line type="monotone" dataKey="performance" stroke={C.gold} strokeWidth={2} dot={{ fill: C.gold, r: 4 }} />
    </LineChart>
  </ResponsiveContainer>
</div>
```

- [ ] **Step 8: Ajouter un BarChart objectifs vs réalisé**

```typescript
// Données comparatives
const objectifsData = [
  { name: 'Contacts', objectif: targets.contacts, realise: contacts },
  { name: 'Appels', objectif: targets.calls, realise: calls },
  { name: 'RDV1', objectif: targets.rdv1, realise: rdv1 },
  { name: 'RDV2', objectif: targets.rdv2, realise: rdv2 },
]

<div style={{ width: '100%', height: 180, marginTop: 16 }}>
  <ResponsiveContainer>
    <BarChart data={objectifsData}>
      <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
      <XAxis dataKey="name" tick={{ fill: C.textLo, fontSize: 9 }} />
      <YAxis tick={{ fill: C.textLo, fontSize: 9 }} />
      <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 8 }} />
      <Bar dataKey="objectif" fill={`${C.indigo}60`} radius={[4, 4, 0, 0]} />
      <Bar dataKey="realise" fill={C.gold} radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
</div>
```

- [ ] **Step 9: Commit**

```bash
git add src/app/(dashboard)/global/page.tsx
git commit -m "feat: add Recharts LineChart and BarChart for KPI visualization"
```

- [ ] **Step 10: Build & test**

```bash
cd C:\Users\Ted\Documents\GitHub\TedScaleWithOuss && npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 11: Final commit si corrections build nécessaires**

```bash
git add -A
git commit -m "fix: resolve build errors from dashboard improvements"
```
