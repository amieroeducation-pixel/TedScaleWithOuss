# Calling Session Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connecter les modules TNS/Chefs à une session d'appels structurée dans Today, avec scripts paramétrables en DB, suivi contact par contact, bilan tous les 10 appels et optimisation IA.

**Architecture:** 4 nouvelles tables Supabase (call_scripts, call_objections, calling_sessions, calling_session_contacts). APIs Next.js App Router. Les 3 sections hardcodées de Today (Script, Objections, Liste ONOFF) sont remplacées par un panneau CRM dynamique. Scripts/objections gérés depuis Settings.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase PostgreSQL, inline CSS via `C` from `src/lib/theme.ts`, Anthropic SDK pour l'amélioration IA.

**Patterns clés du projet:**
- Auth: `const { data: { user } } = await supabase.auth.getUser()` — jamais getSession()
- API helpers: `apiSuccess(data)`, `apiError(message, status)`, `apiUnauthorized()` depuis `@/lib/api`
- Style: inline CSS uniquement via `C` importé de `src/lib/theme.ts` — zéro Tailwind
- Client Supabase: `await createSupabaseServerClient()` dans les routes API

---

## Fichiers à créer

```
supabase/migrations/008_calling_sessions.sql
src/app/api/call-scripts/route.ts
src/app/api/call-scripts/[id]/route.ts
src/app/api/call-objections/route.ts
src/app/api/call-objections/[id]/route.ts
src/app/api/calling-sessions/route.ts
src/app/api/calling-sessions/[id]/route.ts
src/app/api/calling-sessions/[id]/contacts/[contactId]/route.ts
src/app/api/calling-sessions/[id]/bilan/route.ts
src/app/api/call-analytics/improve-script/route.ts
src/components/calling/CreateSessionModal.tsx
src/components/calling/SessionContactList.tsx
src/components/calling/SessionContactCard.tsx
src/components/calling/BilanModal.tsx
src/components/calling/CallingSessionPanel.tsx
```

## Fichiers à modifier

```
src/app/(dashboard)/prospection/tns/page.tsx        — checkboxes + bouton créer session
src/app/(dashboard)/today/page.tsx                  — remplacer 3 sections hardcodées
src/app/(dashboard)/settings/page.tsx               — nouvel onglet Scripts & Objections
```

---

## Task 1 : Migration Supabase — 4 tables

**Files:**
- Create: `supabase/migrations/008_calling_sessions.sql`

- [ ] **Step 1 : Créer la migration**

Créer `supabase/migrations/008_calling_sessions.sql` avec ce contenu exact :

```sql
-- Migration 008: calling session dashboard

CREATE TABLE call_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metier text NOT NULL,
  titre text NOT NULL,
  contenu text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE call_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own call_scripts" ON call_scripts
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_call_scripts_user_metier ON call_scripts(user_id, metier);

CREATE TABLE call_objections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metier text NOT NULL,
  question text NOT NULL,
  reponse text NOT NULL,
  ordre int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE call_objections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own call_objections" ON call_objections
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_call_objections_user_metier ON call_objections(user_id, metier, ordre);

CREATE TABLE calling_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titre text NOT NULL,
  metier text NOT NULL,
  ville text NOT NULL DEFAULT '',
  source text NOT NULL CHECK (source IN ('tns', 'chefs')),
  statut text NOT NULL DEFAULT 'active' CHECK (statut IN ('active', 'pausee', 'terminee')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE calling_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own calling_sessions" ON calling_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_calling_sessions_user ON calling_sessions(user_id, statut, created_at DESC);

CREATE TABLE calling_session_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES calling_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ordre int NOT NULL DEFAULT 0,
  siren text,
  nom text NOT NULL,
  entreprise text NOT NULL DEFAULT '',
  metier text NOT NULL DEFAULT '',
  ville text NOT NULL DEFAULT '',
  telephone text NOT NULL,
  email text,
  adresse text,
  source text NOT NULL DEFAULT '',
  statut_appel text NOT NULL DEFAULT 'a_appeler'
    CHECK (statut_appel IN ('a_appeler','contacte','pas_repondu','pas_interesse','chaud')),
  note text,
  rappel_date timestamptz,
  added_to_crm boolean NOT NULL DEFAULT false,
  called_at timestamptz,
  script_rating smallint CHECK (script_rating BETWEEN 1 AND 5),
  objections_rencontrees jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE calling_session_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own session_contacts" ON calling_session_contacts
  FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_session_contacts_session ON calling_session_contacts(session_id, ordre);
```

- [ ] **Step 2 : Appliquer la migration**

