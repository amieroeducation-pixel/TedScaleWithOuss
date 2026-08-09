import Handlebars from 'handlebars'

export interface Contact {
  full_name: string
  phone: string | null
  email: string | null
  pipeline_stage?: string
  profession?: string | null
  city?: string | null
}

export interface TemplateData extends Contact {
  prenom: string
  nom: string
  nom_famille: string
  telephone: string
  email: string
  stade: string
  profession: string
  ville: string
  metier: string
  heure?: string
  montant?: string
  date?: string
}

/**
 * Prépare les données du contact pour interpolation Handlebars
 */
function prepareTemplateData(
  contact: Contact,
  extra?: {
    profession?: string | null
    city?: string | null
    heure?: string | null
    montant?: string | null
    date?: string | null
  }
): TemplateData {
  const parts = contact.full_name.split(' ')
  const prenom = parts.length > 1 ? parts[0] : contact.full_name
  const nom = parts.length > 1 ? parts.slice(1).join(' ') : contact.full_name

  return {
    ...contact,
    prenom,
    nom,
    nom_famille: nom,
    telephone: contact.phone ?? '',
    email: contact.email ?? '',
    stade: contact.pipeline_stage ?? '',
    profession: extra?.profession ?? contact.profession ?? '',
    ville: extra?.city ?? contact.city ?? '',
    metier: extra?.profession ?? contact.profession ?? '',
    heure: extra?.heure ?? '',
    montant: extra?.montant ?? '',
    date: extra?.date ?? '',
  }
}

/**
 * Interpole un template avec les données du contact via Handlebars
 *
 * Variables supportées : {{prenom}}, {{nom}}, {{metier}}, {{ville}}, {{date}}, etc.
 *
 * Exemple :
 * ```
 * interpolateTemplate(
 *   "Bonjour {{prenom}}, en tant que {{metier}}...",
 *   { full_name: "Jean Dupont", profession: "CGP", ... }
 * )
 * // => "Bonjour Jean, en tant que CGP..."
 * ```
 */
export function interpolateTemplate(
  template: string,
  contact: Contact,
  extra?: {
    profession?: string | null
    city?: string | null
    heure?: string | null
    montant?: string | null
    date?: string | null
  }
): string {
  try {
    const data = prepareTemplateData(contact, extra)
    const compiled = Handlebars.compile(template)
    return compiled(data)
  } catch (error) {
    console.error('Erreur interpolation Handlebars:', error)
    // Fallback : retourner le template brut
    return template
  }
}

/**
 * Enregistre des helpers Handlebars personnalisés
 */
export function registerCustomHelpers() {
  // Helper pour formater une date
  Handlebars.registerHelper('formatDate', function (dateStr: string) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  })

  // Helper pour mettre en majuscule
  Handlebars.registerHelper('uppercase', function (str: string) {
    return str ? str.toUpperCase() : ''
  })

  // Helper pour mettre la première lettre en majuscule
  Handlebars.registerHelper('capitalize', function (str: string) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ''
  })

  // Helper conditionnel
  Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
    // @ts-ignore
    return arg1 === arg2 ? options.fn(this) : options.inverse(this)
  })
}

// Enregistrer les helpers au chargement du module
registerCustomHelpers()
