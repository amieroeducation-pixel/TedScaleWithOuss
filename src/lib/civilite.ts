const PRENOMS_FEMININS = new Set([
  'adele','adeline','agnes','agathe','aimee','albane','alexandra','alexia','alice',
  'aline','amandine','ambre','amelie','anais','andrea','andree','angelique','anne',
  'annette','annie','antoinette','ariane','arielle','arlette','armelle','audrey',
  'aurelie','aurore','axelle','beatrice','benedicte','berenice','bernadette',
  'berthe','brigitte','camille','capucine','carine','carla','carmen','caroline',
  'cassandra','catherine','cecile','celeste','celia','celine','chantal','charlotte',
  'chloe','christelle','christiane','christine','claire','clara','claude','claudine',
  'clemence','clementine','clothilde','colette','constance','coralie','corinne',
  'cyrielle','danielle','delphine','denise','diane','dominique','doriane','dorothee',
  'edith','elaine','elea','elena','eliane','elise','elisabeth','elodie','eloise',
  'emeline','emilie','emma','emmanuelle','estelle','esther','eugenie','eva','eve',
  'evelyne','fabienne','fanny','fatima','fleur','flora','florence','france','francine',
  'francoise','frederique','gabrielle','gaelle','genevieve','georgette','geraldine',
  'germaine','ghislaine','ginette','gisele','giulia','gwenaelle','harriet','helene',
  'henriette','hermine','huguette','ines','ingrid','irene','iris','isabelle','jacqueline',
  'jade','janine','jeanne','jeannette','jocelyne','joelle','josette','josiane',
  'juliette','julie','justine','karine','laetitia','laura','laure','laurence','lea',
  'leonie','liliane','lina','lisa','lise','lorraine','lou','luce','lucie','lucienne',
  'lucile','ludivine','lydie','madeleine','magali','manon','margaux','margot',
  'marguerite','marianne','marie','marina','marine','marion','marjorie','marlene',
  'marthe','martine','mathilde','maude','mauricette','megane','melanie','melissa',
  'michele','mireille','monique','morgane','muriel','mylene','nadia','nadine',
  'natacha','nathalie','nicole','nina','noemie','nora','oceane','odette','odile',
  'olivia','ophelie','pascale','patricia','paulette','pauline','penelope','perrine',
  'pierrette','priscilla','rachel','raphaelle','raymonde','rebecca','regine','reine',
  'renee','rita','roberte','rolande','romane','rosalie','rose','roseline','roxane',
  'sabine','sabrina','salome','sandra','sandrine','sarah','severine','simone',
  'sofia','solange','solene','sophie','stephanie','suzanne','sylviane','sylvie',
  'tatiana','therese','valentine','valerie','vanessa','veronique','victoire',
  'victoria','violette','virginie','viviane','yasmine','yvette','yvonne','zoe',
])

export function detectCivilite(fullName: string, profession?: string): string {
  const prof = (profession || '').toLowerCase()
  if (prof.includes('médecin') || prof.includes('medecin') || prof.includes('dentiste') ||
      prof.includes('chirurgien') || prof.includes('docteur') || prof.includes('radiologue') ||
      prof.includes('cardiologue') || prof.includes('ophtalmologue') || prof.includes('neurologue') ||
      prof.includes('dermatologue') || prof.includes('gynécologue') || prof.includes('gynecologue') ||
      prof.includes('pediatre') || prof.includes('pédiatre') || prof.includes('anesthésiste') ||
      prof.includes('anesthesiste') || prof.includes('psychiatre')) {
    return 'Docteur'
  }

  const prenom = fullName.trim().split(/\s+/)[0]?.toLowerCase()
    .normalize('NFD').replace(/\p{Mn}/gu, '') || ''

  if (PRENOMS_FEMININS.has(prenom)) return 'Madame'
  return 'Monsieur'
}