Dans le dashboard Supabase (https://supabase.com/dashboard) → projet `vqtzcxvmzznbepyvlcut` → SQL Editor → coller et exécuter le contenu de la migration.

Vérifier : les 4 tables apparaissent dans Table Editor.

---

## Task 2 : API call-scripts (GET/POST/PUT/DELETE)

**Files:**
- Create: `src/app/api/call-scripts/route.ts`
- Create: `src/app/api/call-scripts/[id]/route.ts`

- [ ] **Step 1 : Créer `src/app/api/call-scripts/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const metier = new URL(request.url).searchParams.get('metier')
  let query = supabase.from('call_scripts').select('*').eq('user_id', user.id).order('created_at')
  if (metier) query = query.eq('metier', metier)

  const { data, error } = await query
  if (error) return apiError(error.message, 500)
  return apiSuccess(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { metier: string; titre: string; contenu: string; is_default?: boolean }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { metier, titre, contenu, is_default = false } = body
  if (!metier || !titre || !contenu) return apiError('metier, titre, contenu requis', 400)

  if (is_default) {
    await supabase.from('call_scripts')
      .update({ is_default: false })
      .eq('user_id', user.id).eq('metier', metier)
  }

  const { data, error } = await supabase.from('call_scripts')
    .insert({ user_id: user.id, metier, titre, contenu, is_default })
    .select().single()
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}
```

- [ ] **Step 2 : Créer `src/app/api/call-scripts/[id]/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { titre?: string; contenu?: string; is_default?: boolean }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  if (body.is_default) {
    const { data: script } = await supabase.from('call_scripts')
      .select('metier').eq('id', id).single()
    if (script) {
      await supabase.from('call_scripts')
        .update({ is_default: false })
        .eq('user_id', user.id).eq('metier', script.metier)
    }
  }

  const { data, error } = await supabase.from('call_scripts')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id)
    .select().single()
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data: script } = await supabase.from('call_scripts')
    .select('metier, is_default').eq('id', id).single()
  if (script?.is_default) {
    const { count } = await supabase.from('call_scripts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('metier', script.metier)
    if ((count ?? 0) <= 1) return apiError('Impossible de supprimer le seul script du métier', 400)
  }

  const { error } = await supabase.from('call_scripts')
    .delete().eq('id', id).eq('user_id', user.id)
  if (error) return apiError(error.message, 500)
  return apiSuccess({ deleted: true })
}
```

- [ ] **Step 3 : Vérifier le build**

```powershell
npm run build
```
Attendu : aucune erreur TypeScript.

---

## Task 3 : API call-objections (GET/POST/PUT/DELETE)

**Files:**
- Create: `src/app/api/call-objections/route.ts`
- Create: `src/app/api/call-objections/[id]/route.ts`

- [ ] **Step 1 : Créer `src/app/api/call-objections/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const metier = new URL(request.url).searchParams.get('metier')
  let query = supabase.from('call_objections').select('*').eq('user_id', user.id).order('ordre')
  if (metier) query = query.eq('metier', metier)

  const { data, error } = await query
  if (error) return apiError(error.message, 500)
  return apiSuccess(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { metier: string; question: string; reponse: string; ordre?: number }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { metier, question, reponse, ordre = 0 } = body
  if (!metier || !question || !reponse) return apiError('metier, question, reponse requis', 400)

  const { data, error } = await supabase.from('call_objections')
    .insert({ user_id: user.id, metier, question, reponse, ordre })
    .select().single()
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}
```

- [ ] **Step 2 : Créer `src/app/api/call-objections/[id]/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { question?: string; reponse?: string; ordre?: number }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { data, error } = await supabase.from('call_objections')
    .update(body)
    .eq('id', id).eq('user_id', user.id)
    .select().single()
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { error } = await supabase.from('call_objections')
    .delete().eq('id', id).eq('user_id', user.id)
  if (error) return apiError(error.message, 500)
  return apiSuccess({ deleted: true })
}
```

---

## Task 4 : API calling-sessions (GET/POST + contacts PUT + bilan POST)

**Files:**
- Create: `src/app/api/calling-sessions/route.ts`
- Create: `src/app/api/calling-sessions/[id]/route.ts`
- Create: `src/app/api/calling-sessions/[id]/contacts/[contactId]/route.ts`
- Create: `src/app/api/calling-sessions/[id]/bilan/route.ts`

- [ ] **Step 1 : Créer `src/app/api/calling-sessions/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

type ContactInput = {
  siren?: string | null
  nom: string
  entreprise?: string
  metier?: string
  ville?: string
  telephone: string
  email?: string | null
  adresse?: string
  source?: string
}

export async function GET(_request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data, error } = await supabase.from('calling_sessions')
    .select('*, calling_session_contacts(count)')
    .eq('user_id', user.id)
    .order('statut', { ascending: true }) // active avant terminee
    .order('created_at', { ascending: false })
  if (error) return apiError(error.message, 500)
  return apiSuccess(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: {
    titre: string
    metier: string
    ville: string
    source: 'tns' | 'chefs'
    contacts: ContactInput[]
  }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { titre, metier, ville, source, contacts } = body
  if (!titre || !metier || !source || !contacts?.length) {
    return apiError('titre, metier, source, contacts requis', 400)
  }

  // Créer la session
  const { data: session, error: sessionError } = await supabase
    .from('calling_sessions')
    .insert({ user_id: user.id, titre, metier, ville: ville ?? '', source })
    .select().single()
  if (sessionError) return apiError(sessionError.message, 500)

  // Snapshot des contacts
  const contactRows = contacts.map((c, i) => ({
    session_id: session.id,
    user_id: user.id,
    ordre: i,
    siren: c.siren ?? null,
    nom: c.nom,
    entreprise: c.entreprise ?? '',
    metier: c.metier ?? metier,
    ville: c.ville ?? ville ?? '',
    telephone: c.telephone,
    email: c.email ?? null,
    adresse: c.adresse ?? null,
    source: c.source ?? '',
  }))

  const { error: contactsError } = await supabase
    .from('calling_session_contacts')
    .insert(contactRows)
  if (contactsError) return apiError(contactsError.message, 500)

  return apiSuccess(session)
}
```

- [ ] **Step 2 : Créer `src/app/api/calling-sessions/[id]/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  const { data: session, error: sErr } = await supabase
    .from('calling_sessions').select('*').eq('id', id).eq('user_id', user.id).single()
  if (sErr) return apiError(sErr.message, 404)

  const { data: contacts, error: cErr } = await supabase
    .from('calling_session_contacts')
    .select('*').eq('session_id', id).order('ordre')
  if (cErr) return apiError(cErr.message, 500)

  return apiSuccess({ ...session, contacts: contacts ?? [] })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { statut: 'active' | 'pausee' | 'terminee' }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { data, error } = await supabase.from('calling_sessions')
    .update({ statut: body.statut, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id)
    .select().single()
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}
```

- [ ] **Step 3 : Créer `src/app/api/calling-sessions/[id]/contacts/[contactId]/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { contactId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: {
    statut_appel?: 'a_appeler' | 'contacte' | 'pas_repondu' | 'pas_interesse' | 'chaud'
    note?: string
    rappel_date?: string | null
    added_to_crm?: boolean
    called_at?: string
  }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const { data, error } = await supabase.from('calling_session_contacts')
    .update(body)
    .eq('id', contactId).eq('user_id', user.id)
    .select().single()
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}
```

- [ ] **Step 4 : Créer `src/app/api/calling-sessions/[id]/bilan/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

type BilanContact = {
  id: string
  script_rating: number
  objections_rencontrees: Array<{ id: string; rating: number }>
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { contacts: BilanContact[]; commentaire?: string }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  const updates = body.contacts.map(c =>
    supabase.from('calling_session_contacts')
      .update({
        script_rating: c.script_rating,
        objections_rencontrees: c.objections_rencontrees,
      })
      .eq('id', c.id).eq('user_id', user.id)
  )
  await Promise.all(updates)

  return apiSuccess({ ok: true })
}
```

- [ ] **Step 5 : Vérifier le build**

```powershell
npm run build
```
Attendu : aucune erreur TypeScript.

---

## Task 5 : API call-analytics/improve-script

**Files:**
- Create: `src/app/api/call-analytics/improve-script/route.ts`

- [ ] **Step 1 : Vérifier que ANTHROPIC_API_KEY est dans .env.local**

Le fichier `.env.local` doit contenir :
```
ANTHROPIC_API_KEY=sk-ant-...
```
Si absent, l'ajouter. La clé est disponible sur console.anthropic.com.

- [ ] **Step 2 : Installer le SDK Anthropic si besoin**

```powershell
npm list @anthropic-ai/sdk
```
Si absent : `npm install @anthropic-ai/sdk`

- [ ] **Step 3 : Créer `src/app/api/call-analytics/improve-script/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  let body: { script_id: string; metier: string }
  try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

  // Récupérer le script actuel
  const { data: script } = await supabase.from('call_scripts')
    .select('*').eq('id', body.script_id).eq('user_id', user.id).single()
  if (!script) return apiError('Script non trouvé', 404)

  // Récupérer les objections du métier avec notes moyennes
  const { data: objections } = await supabase.from('call_objections')
    .select('*').eq('user_id', user.id).eq('metier', body.metier).order('ordre')

  // Récupérer les bilans récents (script_rating + objections_rencontrees)
  const { data: bilans } = await supabase.from('calling_session_contacts')
    .select('script_rating, objections_rencontrees, note')
    .eq('user_id', user.id)
    .not('script_rating', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  const avgRating = bilans?.length
    ? (bilans.reduce((sum, b) => sum + (b.script_rating ?? 0), 0) / bilans.length).toFixed(1)
    : 'N/A'

  const notes = bilans?.filter(b => b.note).map(b => `- ${b.note}`).join('\n') ?? 'Aucune note'

  const prompt = `Tu es un expert en prospection téléphonique pour les CGP (Conseillers en Gestion de Patrimoine) en France.

Voici le script d'appel actuel pour le métier "${body.metier}" :
---
${script.contenu}
---

Note moyenne obtenue sur les derniers appels : ${avgRating}/5

Commentaires des bilans :
${notes}

Objections actuelles :
${objections?.map(o => `- "${o.question}" → "${o.reponse}"`).join('\n') ?? 'Aucune'}

Améliore ce script et ces réponses aux objections en t'appuyant sur les retours. 
Retourne un JSON avec ce format exact :
{
  "script_ameliore": "texte du nouveau script",
  "objections_ameliorees": [
    { "question": "...", "reponse": "..." }
  ],
  "justification": "2-3 phrases expliquant les changements"
}`

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return apiError('Réponse IA invalide', 500)

  try {
    const result = JSON.parse(jsonMatch[0])
    return apiSuccess(result)
  } catch {
    return apiError('Parsing réponse IA échoué', 500)
  }
}
```

---

## Task 6 : Composant CreateSessionModal

**Files:**
- Create: `src/components/calling/CreateSessionModal.tsx`

- [ ] **Step 1 : Créer `src/components/calling/CreateSessionModal.tsx`**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { C } from '@/lib/theme'

type Script = { id: string; titre: string; is_default: boolean }

type Contact = {
  siren?: string | null
  nom: string
  entreprise?: string
  metier?: string
  ville?: string
  telephone: string
  email?: string | null
  adresse?: string
  source?: string
}

type Props = {
  contacts: Contact[]
  metier: string        // clé METIERS_CONFIG ex: 'kinesitherapeute'
  metierLabel: string   // ex: 'Kinésithérapeute'
  ville: string
  source: 'tns' | 'chefs'
  onClose: () => void
  onCreated: (sessionId: string) => void
}

export default function CreateSessionModal({ contacts, metier, metierLabel, ville, source, onClose, onCreated }: Props) {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const [titre, setTitre] = useState(`${metierLabel} ${ville} — ${today}`)
  const [scripts, setScripts] = useState<Script[]>([])
  const [scriptId, setScriptId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/call-scripts?metier=${metier}`)
      .then(r => r.json())
      .then(d => {
        const list: Script[] = d.data ?? []
        setScripts(list)
        const def = list.find(s => s.is_default) ?? list[0]
        if (def) setScriptId(def.id)
      })
      .catch(() => {})
  }, [metier])

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/calling-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre, metier, ville, source, contacts }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Erreur création')
      onCreated(data.data.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: C.bgMid, border: `1px solid ${C.line}`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 420, position: 'relative' }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />

        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.textHi, marginBottom: 4, marginTop: 6 }}>
          Créer une session d'appels
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 20 }}>
          {contacts.length} contacts sélectionnés · {metierLabel} · {ville}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Titre de la session</label>
          <input
            value={titre}
            onChange={e => setTitre(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 5 }}>Script à utiliser</label>
          {scripts.length === 0 ? (
            <div style={{ fontSize: 9, color: C.gold, fontFamily: 'JetBrains Mono,monospace' }}>
              Aucun script pour ce métier — à créer dans les Paramètres
            </div>
          ) : (
            <select
              value={scriptId}
              onChange={e => setScriptId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 10, fontFamily: 'JetBrains Mono,monospace', boxSizing: 'border-box' }}
            >
              {scripts.map(s => (
                <option key={s.id} value={s.id}>{s.titre}{s.is_default ? ' (actif)' : ''}</option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div style={{ fontSize: 9, color: '#ff6470', marginBottom: 12, fontFamily: 'JetBrains Mono,monospace' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, background: C.surface1, border: `1px solid ${C.line}`, color: C.textLo, fontFamily: 'Oswald,sans-serif', fontSize: 11, cursor: 'pointer' }}>
            ANNULER
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !titre}
            style={{ flex: 2, padding: 10, borderRadius: 8, background: '#0a1f0a', border: `1px solid ${C.green}66`, color: C.green, fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'CRÉATION...' : '🚀 LANCER LA SESSION'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## Task 7 : Modifier la page TNS — checkboxes + bouton session

**Files:**
- Modify: `src/app/(dashboard)/prospection/tns/page.tsx`

- [ ] **Step 1 : Ajouter l'import CreateSessionModal**

En tête du fichier, après les imports existants :

```typescript
import CreateSessionModal from '@/components/calling/CreateSessionModal'
```

- [ ] **Step 2 : Ajouter les states de sélection**

Dans le composant `TnsPage`, après les states existants :

```typescript
const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
const [showCreateSession, setShowCreateSession] = useState(false)

function toggleSelect(id: number) {
  setSelectedIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}

function toggleAll() {
  if (selectedIds.size === searchResults.length) setSelectedIds(new Set())
  else setSelectedIds(new Set(searchResults.map(r => r.id)))
}

const selectedContacts = searchResults.filter(r => selectedIds.has(r.id))
```

- [ ] **Step 3 : Modifier le header du panel de résultats**

Remplacer le div contenant `PanelTitle` et les boutons Export/Ajouter par :

```typescript
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <PanelTitle title={`Résultats (${searchResults.length})`} accent={C.indigo} />
    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, cursor: 'pointer' }}>
      <input type="checkbox" checked={selectedIds.size === searchResults.length && searchResults.length > 0} onChange={toggleAll} style={{ accentColor: C.indigo }} />
      Tout sélectionner
    </label>
  </div>
  <div style={{ display: 'flex', gap: 6 }}>
    {selectedIds.size > 0 && (
      <button
        onClick={() => setShowCreateSession(true)}
        style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '5px 10px', borderRadius: 5, border: `1px solid ${C.green}40`, background: '#0a140a', color: C.green, cursor: 'pointer', fontWeight: 600 }}
      >
        🚀 Session d'appels ({selectedIds.size})
      </button>
    )}
    <button onClick={exportCSV} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '5px 10px', borderRadius: 5, border: `1px solid ${C.indigo}40`, background: C.surface2, color: C.indigo, cursor: 'pointer' }}>
      📥 Export CSV
    </button>
    <button
      onClick={addAllToProspection}
      disabled={addingAll}
      style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '5px 10px', borderRadius: 5, border: `1px solid #4ade8040`, background: '#0a140a', color: C.green, cursor: addingAll ? 'not-allowed' : 'pointer', opacity: addingAll ? 0.6 : 1 }}
    >
      {addingAll ? '⏳ Ajout...' : '➕ Tout ajouter'}
    </button>
  </div>
