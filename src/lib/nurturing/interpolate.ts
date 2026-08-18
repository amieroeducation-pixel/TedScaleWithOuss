import Handlebars from 'handlebars'

/**
 * Interpolate variables in a template using Handlebars
 *
 * Supported variables:
 * - {prenom} / {Prenom} — Contact's first name
 * - {nom} / {Nom} — Contact's last name
 * - {metier} / {Metier} — Contact's job
 * - {ville} / {Ville} — Contact's city
 * - {email} — Contact's email
 * - {telephone} — Contact's phone
 *
 * @example
 * interpolateTemplate('Bonjour {prenom}, vous êtes {metier} à {ville}', contact)
 * // => "Bonjour Jean, vous êtes Chef d'entreprise à Paris"
 */
export function interpolateTemplate(template: string, data: Record<string, any>): string {
  try {
    const compiledTemplate = Handlebars.compile(template)
    return compiledTemplate(data)
  } catch (error) {
    console.error('Handlebars interpolation error:', error)
    return template
  }
}

/**
 * Prepare contact data for template interpolation
 * Extracts firstName/lastName from full_name and provides uppercase variants
 */
export function prepareContactData(contact: {
  full_name: string
  metier?: string
  ville?: string
  email?: string
  phone?: string
}): Record<string, string> {
  const [firstName = '', ...lastNameParts] = contact.full_name.split(' ')
  const lastName = lastNameParts.join(' ')

  return {
    prenom: firstName,
    Prenom: firstName.charAt(0).toUpperCase() + firstName.slice(1),
    nom: lastName,
    Nom: lastName.charAt(0).toUpperCase() + lastName.slice(1),
    metier: contact.metier || '',
    Metier: contact.metier ? contact.metier.charAt(0).toUpperCase() + contact.metier.slice(1) : '',
    ville: contact.ville || '',
    Ville: contact.ville ? contact.ville.charAt(0).toUpperCase() + contact.ville.slice(1) : '',
    email: contact.email || '',
    telephone: contact.phone || '',
  }
}
