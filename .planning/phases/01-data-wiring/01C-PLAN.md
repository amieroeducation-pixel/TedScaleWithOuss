---
phase: 01-data-wiring
plan: 01C
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/today/signal/route.ts
  - src/app/(dashboard)/today/page.tsx
autonomous: true
requirements: [DATA-06, DATA-07]
tags: [today, weekly-signal, supabase, data-wiring]

must_haves:
  truths:
    - "L'utilisateur voit une section Weekly Signal sur /today avec les relances prioritaires des 7 prochains jours"
    - "L'utilisateur voit les RDV de la semaine courante (lundi vers dimanche) depuis la table interactions"
    - "Les sections existantes de /today (timer, compteurs, script appel) restent fonctionnelles non regressees"
  artifacts:
    - path: "src/app/api/today/signal/route.ts"
      provides: "Relances J+7 (prospects.next_action_date) + RDV semaine (interactions type rdv1/rdv2/rdv3)"
      exports: ["GET"]
    - path: "src/app/(dashboard)/today/page.tsx"
      provides: "Page /today enrichie d'une section Weekly Signal sans casser l'existant"
      contains: "fetch.*api/today/signal"
  key_links:
    - from: "src/app/(dashboard)/today/page.tsx"
      to: "/api/today/signal"
      via: "fetch in useEffect"
      pattern: "fetch.*api/today/signal"
    - from: "src/app/api/today/signal/route.ts"
      to: "prospects.next_action_date"
      via: ".gte/.lte filters"
      pattern: "next_action_date"
    - from: "src/app/api/today/signal/route.ts"
      to: "interactions"
      via: ".in('type', ['rdv1','rdv2','rdv3'])"
      pattern: "rdv1.*rdv2.*rdv3"
---

## Phase Goal

**As a** CGP independant, **I want to** voir d'un seul coup d'oeil mes relances prioritaires des 7 prochains jours et mes RDV de la semaine sur la page Today, **so that** je sais qui contacter aujourd'hui sans ouvrir d'autre outil.

<objective>
Brancher la page `/today` (Weekly Signal) sur Supabase pour DATA-06 (relances prochaines 7 jours) et DATA-07 (RDV semaine via fallback `interactions`). AJOUTER une section Weekly Signal sans casser le timer Pomodoro / compteurs / script d'appel existants (Pitfall 4 du RESEARCH).

Purpose: Donne le "signal du jour/semaine" coeur de la valeur de l'app : "savoir qui rappeler maintenant".
Output: 1 route API combinee + nouvelle section dans la page /today.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-data-wiring/01-RESEARCH.md

@src/app/api/revenue/stats/route.ts
@src/app/api/prospects/route.ts
@src/lib/supabase/server.ts
@src/lib/api.ts
@src/lib/theme.ts
@src/app/(dashboard)/today/page.tsx

<interfaces>
DB schema critique:
- prospects(id, user_id, full_name, profession, pipeline_stage, next_action_date date, lead_score int, phone, email, city)
- interactions(id, user_id, prospect_id, type enum('appel','email','whatsapp','sms','rdv1','rdv2','rdv3','linkedin','autre'), occurred_at timestamp, notes)