</div>
```

- [ ] **Step 4 : Ajouter la checkbox sur chaque ligne de résultat**

Dans le `.map(r => (...))` des résultats, ajouter la checkbox en premier enfant du div principal, avec `stopPropagation` :

```typescript
<div key={r.id} onClick={() => setSelectedProspect({...})} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: selectedIds.has(r.id) ? `${C.indigo}15` : C.surface2, borderRadius: 7, border: `1px solid ${selectedIds.has(r.id) ? C.indigo + '60' : C.lineSoft}`, cursor: 'pointer' }}>
  <input
    type="checkbox"
    checked={selectedIds.has(r.id)}
    onChange={() => toggleSelect(r.id)}
    onClick={e => e.stopPropagation()}
    style={{ accentColor: C.indigo, flexShrink: 0 }}
  />
  {/* reste de la ligne inchangé */}
```

- [ ] **Step 5 : Ajouter CreateSessionModal et sa logique en fin de JSX**

Après le `{selectedProspect && <ProspectCard ... />}` :

```typescript
{showCreateSession && (
  <CreateSessionModal
    contacts={selectedContacts.map(r => ({
      siren: r.siren,
      nom: r.nom,
      entreprise: r.entreprise,
      metier: r.metier,
      ville: r.ville,
      telephone: r.telephone ?? '',
      email: r.email,
      adresse: r.adresse,
      source: r.source,
    }))}
    metier={metier}
    metierLabel={METIERS.find(m => m.value === metier)?.label ?? metier}
    ville={ville}
    source="tns"
    onClose={() => setShowCreateSession(false)}
    onCreated={(sessionId) => {
      setShowCreateSession(false)
      setSelectedIds(new Set())
      // Redirect vers Today
      window.location.href = '/today'
    }}
  />
)}
```

- [ ] **Step 6 : Build**

```powershell
npm run build
```

---

## Task 8 : Composant SessionContactList

**Files:**
- Create: `src/components/calling/SessionContactList.tsx`

- [ ] **Step 1 : Créer `src/components/calling/SessionContactList.tsx`**

```typescript
'use client'

