'use client'

import { useState, useMemo } from 'react'
import { C } from '@/lib/theme'
import { LinkButton, LinkBadge, LinkChip, buildHref } from '@/lib/cross-links'

type ProductId = 'av' | 'per' | 'ct' | 'capi' | 'tontine'

interface Product {
  id: ProductId
  name: string
  rate: number
  taxAdvantage: number
  commissionRate: number
  accent: string
  description: string
}

const PRODUCTS: Product[] = [
  { id: 'av', name: 'Assurance Vie', rate: 4.2, taxAdvantage: 0.30, commissionRate: 0.035, accent: C.cyan, description: "Enveloppe fiscale long terme · Abattement 4 600€/9 200€ après 8 ans" },
  { id: 'per', name: 'PER Madelin', rate: 4.8, taxAdvantage: 0.41, commissionRate: 0.04, accent: C.indigo, description: "Retraite déductible · Déduction IR jusqu'à 10% du revenu imposable" },
  { id: 'ct', name: 'Compte-Titres', rate: 6.1, taxAdvantage: 0.00, commissionRate: 0.025, accent: C.gold, description: 'Investissement boursier · PFU 30% sur les gains' },
  { id: 'capi', name: 'Capitalisation', rate: 3.8, taxAdvantage: 0.25, commissionRate: 0.03, accent: C.green, description: 'Contrat de capitalisation · Transmission patrimoniale optimisée' },
  { id: 'tontine', name: 'Tontine', rate: 3.5, taxAdvantage: 0.20, commissionRate: 0.025, accent: '#b07aee', description: 'Association tontinière · Avantage transmission unique en France' },
]

const YEARS = [1, 5, 10, 15, 20]

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' €'
}

function Panel({ children, accent = C.indigo }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: `linear-gradient(180deg,${C.surface1},${C.bgMid})`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${accent}88,transparent)` }} />
      {children}
    </div>
  )
}

function PanelTitle({ title, accent = C.indigo }: { title: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <span style={{ width: 6, height: 6, background: accent, transform: 'rotate(45deg)', display: 'inline-block', boxShadow: `0 0 7px ${accent}`, flexShrink: 0 }} />
      <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 500, color: C.textHi, textTransform: 'uppercase', letterSpacing: '0.16em' }}>{title}</span>
    </div>
  )
}

function SliderInput({ label, min, max, step, value, onChange, accent, isMoney }: {
  label: string; min: number; max: number; step: number; value: number;
  onChange: (v: number) => void; accent: string; isMoney?: boolean
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid }}>{label}</span>
        <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, color: accent }}>{isMoney ? fmt(value) : `${value} ans`}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: accent, cursor: 'pointer', height: 3 }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textVlo }}>{isMoney ? fmt(min) : `${min} an`}</span>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textVlo }}>{isMoney ? fmt(max) : `${max} ans`}</span>
      </div>
    </div>
  )
}

export default function SimulatorPage() {
  const [selectedProduct, setSelectedProduct] = useState<ProductId>('per')
  const [montant, setMontant] = useState(50000)
  const [duree, setDuree] = useState(20)
  const [profession, setProfession] = useState('Médecin généraliste')
  const [revenu, setRevenu] = useState('85 000 €')
  const [tranche, setTranche] = useState('30%')
  const [patrimoine, setPatrimoine] = useState('245 000 €')
  const [age, setAge] = useState('42')

  const product = PRODUCTS.find(p => p.id === selectedProduct)!

  const results = useMemo(() => {
    const r = product.rate / 100
    const capitalFinal = montant * Math.pow(1 + r, duree)
    const interets = capitalFinal - montant
    const avantageFiscal = montant * product.taxAdvantage
    const commission = montant * product.commissionRate
    const projections = YEARS.map(y => {
      const cap = montant * Math.pow(1 + r, y)
      return { year: y, capital: cap, interets: cap - montant }
    })
    return { capitalFinal, interets, avantageFiscal, commission, projections }
  }, [montant, duree, product])

  const maxProj = Math.max(...results.projections.map(p => p.capital))

  const inputStyle: React.CSSProperties = {
    background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 6,
    color: C.textHi, fontFamily: 'JetBrains Mono,monospace', fontSize: 10,
    padding: '7px 10px', width: '100%', outline: 'none',
  }

  return (
    <>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap')"}</style>

      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 3, height: 24, background: C.ribbon, borderRadius: 2 }} />
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 22, fontWeight: 600, color: C.textHi, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Simulateur <span style={{ color: C.gold }}>Patrimonial</span>
          </div>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textLo, marginTop: 2, paddingLeft: 13 }}>
          Calcul de projection · Hors frais de gestion annuels
        </div>
      </div>

      {/* Liens transversaux après header */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
        <LinkChip href="/crm" label="CRM" color="gold" />
        <LinkChip href="/commerce" label="Outils commerce" color="indigo" />
        <LinkChip href="/scoring" label="Scoring" color="cyan" />
      </div>

      {/* Prospect data */}
      <Panel accent={C.indigo}>
        <PanelTitle title="Simulateur patrimonial — Données du prospect" accent={C.indigo} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
          {[
            { label: 'Profession', value: profession, onChange: setProfession },
            { label: 'Revenu annuel', value: revenu, onChange: setRevenu },
            { label: 'Tranche fiscale', value: tranche, onChange: setTranche },
            { label: 'Patrimoine', value: patrimoine, onChange: setPatrimoine },
            { label: 'Âge', value: age, onChange: setAge },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{f.label}</div>
              <input value={f.value} onChange={e => f.onChange(e.target.value)} style={inputStyle} />
            </div>
          ))}
        </div>
      </Panel>

      {/* Quick results from prospect data */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: `${C.gold}12`, border: `1px solid ${C.gold}40`, borderRadius: 10, padding: '14px 18px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 28, fontWeight: 700, color: C.gold }}>3 210 €</div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid, marginTop: 4 }}>Économie fiscale annuelle via PER Madelin</div>
        </div>
        <div style={{ background: `${C.green}12`, border: `1px solid ${C.green}40`, borderRadius: 10, padding: '14px 18px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 28, fontWeight: 700, color: C.green }}>+ 268 000 €</div>
          <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid, marginTop: 4 }}>Capital constitué à horizon retraite (23 ans)</div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button onClick={() => {
          const doc = `
