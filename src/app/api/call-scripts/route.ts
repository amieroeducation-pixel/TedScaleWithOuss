import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api'

const WHATSAPP_MESSAGES = [
  {
    metier: 'kinesitherapeute',
    titre: 'Message 1 — Premier contact',
    contenu: `Bonjour [Civilité] [Nom],\n\nC'est Ted, conseiller en gestion de patrimoine.\n\nJ'accompagne des kinésithérapeutes libéraux en Île-de-France sur l'optimisation fiscale et la préparation retraite.\n\nJe vous propose un diagnostic gratuit de 20 min cette semaine pour voir si vous laissez de l'argent sur la table.\n\nDisponible ?\n\nTed`,
    is_default: true,
  },
  {
    metier: 'kinesitherapeute',
    titre: 'Message 2 — Retraite',
    contenu: `Bonjour [Civilité] [Nom],\n\nTed, CGP spécialisé TNS.\n\nVous savez combien vous toucherez à la retraite avec la CARPIMKO seule ?\n\nLa plupart découvrent que c'est autour de 1 400 €/mois...\n\nJe vous propose un diagnostic gratuit de 15 min pour voir comment optimiser.\n\nIntéressé(e) ?\n\nTed`,
    is_default: false,
  },
  {
    metier: 'kinesitherapeute',
    titre: 'Message 3 — Économies',
    contenu: `Bonjour [Civilité] [Nom],\n\nTed, CGP.\n\nJe viens de faire économiser 6 800 € à un kiné parisien sur l'année.\n\nSi vous avez un BNC entre 70K et 120K, il y a sûrement des leviers non exploités.\n\nDiagnostic gratuit de 20 min ?\n\nTed`,
    is_default: false,
  },
  {
    metier: 'dentiste',
    titre: 'Message 1 — Premier contact',
    contenu: `Bonjour [Civilité] [Nom],\n\nTed, conseiller en gestion de patrimoine.\n\nJ'accompagne des chirurgiens-dentistes sur l'optimisation fiscale.\n\nEntre le BNC, la SCM et les charges sociales, il y a souvent 5 à 8 000 € d'économies par an non exploitées.\n\nDiagnostic gratuit de 20 min ?\n\nTed`,
    is_default: true,
  },
  {
    metier: 'dentiste',
    titre: 'Message 2 — Prévoyance',
    contenu: `Bonjour [Civilité] [Nom],\n\nTed, CGP.\n\nSi vous êtes en arrêt 6 mois demain, vous toucheriez combien ?\n\nLa CARCDSF couvre mal : 90 jours de carence, 50% du revenu plafonné.\n\nÀ 12 000 €/mois, vous tombez à 2 500 €.\n\nDiagnostic gratuit de 20 min pour voir les trous ?\n\nTed`,
    is_default: false,
  },
  {
    metier: 'dentiste',
    titre: 'Message 3 — Économies',
    contenu: `Bonjour [Civilité] [Nom],\n\nTed.\n\nJe viens de faire économiser 11 200 € à un dentiste de Neuilly.\n\nSi vous avez un BNC entre 150K et 250K, il y a sûrement 8 à 12K non exploités.\n\nDiagnostic gratuit de 20 min ?\n\nTed`,
    is_default: false,
  },
  {
    metier: 'pharmacien',
    titre: 'Message 1 — Cession',
    contenu: `Bonjour [Civilité] [Nom],\n\nTed, CGP.\n\nJe travaille avec des pharmaciens titulaires sur la préparation de la cession.\n\nSi votre officine = 80% de votre patrimoine, la fiscalité peut prendre 30-40% si c'est mal préparé.\n\nDiagnostic gratuit de 20 min pour anticiper ?\n\nTed`,
    is_default: true,
  },
  {
    metier: 'pharmacien',
    titre: 'Message 2 — Diversification',
    contenu: `Bonjour [Civilité] [Nom],\n\nTed, CGP.\n\nCombien de votre patrimoine est dans l'officine ? 70% ? 80% ?\n\nLe jour de la vente, la fiscalité peut prendre 30-40%.\n\nMon diagnostic de 20 min montre comment diversifier maintenant.\n\nIntéressé(e) ?\n\nTed`,
    is_default: false,
  },
  {
    metier: 'medecin',
    titre: 'Message 1 — Prévoyance',
    contenu: `Bonjour [Civilité] [Nom],\n\nTed, CGP.\n\nJ'accompagne des médecins libéraux sur la prévoyance et l'optimisation fiscale.\n\nLa CARMF couvre mal l'arrêt de travail : 3 mois de carence, 50% du revenu max.\n\nMon diagnostic de 20 min identifie les trous.\n\nDisponible cette semaine ?\n\nTed`,
    is_default: true,
  },
  {
    metier: 'medecin',
    titre: 'Message 2 — Retraite',
    contenu: `Bonjour [Civilité] [Nom],\n\nTed, CGP.\n\nVous savez combien vous toucherez à la retraite avec la CARMF seule ?\n\nMême avec un gros BNC : max 2 500-3 000 €/mois.\n\nSi vous gagnez 10 000 € aujourd'hui, vous tombez à 3 000 € demain.\n\nDiagnostic gratuit de 15 min ?\n\nTed`,
    is_default: false,
  },
  {
    metier: 'medecin',
    titre: 'Message 3 — Économies',
    contenu: `Bonjour [Civilité] [Nom],\n\nTed.\n\nJe viens de faire économiser 13 400 € à un médecin secteur 2 parisien.\n\nVous êtes secteur 1 ou 2 ?\n\nEn secteur 2, il y a généralement 10-15K non exploités.\n\nDiagnostic de 20 min ?\n\nTed`,
    is_default: false,
  },
  {
    metier: 'infirmier',
    titre: 'Message 1 — Retraite',
    contenu: `Bonjour [Civilité] [Nom],\n\nTed, CGP.\n\nVous savez combien vous toucherez à la retraite ?\n\nLa plupart découvrent : 1 200 €/mois...\n\nVous passez de 5 000 € à 1 200 €.\n\nMon diagnostic de 15 min montre combien mettre de côté et où.\n\nDisponible ?\n\nTed`,
    is_default: true,
  },
  {
    metier: 'infirmier',
    titre: 'Message 2 — Charges',
    contenu: `Bonjour [Civilité] [Nom],\n\nTed, CGP.\n\nVous payez combien de charges par an ? 18K ? 22K ?\n\nVous payez énormément mais la retraite CARPIMKO est ridicule : 1 200 €/mois.\n\nMon diagnostic de 15 min montre comment optimiser.\n\nIntéressé(e) ?\n\nTed`,
    is_default: false,
  },
  {
    metier: 'infirmier',
    titre: 'Message 3 — Économies',
    contenu: `Bonjour [Civilité] [Nom],\n\nTed.\n\nJe travaille avec 6 IDEL en Île-de-France.\n\nMoyenne d'économies : 4 200 €/an.\n\nVous mettez combien de côté pour la retraite par mois ?\n\nDiagnostic gratuit de 15 min ?\n\nTed`,
    is_default: false,
  },
  {
    metier: 'generique',
    titre: 'Message générique',
    contenu: `Bonjour [Civilité] [Nom],\n\nTed, conseiller en gestion de patrimoine.\n\nJe travaille avec des professionnels libéraux comme vous sur la préparation retraite et l'optimisation fiscale.\n\nBilan patrimonial gratuit de 20 min cette semaine ?\n\nTed`,
    is_default: true,
  },
]

async function autoMigrateIfNeeded(supabase: any, userId: string) {
  const { data: existing } = await supabase
    .from('call_scripts')
    .select('id, contenu')
    .eq('user_id', userId)
    .limit(5)

  if (!existing || existing.length === 0) {
    for (const msg of WHATSAPP_MESSAGES) {
      await supabase.from('call_scripts').insert({ user_id: userId, ...msg })
    }
    return true
  }

  const hasOldFormat = existing.some((s: any) =>
    s.contenu?.includes('OUVERTURE') ||
    s.contenu?.includes('QUALIFICATION') ||
    s.contenu?.includes('PITCH') ||
    s.contenu?.includes('OBJECTIONS') ||
    s.contenu?.includes('CLOSING') ||
    (s.contenu?.includes('[Nom]') && !s.contenu?.includes('[Civilité]'))
  )

  if (hasOldFormat) {
    await supabase.from('call_scripts').delete().eq('user_id', userId)
    for (const msg of WHATSAPP_MESSAGES) {
      await supabase.from('call_scripts').insert({ user_id: userId, ...msg })
    }
    return true
  }

  return false
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiUnauthorized()

  await autoMigrateIfNeeded(supabase, user.id)

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
