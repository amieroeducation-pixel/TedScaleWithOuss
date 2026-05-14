// Shared PSG Cosmos color palette — imported by all dashboard pages
export const C: Record<string, string> = {
  bgDeep: '#0a0e22', bgMid: '#14193d',
  surface1: '#11163a', surface2: '#1a2150', surface3: '#252e68',
  line: '#3a4690', lineSoft: '#1a2150',
  textHi: '#ffffff', text: '#d8e1ff', textMid: '#8ea0d9',
  textLo: '#5a6ba8', textVlo: '#3a4885',
  cyan: '#ff6470', indigo: '#7a92e8', magenta: '#c84048',
  lime: '#f5e8c8', gold: '#e8c878', warn: '#d8884a', green: '#4ade80',
  purple: '#b07aee',
  ribbon: 'linear-gradient(90deg,#c84048 0%,#ff6470 25%,#f5e8c8 55%,#7a92e8 80%,#5c70b8 100%)',
}

export type ColorKey = keyof typeof C