import { C } from '@/lib/theme'

export type SessionContact = {
  id: string
  ordre: number
  nom: string
  entreprise: string
  metier: string
  ville: string
  telephone: string
  email: string | null
  adresse: string | null
  siren: string | null
  source: string
  statut_appel: 'a_appeler' | 'contacte' | 'pas_repondu' | 'pas_interesse' | 'chaud'
  note: string | null
  rappel_date: string | null
  added_to_crm: boolean
  called_at: string | null
  script_rating: number | null
  objections_rencontrees: Array<{ id: string; rating: number }> | null
}

const STATUT_CONFIG: Record<SessionContact['statut_appel'], { color: string; emoji: string; label: string }> = {
  a_appeler:      { color: C.textLo,  emoji: '⚪', label: 'À appeler' },
  pas_repondu:    { color: C.gold,    emoji: '🟡', label: 'Pas répondu' },
  chaud:          { color: C.green,   emoji: '🟢', label: 'Chaud' },
  contacte:       { color: C.indigo,  emoji: '🔵', label: 'Contacté' },
  pas_interesse:  { color: '#ff6470', emoji: '🔴', label: 'Pas intéressé' },
}

type Props = {
  contacts: SessionContact[]
  activeId: string | null
  onSelect: (contact: SessionContact) => void
}

export default function SessionContactList({ contacts, activeId, onSelect }: Props) {
  const groupes = {
    a_appeler:     contacts.filter(c => c.statut_appel === 'a_appeler'),
    autres:        contacts.filter(c => c.statut_appel !== 'a_appeler'),
  }

  const renderContact = (c: SessionContact) => {
    const cfg = STATUT_CONFIG[c.statut_appel]
    const isActive = c.id === activeId
    const initials = c.nom.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '??'

    return (
      <div
        key={c.id}
        onClick={() => onSelect(c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
          background: isActive ? `${C.indigo}20` : C.surface2,
          border: `1px solid ${isActive ? C.indigo + '60' : C.lineSoft}`,
          borderRadius: 7, cursor: 'pointer', marginBottom: 3,
          transition: 'background 0.15s',
        }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 7, background: C.surface3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Oswald,sans-serif', fontSize: 9, fontWeight: 700, color: isActive ? C.indigo : C.textMid, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, color: C.textHi, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nom}</div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7.5, color: C.textLo }}>{c.ville}</div>
        </div>
        <span style={{ fontSize: 12, flexShrink: 0 }}>{cfg.emoji}</span>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingRight: 4 }}>
      {groupes.a_appeler.length > 0 && (
        <>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textVlo, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5, paddingLeft: 2 }}>
            À appeler ({groupes.a_appeler.length})
          </div>
          {groupes.a_appeler.map(renderContact)}
        </>
      )}
      {groupes.autres.length > 0 && (
        <>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textVlo, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5, marginTop: 10, paddingLeft: 2 }}>
            Traités ({groupes.autres.length})
          </div>
          {groupes.autres.map(renderContact)}
        </>
      )}
    </div>
  )
}
```

---

## Task 9 : Composant SessionContactCard

**Files:**
- Create: `src/components/calling/SessionContactCard.tsx`

- [ ] **Step 1 : Créer `src/components/calling/SessionContactCard.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'
import { type SessionContact } from './SessionContactList'

type Objection = { id: string; question: string; reponse: string; ordre: number }

type Props = {
  contact: SessionContact
  script: string
  objections: Objection[]
  onUpdate: (contactId: string, patch: Partial<SessionContact>) => Promise<void>
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
}

const STATUTS: Array<{ key: SessionContact['statut_appel']; label: string; color: string; bg: string }> = [
  { key: 'a_appeler',     label: 'À appeler',     color: C.textMid,  bg: C.surface2 },
  { key: 'contacte',      label: 'Contacté',      color: C.indigo,   bg: `${C.indigo}15` },
  { key: 'pas_repondu',   label: 'Pas répondu',   color: C.gold,     bg: '#1a1400' },
  { key: 'chaud',         label: '🔥 Chaud',      color: C.green,    bg: '#0a1f0a' },
  { key: 'pas_interesse', label: 'Pas intéressé', color: '#ff6470',  bg: '#1a0d0d' },
]