PRÉ-ÉTUDE PATRIMONIALE
══════════════════════════════════════

Client: ${profession}
Revenu annuel: ${revenu}
Tranche fiscale: ${tranche}
Patrimoine estimé: ${patrimoine}
Âge: ${age} ans

PRODUIT RECOMMANDÉ: ${product.name}
${product.description}

SIMULATION
─────────────────────────────────────
Montant investi: ${fmt(montant)}
Durée: ${duree} ans
Taux de rendement: ${product.rate}%

RÉSULTATS
─────────────────────────────────────
Capital final: ${fmt(results.capitalFinal)}
Intérêts générés: ${fmt(results.interets)}
Avantage fiscal: ${fmt(results.avantageFiscal)}
Commission conseiller: ${fmt(results.commission)}

PROJECTIONS
─────────────────────────────────────
${results.projections.map(p => `Année ${p.year}: ${fmt(p.capital)} (+${fmt(p.interets)})`).join('\n')}

─────────────────────────────────────
Document généré le ${new Date().toLocaleDateString('fr-FR')}
Ted — Conseiller en Gestion de Patrimoine
          `.trim()
          const blob = new Blob([doc], { type: 'text/plain;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `pre-etude-${profession.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.txt`
          a.click()
          URL.revokeObjectURL(url)
        }} style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 500, padding: '8px 20px', borderRadius: 20, background: C.gold, color: C.bgDeep, border: 'none', cursor: 'pointer', letterSpacing: '0.08em' }}>
          Générer la pré-étude PDF
        </button>
      </div>

      {/* Product selector */}
      <Panel accent={C.indigo}>
        <PanelTitle title="Sélection du Produit" accent={C.indigo} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
          {PRODUCTS.map(p => {
            const active = selectedProduct === p.id
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProduct(p.id)}
                style={{
                  padding: '12px 8px', borderRadius: 9, cursor: 'pointer',
                  background: active ? `${p.accent}15` : C.surface2,
                  border: `1.5px solid ${active ? p.accent : C.line}`,
                  boxShadow: active ? `0 0 12px ${p.accent}30` : 'none',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 10, fontWeight: 500, color: active ? p.accent : C.textMid, letterSpacing: '0.04em', marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: active ? C.textHi : C.textLo, fontWeight: 600 }}>{p.rate}% / an</div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textVlo, marginTop: 4, lineHeight: 1.4 }}>{p.description}</div>
              </button>
            )
          })}
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Parameters */}
        <Panel accent={product.accent}>
          <PanelTitle title="Paramètres" accent={product.accent} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SliderInput label="Montant versé initial" min={5000} max={500000} step={5000} value={montant} onChange={setMontant} accent={product.accent} isMoney />
            <SliderInput label="Durée de placement" min={1} max={30} step={1} value={duree} onChange={setDuree} accent={product.accent} />
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid }}>Taux de rendement</span>
                <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, color: C.textLo }}>{product.rate}% / an</span>
              </div>
              <div style={{ height: 3, background: C.surface3, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(product.rate / 8) * 100}%`, background: product.accent, borderRadius: 2 }} />
              </div>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textVlo, marginTop: 4 }}>Taux défini par le produit · lecture seule</div>
            </div>
          </div>
        </Panel>

        {/* Results */}
        <Panel accent={product.accent}>
          <PanelTitle title="Résultats de Projection" accent={product.accent} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Capital final estimé', val: fmt(results.capitalFinal), accent: product.accent, big: true },
              { label: 'Intérêts générés', val: fmt(results.interets), accent: C.green, big: false },
              { label: 'Avantage fiscal estimé', val: fmt(results.avantageFiscal), accent: C.gold, big: false },
              { label: 'Commission CGP estimée', val: fmt(results.commission), accent: C.indigo, big: false },
            ].map(r => (
              <div key={r.label} style={{ background: `${r.accent}10`, border: `1px solid ${r.accent}30`, borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 9, color: C.textMid }}>{r.label}</span>
                <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: r.big ? 22 : 16, fontWeight: 500, color: r.accent }}>{r.val}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontFamily: 'JetBrains Mono,monospace', fontSize: 7, color: C.textVlo, lineHeight: 1.5 }}>
            Simulation indicative · {product.name} · {product.rate}%/an sur {duree} ans<br />
            Résultats non contractuels. Hors frais de gestion, inflation et fiscalité réelle.
          </div>
        </Panel>
      </div>

      {/* Projection table */}
      <Panel accent={product.accent}>
        <PanelTitle title={`Tableau de Projection · ${product.name}`} accent={product.accent} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Année', 'Capital cumulé', 'Intérêts générés', '% de gain', 'Progression'].map(h => (
                  <th key={h} style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 8, color: C.textLo, textAlign: 'left', padding: '6px 10px', borderBottom: `1px solid ${C.lineSoft}`, fontWeight: 400, letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.projections.map(p => {
                const pct = Math.round((p.interets / montant) * 100)
                const barW = Math.round((p.capital / maxProj) * 100)
                return (
                  <tr key={p.year} style={{ borderBottom: `1px solid ${C.lineSoft}30` }}>
                    <td style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, color: product.accent, padding: '8px 10px', fontWeight: 500 }}>An {p.year}</td>
                    <td style={{ fontFamily: 'Oswald,sans-serif', fontSize: 14, color: C.textHi, padding: '8px 10px' }}>{fmt(p.capital)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.green, padding: '8px 10px' }}>+{fmt(p.interets)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: C.gold, padding: '8px 10px' }}>+{pct}%</td>
                    <td style={{ padding: '8px 10px', minWidth: 100 }}>
                      <div style={{ height: 4, background: C.surface3, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${barW}%`, background: `linear-gradient(90deg,${product.accent},${C.indigo})`, borderRadius: 2, transition: 'width 0.4s' }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}
