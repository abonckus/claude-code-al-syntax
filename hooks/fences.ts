// Splits a reply's markdown into prose and closed ```al fences. An unclosed fence
// (a reply still streaming) stays prose until its closing line arrives.
export type Part = { kind: 'md'; text: string } | { kind: 'al'; code: string }

const OPEN = /^\s*(```|~~~)\s*al\s*$/i

export const split = (text: string): Part[] => {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const out: Part[] = []
  let prose: string[] = []
  const flush = () => {
    if (prose.join('').trim()) out.push({ kind: 'md', text: prose.join('\n') })
    prose = []
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const open = OPEN.exec(line)
    const close = open && lines.findIndex((l, j) => j > i && new RegExp(`^\\s*${open[1]}\\s*$`).test(l))
    if (!open || close === null || close < 0) {
      prose.push(line)
      continue
    }
    flush()
    out.push({ kind: 'al', code: lines.slice(i + 1, close).join('\n') })
    i = close
  }
  flush()
  return out
}

export const hasAl = (parts: readonly Part[]) => parts.some(p => p.kind === 'al')