export default function SessionContactCard({ contact, script, objections, onUpdate, onPrev, onNext, hasPrev, hasNext }: Props) {
  const [note, setNote] = useState(contact.note ?? '')
  const [rappelDate, setRappelDate] = useState(contact.rappel_date?.split('T')[0] ?? '')
  const [scriptOpen, setScriptOpen] = useState(true)
  const [objectionsOpen, setObjectionsOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function setStatut(statut_appel: SessionContact['statut_appel']) {
    setSaving(true)
    await onUpdate(contact.id, {
      statut_appel,
      called_at: new Date().toISOString(),
    })
    setSaving(false)
  }

  async function saveNote() {
    await onUpdate(contact.id, {
      note,
      rappel_date: rappelDate ? new Date(rappelDate).toISOString() : null,
    })
  }

  async function addToCRM() {
    await onUpdate(contact.id, { added_to_crm: true })
    await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: contact.nom,
        company: contact.entreprise,
        profession: contact.metier,
        city: contact.ville,
        phone: contact.telephone,
        email: contact.email ?? '',
        source: 'tns',
        notes: note,
      }),
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>
      {/* En-tête contact */}
      <div style={{ background: C.surface2, borderRadius: 8, padding: 12, border: `1px solid ${C.lineSoft}` }}>
        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 600, color: C.textHi, marginBottom: 2 }}>{contact.nom}</div>
        {contact.entreprise !== contact.nom && (
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid, marginBottom: 2 }}>{contact.entreprise}</div>
        )}
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>{contact.metier} · {contact.ville}</div>

        <a
          href={`tel:${contact.telephone}`}
          style={{ display: 'inline-block', marginTop: 8, fontFamily: 'JetBrains Mono,monospace', fontSize: 13, fontWeight: 700, color: C.green, textDecoration: 'none', padding: '5px 12px', background: '#0a1f0a', borderRadius: 6, border: `1px solid ${C.green}40` }}
        >
          📞 {contact.telephone}
        </a>
      </div>

      {/* Statuts */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
        {STATUTS.map(s => (
          <button
            key={s.key}
            onClick={() => setStatut(s.key)}
            disabled={saving}
            style={{
              fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '5px 10px', borderRadius: 6,
              background: contact.statut_appel === s.key ? s.bg : C.surface1,
              color: contact.statut_appel === s.key ? s.color : C.textLo,
              border: `1px solid ${contact.statut_appel === s.key ? s.color + '60' : C.lineSoft}`,
              cursor: saving ? 'not-allowed' : 'pointer', fontWeight: contact.statut_appel === s.key ? 600 : 400,
            }}
          >{s.label}</button>
        ))}
      </div>

      {/* Note + rappel */}
      <div style={{ background: C.surface1, borderRadius: 8, padding: 10, border: `1px solid ${C.lineSoft}` }}>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          onBlur={saveNote}
          placeholder="Notes sur l'appel..."
          rows={2}
          style={{ width: '100%', background: 'transparent', border: 'none', color: C.textMid, fontSize: 9, fontFamily: 'JetBrains Mono,monospace', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
          <input
            type="date"
            value={rappelDate}
            onChange={e => setRappelDate(e.target.value)}
            onBlur={saveNote}
            style={{ flex: 1, padding: '4px 8px', background: C.surface2, border: `1px solid ${C.lineSoft}`, borderRadius: 5, color: C.textMid, fontSize: 8, fontFamily: 'JetBrains Mono,monospace' }}
          />
          <button
            onClick={addToCRM}
            disabled={contact.added_to_crm}
            style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '4px 10px', borderRadius: 5, background: contact.added_to_crm ? '#0a1f0a' : C.surface2, border: `1px solid ${contact.added_to_crm ? C.green + '40' : C.lineSoft}`, color: contact.added_to_crm ? C.green : C.textLo, cursor: contact.added_to_crm ? 'default' : 'pointer' }}
          >
            {contact.added_to_crm ? '✓ Dans le CRM' : '+ Ajouter au CRM'}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onPrev} disabled={!hasPrev} style={{ flex: 1, padding: '7px 0', borderRadius: 6, background: C.surface1, border: `1px solid ${C.lineSoft}`, color: hasPrev ? C.textMid : C.textVlo, fontFamily: 'Oswald,sans-serif', fontSize: 10, cursor: hasPrev ? 'pointer' : 'not-allowed' }}>
          ← Précédent
        </button>
        <button onClick={onNext} disabled={!hasNext} style={{ flex: 1, padding: '7px 0', borderRadius: 6, background: hasNext ? '#0a1f0a' : C.surface1, border: `1px solid ${hasNext ? C.green + '40' : C.lineSoft}`, color: hasNext ? C.green : C.textVlo, fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: hasNext ? 600 : 400, cursor: hasNext ? 'pointer' : 'not-allowed' }}>
          Suivant →
        </button>
      </div>

      {/* Script accordéon */}
      <div style={{ background: C.surface1, borderRadius: 8, border: `1px solid ${C.lineSoft}`, overflow: 'hidden' }}>
        <button
          onClick={() => setScriptOpen(o => !o)}
          style={{ width: '100%', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textHi }}
        >
          <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 600 }}>📋 SCRIPT</span>
          <span style={{ fontSize: 10, color: C.textLo }}>{scriptOpen ? '▼' : '▶'}</span>
        </button>
        {scriptOpen && (
          <div style={{ padding: '0 12px 12px', fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid, lineHeight: 1.7, whiteSpace: 'pre-wrap', borderTop: `1px solid ${C.lineSoft}`, paddingTop: 10 }}>
            {script || 'Aucun script — créez-en un dans les Paramètres.'}
          </div>
        )}
      </div>

      {/* Objections accordéon */}
      {objections.length > 0 && (
        <div style={{ background: C.surface1, borderRadius: 8, border: `1px solid ${C.lineSoft}`, overflow: 'hidden' }}>
          <button
            onClick={() => setObjectionsOpen(o => !o)}
            style={{ width: '100%', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textHi }}
          >
            <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 600 }}>❓ OBJECTIONS</span>
            <span style={{ fontSize: 10, color: C.textLo }}>{objectionsOpen ? '▼' : '▶'}</span>
          </button>
          {objectionsOpen && (
            <div style={{ borderTop: `1px solid ${C.lineSoft}`, padding: '8px 12px 12px' }}>
              {objections.map(o => (
                <div key={o.id} style={{ marginBottom: 8, background: C.bgMid, borderRadius: 6, padding: '7px 10px' }}>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.cyan, fontWeight: 600, marginBottom: 3 }}>❓ {o.question}</div>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid, lineHeight: 1.5 }}>💬 {o.reponse}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## Task 10 : Composant BilanModal

**Files:**
- Create: `src/components/calling/BilanModal.tsx`

- [ ] **Step 1 : Créer `src/components/calling/BilanModal.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { C } from '@/lib/theme'

type Objection = { id: string; question: string }

type Props = {
  sessionId: string
  contactIds: string[]   // les 10 derniers contacts appelés
  objections: Objection[]
  onClose: () => void
}

export default function BilanModal({ sessionId, contactIds, objections, onClose }: Props) {
  const [scriptRating, setScriptRating] = useState(0)
  const [objRatings, setObjRatings] = useState<Record<string, { rencontree: boolean; rating: number }>>({})
  const [commentaire, setCommentaire] = useState('')
  const [saving, setSaving] = useState(false)

  function setObjRencontree(id: string, val: boolean) {
    setObjRatings(prev => ({ ...prev, [id]: { rencontree: val, rating: prev[id]?.rating ?? 0 } }))
  }

  function setObjRating(id: string, val: number) {
    setObjRatings(prev => ({ ...prev, [id]: { rencontree: prev[id]?.rencontree ?? true, rating: val } }))
  }

  async function handleSubmit() {
    setSaving(true)
    const contacts = contactIds.map(id => ({
      id,
      script_rating: scriptRating,
      objections_rencontrees: Object.entries(objRatings)
        .filter(([, v]) => v.rencontree)
        .map(([objId, v]) => ({ id: objId, rating: v.rating })),
    }))

    await fetch(`/api/calling-sessions/${sessionId}/bilan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts, commentaire }),
    })
    setSaving(false)
    onClose()
  }

  const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: n <= value ? C.gold : C.surface3, padding: '0 2px' }}
        >★</button>
      ))}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: C.bgMid, border: `1px solid ${C.gold}40`, borderRadius: 14, padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.ribbon, borderRadius: '14px 14px 0 0' }} />

        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 15, fontWeight: 600, color: C.gold, marginBottom: 4, marginTop: 6 }}>
          Bilan de session — 10 appels
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 20 }}>
          Prenez 2 minutes pour noter ce qui a bien marché
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, color: C.textHi, marginBottom: 8 }}>Note globale du script</div>
          <StarRating value={scriptRating} onChange={setScriptRating} />
        </div>

        {objections.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, color: C.textHi, marginBottom: 10 }}>Objections rencontrées</div>
            {objections.map(o => (
              <div key={o.id} style={{ background: C.surface1, borderRadius: 7, padding: '8px 10px', marginBottom: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
                  <input
                    type="checkbox"
                    checked={objRatings[o.id]?.rencontree ?? false}
                    onChange={e => setObjRencontree(o.id, e.target.checked)}
                    style={{ accentColor: C.gold }}
                  />
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid }}>{o.question}</span>
                </label>
                {objRatings[o.id]?.rencontree && (
                  <div style={{ paddingLeft: 22 }}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textLo, marginBottom: 4 }}>La réponse a bien fonctionné ?</div>
                    <StarRating value={objRatings[o.id]?.rating ?? 0} onChange={v => setObjRating(o.id, v)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, color: C.textHi, marginBottom: 8 }}>Commentaire libre</div>
          <textarea
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            placeholder="Ce qui a bien marché, ce qui a bloqué..."
            rows={3}
            style={{ width: '100%', padding: '8px 10px', background: C.surface1, border: `1px solid ${C.lineSoft}`, borderRadius: 6, color: C.textMid, fontSize: 9, fontFamily: 'JetBrains Mono,monospace', resize: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || scriptRating === 0}
          style={{ width: '100%', padding: 12, borderRadius: 8, background: '#1a1400', border: `1px solid ${C.gold}60`, color: C.gold, fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, cursor: saving || scriptRating === 0 ? 'not-allowed' : 'pointer', opacity: scriptRating === 0 ? 0.6 : 1 }}
        >
          {saving ? 'ENREGISTREMENT...' : 'VALIDER LE BILAN'}
        </button>
      </div>
    </div>
  )
}
```

---

## Task 11 : Composant CallingSessionPanel (assemblage)

**Files:**
- Create: `src/components/calling/CallingSessionPanel.tsx`

- [ ] **Step 1 : Créer `src/components/calling/CallingSessionPanel.tsx`**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { C } from '@/lib/theme'
import SessionContactList, { type SessionContact } from './SessionContactList'
import SessionContactCard from './SessionContactCard'
import BilanModal from './BilanModal'

type Session = {
  id: string
  titre: string
  metier: string
  ville: string
  source: string
  statut: 'active' | 'pausee' | 'terminee'
  contacts: SessionContact[]
}

type Script = { contenu: string }
type Objection = { id: string; question: string; reponse: string; ordre: number }

export default function CallingSessionPanel() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeContact, setActiveContact] = useState<SessionContact | null>(null)
  const [script, setScript] = useState('')
  const [objections, setObjections] = useState<Objection[]>([])
  const [showBilan, setShowBilan] = useState(false)
  const [calledSinceLastBilan, setCalledSinceLastBilan] = useState<string[]>([])

  // Charger la session active
  useEffect(() => {
    fetch('/api/calling-sessions')
      .then(r => r.json())
      .then(async d => {
        const active = (d.data ?? []).find((s: Session) => s.statut === 'active')
        if (!active) { setLoading(false); return }
        const detail = await fetch(`/api/calling-sessions/${active.id}`).then(r => r.json())
        if (detail.success) {
          const s: Session = detail.data
          setSession(s)
          const first = s.contacts.find(c => c.statut_appel === 'a_appeler') ?? s.contacts[0] ?? null
          setActiveContact(first)
          // Charger script et objections
          const [scriptRes, objRes] = await Promise.all([
            fetch(`/api/call-scripts?metier=${s.metier}`).then(r => r.json()),
            fetch(`/api/call-objections?metier=${s.metier}`).then(r => r.json()),
          ])
          const def: Script | undefined = (scriptRes.data ?? []).find((sc: Script & { is_default: boolean }) => sc.is_default) ?? scriptRes.data?.[0]
          setScript(def?.contenu ?? '')
          setObjections(objRes.data ?? [])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleUpdate = useCallback(async (contactId: string, patch: Partial<SessionContact>) => {
    if (!session) return
    const res = await fetch(`/api/calling-sessions/${session.id}/contacts/${contactId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await res.json()
    if (!data.success) return

    setSession(prev => {
      if (!prev) return prev
      return { ...prev, contacts: prev.contacts.map(c => c.id === contactId ? { ...c, ...data.data } : c) }
    })
    setActiveContact(prev => prev?.id === contactId ? { ...prev, ...data.data } : prev)

    // Compteur bilan
    if (patch.called_at) {
      setCalledSinceLastBilan(prev => {
        const next = [...prev, contactId]
        if (next.length >= 10) setShowBilan(true)
        return next
      })
    }
  }, [session])

  async function handleTerminer() {
    if (!session) return
    await fetch(`/api/calling-sessions/${session.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'terminee' }),
    })
    setSession(null)
  }

  const contacts = session?.contacts ?? []
  const activeIdx = contacts.findIndex(c => c.id === activeContact?.id)

  if (loading) {
    return (
      <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 8, padding: 24, textAlign: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>Chargement session...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 8, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>📞</div>
        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, color: C.textMid, marginBottom: 6 }}>Aucune session active</div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>
          Lancez une recherche TNS ou Chefs pour créer une session d'appels
        </div>
        <a href="/prospection/tns" style={{ display: 'inline-block', marginTop: 12, fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.indigo, textDecoration: 'none', padding: '5px 12px', background: `${C.indigo}15`, borderRadius: 5, border: `1px solid ${C.indigo}30` }}>
          → Prospection TNS
        </a>
      </div>
    )
  }

  const appelés = contacts.filter(c => c.called_at).length

  return (
    <>
      <div style={{ background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden' }}>
        {/* Header session */}
        <div style={{ background: C.surface2, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.line}` }}>
          <div>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, color: C.textHi }}>{session.titre}</div>
            <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginTop: 2 }}>
              {appelés}/{contacts.length} appelés
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {/* Barre progression */}
            <div style={{ width: 80, height: 6, background: C.surface3, borderRadius: 10, overflow: 'hidden', alignSelf: 'center' }}>
              <div style={{ width: `${(appelés / Math.max(contacts.length, 1)) * 100}%`, height: '100%', background: C.green, borderRadius: 10 }} />
            </div>
            <button
              onClick={handleTerminer}
              style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '4px 10px', borderRadius: 5, background: '#1a0d0d', border: `1px solid #ff647040`, color: '#ff6470', cursor: 'pointer' }}
            >
              Terminer
            </button>
          </div>
        </div>

        {/* CRM split */}
        <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', minHeight: 480 }}>
          {/* Liste gauche */}
          <div style={{ borderRight: `1px solid ${C.line}`, padding: 12, overflowY: 'auto', maxHeight: 480 }}>
            <SessionContactList
              contacts={contacts}
              activeId={activeContact?.id ?? null}
              onSelect={setActiveContact}
            />
          </div>

          {/* Fiche droite */}
          <div style={{ padding: 12, overflowY: 'auto', maxHeight: 480 }}>
            {activeContact ? (
              <SessionContactCard
                contact={activeContact}
                script={script}
                objections={objections}
                onUpdate={handleUpdate}
                onPrev={() => activeIdx > 0 && setActiveContact(contacts[activeIdx - 1])}
                onNext={() => activeIdx < contacts.length - 1 && setActiveContact(contacts[activeIdx + 1])}
                hasPrev={activeIdx > 0}
                hasNext={activeIdx < contacts.length - 1}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: C.textLo, fontFamily: 'JetBrains Mono,monospace', fontSize: 9 }}>
                Sélectionnez un contact
              </div>
            )}
          </div>
        </div>
      </div>

      {showBilan && (
        <BilanModal
          sessionId={session.id}
          contactIds={calledSinceLastBilan}
          objections={objections}
          onClose={() => {
            setShowBilan(false)
            setCalledSinceLastBilan([])
          }}
        />
      )}
    </>
  )
}
```

---

## Task 12 : Modifier today/page.tsx — remplacer les 3 sections

**Files:**
- Modify: `src/app/(dashboard)/today/page.tsx`

- [ ] **Step 1 : Ajouter l'import CallingSessionPanel**

En tête du fichier :

```typescript
import CallingSessionPanel from '@/components/calling/CallingSessionPanel'
```

- [ ] **Step 2 : Remplacer les 3 sections hardcodées**

Dans le JSX de l'onglet `prospection`, localiser et remplacer les 3 blocs suivants :

```typescript
{/* Script d'appel */}
<div style={{ background: C.surface1, border: `0.5px solid ${C.line}`, ...}}>
  ...
