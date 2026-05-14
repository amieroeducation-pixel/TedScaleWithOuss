// CGP Dashboard Premium — dark gold palette (validated design)
export const C: Record<string, string> = {
  bgDeep: '#0a0a0a', bgMid: '#0f0f0f',
  surface1: '#141414', surface2: '#121212', surface3: '#1a1a1a',
  line: '#1e1e1e', lineSoft: '#1a1a1a',
  textHi: '#e8e8e8', text: '#cccccc', textMid: '#aaaaaa',
  textLo: '#444444', textVlo: '#2a2a2a',
  cyan: '#4a8ac9', indigo: '#4a8ac9', magenta: '#c96a6a',
  lime: '#4a9a5a', gold: '#c9a84c', warn: '#e9943a', green: '#4a9a5a',
  purple: '#9a7acc',
  ribbon: '#c9a84c',
}

export type ColorKey = keyof typeof C