date-fns v4 installe. Imports utiles :
import { startOfWeek, endOfWeek, format, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'

Helpers: apiSuccess/apiError/apiUnauthorized; createSupabaseServerClient.

CRITIQUE Pitfall 4 : la page /today actuelle contient timer Pomodoro + compteurs manuels (state local React) + script d'appel. Ces sections ont leur etat propre NE PAS toucher leur JSX. Ajouter la section Weekly Signal en NOUVEAU bloc (avant ou apres l'existant).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Creer /api/today/signal relances 7j (DATA-06) + RDV semaine (DATA-07)</name>
  <files>src/app/api/today/signal/route.ts</files>
  <read_first>
    - src/app/api/revenue/stats/route.ts (pattern Route Handler)
    - .planning/phases/01-data-wiring/01-RESEARCH.md (Pattern 5 relances, Pattern 6 RDV semaine, Pitfall 5 prospect_id vs client_id)
  </read_first>
  <action>
    Creer `src/app/api/today/signal/route.ts` UNE seule route qui retourne `{ relances, rdvSemaine, todayCount, weekRdvCount }` pour minimiser les appels.

    Implementation :
    - Imports : NextRequest, createSupabaseServerClient, apiSuccess/apiError/apiUnauthorized, startOfWeek/endOfWeek/addDays/format de date-fns.
    - Auth : getUser() puis apiUnauthorized() si null.
    - Calcul dates : todayStr = format(today, 'yyyy-MM-dd'), in7daysStr = format(addDays(today, 7), 'yyyy-MM-dd'), weekStart = startOfWeek(today, { weekStartsOn: 1 }).toISOString(), weekEnd = endOfWeek(today, { weekStartsOn: 1 }).toISOString().

    Requete relances (DATA-06) :
    supabase.from('prospects').select('id, full_name, profession, pipeline_stage, next_action_date, lead_score, phone, email').eq('user_id', user.id).not('next_action_date', 'is', null).gte('next_action_date', todayStr).lte('next_action_date', in7daysStr).order('next_action_date', { ascending: true }).order('lead_score', { ascending: false })

    Mapping RelanceRow : ajouter days_until = max(0, floor((target - today) / 86400000)).

    Requete RDV (DATA-07) :
    supabase.from('interactions').select("id, type, occurred_at, notes, prospect_id, prospects(full_name, profession)").eq('user_id', user.id).in('type', ['rdv1', 'rdv2', 'rdv3']).gte('occurred_at', weekStart).lte('occurred_at', weekEnd).order('occurred_at', { ascending: true })

    Mapping RdvRow : extraire prospects (peut etre object ou array selon Supabase) via Array.isArray check ; construire day_label format "Lun 13/05 09:30" via DAY_LABELS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'].

    Types exportes : RelanceRow et RdvRow (export type).

    Retour final : apiSuccess({ relances, rdvSemaine, todayCount: relances.filter(r => r.days_until === 0).length, weekRdvCount: rdvSemaine.length }).

    Gestion erreurs : si pError ou rError -> apiError(error.message).
  </action>
  <verify>
    <automated>cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss; npx tsc --noEmit -p tsconfig.json 2>&1 | Select-String "today/signal"</automated>
  </verify>
  <acceptance_criteria>
    - File `src/app/api/today/signal/route.ts` exists
    - `grep -c "next_action_date" src/app/api/today/signal/route.ts` returns >= 2
    - `grep -c "'rdv1'" src/app/api/today/signal/route.ts` returns >= 1
    - `grep -c "startOfWeek" src/app/api/today/signal/route.ts` returns >= 1
    - `grep -c "apiUnauthorized" src/app/api/today/signal/route.ts` returns >= 1
    - `grep -c "weekStartsOn: 1" src/app/api/today/signal/route.ts` returns >= 1
    - `grep -c "days_until" src/app/api/today/signal/route.ts` returns >= 1
    - TypeScript compile sans erreur
  </acceptance_criteria>
  <done>GET `/api/today/signal` retourne `{ relances, rdvSemaine, todayCount, weekRdvCount }` filtres par user, semaine commencant le lundi.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Ajouter section Weekly Signal a /today sans casser timer/compteurs/script existants</name>
  <files>src/app/(dashboard)/today/page.tsx</files>
  <read_first>
    - src/app/(dashboard)/today/page.tsx (page actuelle ENTIERE identifier blocs existants a preserver)
    - src/lib/theme.ts
    - .planning/phases/01-data-wiring/01-RESEARCH.md (Pitfall 4 double intention)
  </read_first>
  <action>
    Modifier `src/app/(dashboard)/today/page.tsx` :

    1. La page est `'use client'`. Conserver TOUS les useState/JSX existants (timer Pomodoro, compteurs manuels, script d'appel, agenda statique eventuel).

    2. Ajouter en tete du composant 3 nouveaux states + 1 useEffect :
       - signal: SignalResp | null (initialise null)
       - signalLoading: boolean (true)
       - signalError: string | null (null)
       - useEffect [] : fetch('/api/today/signal'), parse json, si j.error setSignalError sinon setSignal(j.data), finally setSignalLoading(false).

    3. Definir types locaux :
       - RelanceRow : id, full_name, profession, pipeline_stage, next_action_date, lead_score, phone, email, days_until
       - RdvRow : id, type, occurred_at, notes, prospect_id, prospect_name, profession, day_label
       - SignalResp : relances RelanceRow[], rdvSemaine RdvRow[], todayCount, weekRdvCount

    4. Ajouter UN nouveau bloc JSX (placer en HAUT du return juste apres le header existant donne priorite visuelle) :

       Section 1 "Weekly Signal Relances 7 jours" (DATA-06) :
       - Card style C.surface1 / border C.line / borderRadius 10 / padding 14px 16px
       - Header avec titre Oswald uppercase + compteur "{signal?.todayCount ?? 0} aujourd'hui · {signal?.relances.length ?? 0} cette semaine"
       - Liste des signal.relances.slice(0, 10) :
         - Pour chaque : ligne avec nom (C.textHi 12px bold), profession (C.textLo 10px), pipeline_stage en badge, badge "AUJOURD'HUI" si days_until === 0 (C.warn) sinon "J+{days_until}" (C.gold)
         - lead_score en pastille a droite : couleur C.green si >= 70, C.gold 40-69, C.textLo < 40
       - Si > 10 relances : afficher "+ {n - 10} autres"
       - Etat vide : "Aucune relance planifiee dans les 7 prochains jours."

       Section 2 "RDV de la semaine" (DATA-07) :
       - Card style identique
       - Header "{signal?.weekRdvCount ?? 0} RDV cette semaine"
       - Liste des signal.rdvSemaine :
         - day_label (C.gold 11px), badge type (RDV1 C.indigo, RDV2 C.green, RDV3 C.gold), prospect_name (C.textHi), profession (C.textLo)
       - Etat vide : "Aucun RDV planifie cette semaine. Cree des interactions de type rdv1/rdv2/rdv3."

    5. Loading/error : afficher placeholder DISCRET DANS chaque section uniquement (pas de remplacement plein ecran ne pas masquer le timer existant).
       - Si signalLoading : div "Chargement signal..." couleur C.textLo fontSize 11
       - Si signalError : div "Erreur : {signalError}" couleur C.warn fontSize 11

    6. Reutiliser le style existant (cards C.surface1, border C.line, headers Oswald uppercase letterSpacing 1).

    7. Imports : ajouter useEffect, useState si absents ; format et fr de date-fns si formatage souhaite.

    8. NE PAS TOUCHER aux blocs existants : timer Pomodoro, compteurs manuels (appels passes / mails envoyes / etc.), script d'appel statique. Ces donnees sont conservees telles quelles pour cette phase.
  </action>
  <verify>
    <automated>cd C:/Users/Ted/Documents/GitHub/TedScaleWithOuss; npx tsc --noEmit -p tsconfig.json 2>&1 | Select-String "today/page"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "fetch.*api/today/signal" src/app/(dashboard)/today/page.tsx` returns >= 1
    - `grep -c "useState\|useEffect" src/app/(dashboard)/today/page.tsx` returns >= 2
    - `grep -ciE "weekly signal|relances" src/app/(dashboard)/today/page.tsx` returns >= 1
    - `grep -ciE "rdvSemaine|rdv" src/app/(dashboard)/today/page.tsx` returns >= 1
    - `grep -c "days_until" src/app/(dashboard)/today/page.tsx` returns >= 1
    - TypeScript compile sans erreur
    - Verification manuelle apres `npm run dev` : timer Pomodoro et compteurs existants toujours visibles et interactifs
  </acceptance_criteria>
  <done>La page /today affiche en plus de l'existant : section "Weekly Signal" avec relances 7j et section "RDV de la semaine", branchees sur /api/today/signal. Aucune regression sur le timer / compteurs / script existants.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser -> Route Handler | Cookies SSR valides via getUser() |
| Route Handler -> prospects/interactions | Filtre user_id explicite |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01C-01 | Spoofing | /api/today/signal | mitigate | getUser() + apiUnauthorized() en tete |
| T-01C-02 | Information Disclosure | prospects.phone, email (PII) | mitigate | .eq('user_id', user.id) sur prospects |
| T-01C-03 | Information Disclosure | interactions.notes (peut contenir info sensible) | mitigate | .eq('user_id', user.id) sur interactions |
| T-01C-04 | Tampering | Plan en lecture seule | accept | Pas de POST/PUT/DELETE |
</threat_model>

<verification>
- `npx tsc --noEmit` passe sans erreur
- `npm run dev` puis ouverture /today : timer/compteurs existants toujours operationnels + nouvelles sections affichees
- Network : appel `/api/today/signal` retourne 200 + JSON `{data, error: null}`
- Si DB vide : etats vides "Aucune relance..." et "Aucun RDV..." s'affichent
</verification>

<success_criteria>
- DATA-06 : Section Weekly Signal liste les prospects dont next_action_date est dans les 7 prochains jours
- DATA-07 : Section RDV de la semaine liste les interactions rdv1/rdv2/rdv3 de la semaine courante
- Aucune regression sur le timer Pomodoro, compteurs manuels ou script d'appel
</success_criteria>

<output>
Apres completion, creer `.planning/phases/01-data-wiring/01C-SUMMARY.md` listant : route creee, sections ajoutees a /today, blocs existants preserves, etat des donnees reelles vs vides.
</output>
