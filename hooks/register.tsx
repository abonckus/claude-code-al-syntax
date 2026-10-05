import type { EngineInterface, Register } from 'claude-code'

import { hasAl, split } from './fences'
import { lines } from './theme'
import type { Span } from './theme'

const MAX = 10000 // Markdown and Code element cap
const TREE_BUDGET = 80_000 // serialized characters of highlighted lines in one reply, inside the engine's 100,000

// Successes only, keyed by source: a reply redraws often while it streams.
// ponytail: module cache, lost on reload; a redraw highlights again
const cache = new Map<string, Span[]>()
let warned = false

const highlight = async ($: EngineInterface, code: string): Promise<Span[] | { error: string }> => {
  const hit = cache.get(code)
  if (hit) return hit
  try {
    const run = await $.process.run(['node', `${$.plugin.root}/highlighter/highlight.mjs`], { stdin: code, timeoutMs: 15_000 })
    if (run.exitCode !== 0) return { error: run.stderr.trim().split('\n').find(Boolean) ?? `exit ${run.exitCode}` }
    const spans = JSON.parse(run.stdout) as Span[]
    cache.set(code, spans)
    return spans
  } catch (err) {
    return { error: String(err) }
  }
}

export const register: Register = on => {
  // Redraws a reply that holds ```al fences: prose as the engine's Markdown, AL as
  // tree-sitter colours. Every other reply is left to the engine (and other mods).
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const parts = split(e.props.text)
    if (!hasAl(parts)) return next(e)
    const { Box, Text, Markdown, Code } = $.ui.resolve(e)
    let size = 0

    const block = async (code: string) => {
      const spans = await highlight($, code)
      if (!Array.isArray(spans)) {
        if (!warned) {
          warned = true
          $.ui.toast(`al-syntax: could not run the highlighter (${spans.error}). Is node on PATH?`, { timeoutMs: 8000 })
        }
        return <Code source={code.slice(0, MAX) || ' '} language="al" />
      }
      const rows = lines(spans).map(segs => (
        <Text wrap="wrap">
          {segs.length ? segs.map(s => (s.color || s.italic ? <Text color={s.color} italic={s.italic}>{s.text}</Text> : s.text)) : ' '}
        </Text>
      ))
      size += JSON.stringify(rows).length
      // Past the tree bound the engine would refuse the whole reply: draw this one plain.
      if (size > TREE_BUDGET) return <Code source={code.slice(0, MAX) || ' '} language="al" />
      return (
        <Box borderStyle="round" borderDimColor paddingX={1} flexDirection="column">
          {rows}
        </Box>
      )
    }

    const drawn = []
    for (const p of parts) drawn.push(p.kind === 'md' ? <Markdown text={p.text.slice(0, MAX)} /> : await block(p.code))
    return (
      <Box flexDirection="column" rowGap={1}>
        {drawn}
      </Box>
    )
  })
}