</div>

{/* Objections */}
<div style={{ background: C.surface1, border: `0.5px solid ${C.line}`, ...}}>
  ...
</div>

{/* Liste appels ONOFF */}
<div style={{ background: C.surface1, border: `0.5px solid ${C.line}`, ...}}>
  ...
</div>
```

Par :

```typescript
{/* Session d'appels — remplace Script hardcodé + Objections + Liste ONOFF */}
<CallingSessionPanel />
```

- [ ] **Step 3 : Supprimer le state scriptTab et la variable scripts qui ne servent plus**

Supprimer les lignes :
```typescript
const [scriptTab, setScriptTab] = useState<'tns' | 'chef' | 'particulier'>('tns')
const scripts: Record<string, string> = { tns: `...`, chef: `...`, particulier: `...` }
```

- [ ] **Step 4 : Build et test**

```powershell
npm run build
```
Puis tester localement : `npm run dev` → naviguer vers `/today` → vérifier que le panneau "Aucune session active" s'affiche.

---

## Task 13 : Settings — onglet Scripts & Objections

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1 : Ajouter 'scripts' au type Tab**

```typescript
type Tab = 'general' | 'kpi' | 'notifications' | 'integrations' | 'sections' | 'mobile' | 'sequences' | 'triggers' | 'scripts'
```

- [ ] **Step 2 : Ajouter l'onglet dans TABS**

```typescript
{ id: 'scripts', label: '📞 Scripts' },
```

- [ ] **Step 3 : Ajouter les types et states pour scripts/objections**

Dans le composant, après les states existants :

```typescript
type CallScript = { id: string; metier: string; titre: string; contenu: string; is_default: boolean }
type CallObjection = { id: string; metier: string; question: string; reponse: string; ordre: number }

const METIERS_LIST = [
  { value: 'medecin_generaliste', label: 'Médecin généraliste' },
  { value: 'kinesitherapeute', label: 'Kinésithérapeute' },
  { value: 'dentiste', label: 'Chirurgien dentiste' },
  { value: 'avocat', label: 'Avocat' },
  { value: 'expert_comptable', label: 'Expert comptable' },
  { value: 'notaire', label: 'Notaire' },
  { value: 'osteopathe', label: 'Ostéopathe' },
  { value: 'infirmier', label: 'Infirmier libéral' },
  { value: 'pharmacien', label: 'Pharmacien' },
  { value: 'architecte', label: 'Architecte' },
]

const [scriptsMetier, setScriptsMetier] = useState('medecin_generaliste')
const [scripts, setScripts] = useState<CallScript[]>([])
const [objections, setObjections] = useState<CallObjection[]>([])
const [scriptsLoading, setScriptsLoading] = useState(false)
const [newScript, setNewScript] = useState({ titre: '', contenu: '' })
const [newObj, setNewObj] = useState({ question: '', reponse: '' })
const [showNewScript, setShowNewScript] = useState(false)
const [showNewObj, setShowNewObj] = useState(false)

useEffect(() => {
  if (tab !== 'scripts') return
  setScriptsLoading(true)
  Promise.all([
    fetch(`/api/call-scripts?metier=${scriptsMetier}`).then(r => r.json()),
    fetch(`/api/call-objections?metier=${scriptsMetier}`).then(r => r.json()),
  ]).then(([s, o]) => {
    setScripts(s.data ?? [])
    setObjections(o.data ?? [])
    setScriptsLoading(false)
  }).catch(() => setScriptsLoading(false))
}, [tab, scriptsMetier])

async function saveScript() {
  if (!newScript.titre || !newScript.contenu) return
  const res = await fetch('/api/call-scripts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metier: scriptsMetier, ...newScript, is_default: scripts.length === 0 }),
  })
  const data = await res.json()
  if (data.success) { setScripts(p => [...p, data.data]); setNewScript({ titre: '', contenu: '' }); setShowNewScript(false) }
}

async function deleteScript(id: string) {
  const res = await fetch(`/api/call-scripts/${id}`, { method: 'DELETE' })
  const data = await res.json()
  if (data.success) setScripts(p => p.filter(s => s.id !== id))
  else alert(data.error)
}

async function setDefaultScript(id: string) {
  await fetch(`/api/call-scripts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_default: true }),
  })
  setScripts(p => p.map(s => ({ ...s, is_default: s.id === id })))
}

async function saveObjection() {
  if (!newObj.question || !newObj.reponse) return
  const res = await fetch('/api/call-objections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metier: scriptsMetier, ...newObj, ordre: objections.length }),
  })
  const data = await res.json()
  if (data.success) { setObjections(p => [...p, data.data]); setNewObj({ question: '', reponse: '' }); setShowNewObj(false) }
}

async function deleteObjection(id: string) {
  await fetch(`/api/call-objections/${id}`, { method: 'DELETE' })
  setObjections(p => p.filter(o => o.id !== id))
}
```

- [ ] **Step 4 : Ajouter le rendu de l'onglet scripts dans le JSX**

Après le dernier bloc `{tab === 'triggers' && (...)}`, ajouter :

```typescript
{tab === 'scripts' && (
  <div>
    {/* Sélecteur de métier */}
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, display: 'block', marginBottom: 6 }}>Métier</label>
      <select
        value={scriptsMetier}
        onChange={e => setScriptsMetier(e.target.value)}
        style={{ padding: '7px 10px', background: C.surface1, border: `1px solid ${C.line}`, borderRadius: 6, color: C.textHi, fontSize: 10, fontFamily: 'JetBrains Mono,monospace' }}
      >
        {METIERS_LIST.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
    </div>

    {scriptsLoading ? (
      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo }}>Chargement...</div>
    ) : (
      <>
        {/* Scripts */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, color: C.textHi }}>Scripts d'appel</div>
            <button onClick={() => setShowNewScript(s => !s)} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '4px 10px', borderRadius: 5, background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, color: C.indigo, cursor: 'pointer' }}>
              + Nouveau script
            </button>
          </div>

          {showNewScript && (
            <div style={{ background: C.surface1, borderRadius: 8, padding: 12, border: `1px solid ${C.lineSoft}`, marginBottom: 10 }}>
              <input
                placeholder="Titre du script"
                value={newScript.titre}
                onChange={e => setNewScript(p => ({ ...p, titre: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 5, color: C.textHi, fontSize: 10, fontFamily: 'JetBrains Mono,monospace', marginBottom: 8, boxSizing: 'border-box' }}
              />
              <textarea
                placeholder="Contenu du script..."
                value={newScript.contenu}
                onChange={e => setNewScript(p => ({ ...p, contenu: e.target.value }))}
                rows={5}
                style={{ width: '100%', padding: '7px 10px', background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 5, color: C.textHi, fontSize: 10, fontFamily: 'JetBrains Mono,monospace', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <button onClick={saveScript} style={{ marginTop: 8, padding: '6px 14px', borderRadius: 5, background: '#0a1f0a', border: `1px solid ${C.green}40`, color: C.green, fontFamily: 'JetBrains Mono,monospace', fontSize: 9, cursor: 'pointer' }}>
                Enregistrer
              </button>
            </div>
          )}

          {scripts.map(s => (
            <div key={s.id} style={{ background: C.surface1, borderRadius: 7, padding: '10px 12px', marginBottom: 6, border: `1px solid ${s.is_default ? C.gold + '40' : C.lineSoft}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, color: C.textHi, fontWeight: 500 }}>
                  {s.titre}
                  {s.is_default && <span style={{ marginLeft: 8, fontSize: 7, color: C.gold, border: `1px solid ${C.gold}40`, borderRadius: 4, padding: '1px 5px', fontFamily: 'JetBrains Mono,monospace' }}>ACTIF</span>}
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  {!s.is_default && (
                    <button onClick={() => setDefaultScript(s.id)} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, padding: '3px 7px', borderRadius: 4, background: '#1a1400', border: `1px solid ${C.gold}40`, color: C.gold, cursor: 'pointer' }}>
                      Activer
                    </button>
                  )}
                  <button onClick={() => deleteScript(s.id)} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, padding: '3px 7px', borderRadius: 4, background: '#1a0d0d', border: `1px solid #ff647040`, color: '#ff6470', cursor: 'pointer' }}>
                    Suppr.
                  </button>
                </div>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {s.contenu.slice(0, 200)}{s.contenu.length > 200 ? '...' : ''}
              </div>
            </div>
          ))}
          {scripts.length === 0 && <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, fontStyle: 'italic' }}>Aucun script pour ce métier</div>}
        </div>

        {/* Objections */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, color: C.textHi }}>Objections & Réponses</div>
            <button onClick={() => setShowNewObj(s => !s)} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, padding: '4px 10px', borderRadius: 5, background: `${C.cyan}15`, border: `1px solid ${C.cyan}40`, color: C.cyan, cursor: 'pointer' }}>
              + Nouvelle objection
            </button>
          </div>

          {showNewObj && (
            <div style={{ background: C.surface1, borderRadius: 8, padding: 12, border: `1px solid ${C.lineSoft}`, marginBottom: 10 }}>
              <input
                placeholder="L'objection du prospect..."
                value={newObj.question}
                onChange={e => setNewObj(p => ({ ...p, question: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 5, color: C.textHi, fontSize: 10, fontFamily: 'JetBrains Mono,monospace', marginBottom: 8, boxSizing: 'border-box' }}
              />
              <textarea
                placeholder="Votre réponse type..."
                value={newObj.reponse}
                onChange={e => setNewObj(p => ({ ...p, reponse: e.target.value }))}
                rows={3}
                style={{ width: '100%', padding: '7px 10px', background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 5, color: C.textHi, fontSize: 10, fontFamily: 'JetBrains Mono,monospace', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <button onClick={saveObjection} style={{ marginTop: 8, padding: '6px 14px', borderRadius: 5, background: '#0a1f1a', border: `1px solid ${C.cyan}40`, color: C.cyan, fontFamily: 'JetBrains Mono,monospace', fontSize: 9, cursor: 'pointer' }}>
                Enregistrer
              </button>
            </div>
          )}

          {objections.map(o => (
            <div key={o.id} style={{ background: C.surface1, borderRadius: 7, padding: '8px 12px', marginBottom: 6, border: `1px solid ${C.lineSoft}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.cyan, fontWeight: 600, marginBottom: 3 }}>❓ {o.question}</div>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textMid, lineHeight: 1.5 }}>💬 {o.reponse}</div>
                </div>
                <button onClick={() => deleteObjection(o.id)} style={{ marginLeft: 10, fontFamily: 'JetBrains Mono,monospace', fontSize: 7, padding: '3px 7px', borderRadius: 4, background: '#1a0d0d', border: `1px solid #ff647040`, color: '#ff6470', cursor: 'pointer', flexShrink: 0 }}>
                  ✕
                </button>
              </div>
            </div>
          ))}
          {objections.length === 0 && <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, fontStyle: 'italic' }}>Aucune objection pour ce métier</div>}
        </div>
      </>
    )}
  </div>
)}
```

---

## Task 14 : Build final et déploiement

**Files:** aucun nouveau fichier

- [ ] **Step 1 : Build production**

```powershell
cd C:\Users\Ted\Documents\GitHub\TedScaleWithOuss
npm run build
```
Attendu : aucune erreur TypeScript ni warning bloquant.

- [ ] **Step 2 : Test local**

```powershell
npm run dev
```

Scénario de test complet :
1. Aller sur `/settings` → onglet "📞 Scripts" → créer un script "Médecin généraliste" + 2 objections
2. Aller sur `/prospection/tns` → rechercher "medecin_generaliste" + "Paris"
3. Cocher 5 contacts → cliquer "🚀 Session d'appels (5)" → vérifier le modal
4. Cliquer "Lancer la session" → vérifier redirect vers `/today`
5. Sur Today → vérifier le panneau CRM avec liste gauche + fiche droite + script + objections
6. Changer le statut de 3 contacts → vérifier persistance (rafraîchir la page)
7. Appuyer "called_at" sur 10 contacts → vérifier l'apparition du BilanModal

- [ ] **Step 3 : Déploiement Cloud Run**

```powershell
.\deploy-cloudrun.ps1 -ProjectId integration-make-365608
```

---

## Auto-review du plan vs spec

### Couverture spec

| Requirement spec | Task |
|-----------------|------|
| 4 tables Supabase + RLS | Task 1 |
| API call-scripts CRUD | Task 2 |
| API call-objections CRUD | Task 3 |
| API calling-sessions POST (snapshot contacts) | Task 4 |
| API calling-sessions GET détail | Task 4 |
| API calling-sessions PUT statut | Task 4 |
| API contacts PUT | Task 4 |
| API bilan POST | Task 4 |
| API IA improve-script | Task 5 |
| Modal création session depuis TNS | Tasks 6-7 |
| Checkboxes sélection contacts | Task 7 |
| Panneau CRM Today (liste + fiche) | Tasks 8-9-11 |
| Script accordéon dans fiche | Task 9 |
| Objections accordéon dans fiche | Task 9 |
| Bilan modal tous les 10 appels | Task 10-11 |
| Remplacement 3 sections hardcodées Today | Task 12 |
| Settings Scripts CRUD | Task 13 |
| Settings Objections CRUD | Task 13 |
| Redirect vers Today après création session | Task 7 |
| Persistence sessions across days | Task 4 (statut active) + Task 11 (chargement) |

### Onglet Settings IA & Bilans

Le spec mentionne un onglet "IA & Bilans" dans Settings avec historique + bouton d'amélioration. Ce scope n'est pas inclus dans ce plan pour garder l'implémentation testable en une session. À traiter dans un plan séparé après validation de la V1.
