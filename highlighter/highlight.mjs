// AL tree-sitter highlighter: reads AL source on stdin, writes a JSON array of
// [text, capture | null] spans to stdout. Run by the al-syntax mod through node.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Parser, Language, Query } from './vendor/web-tree-sitter.mjs'

const here = (f) => fileURLToPath(new URL(f, import.meta.url))
const src = readFileSync(0, 'utf8')

await Parser.init({ locateFile: () => here('./vendor/web-tree-sitter.wasm') })
const lang = await Language.load(readFileSync(here('./grammar/tree-sitter-al.wasm')))
const parser = new Parser()
parser.setLanguage(lang)
const query = new Query(lang, readFileSync(here('./grammar/highlights.scm'), 'utf8'))

// The grammar only parses whole objects, so a snippet of members or statements
// is mostly ERROR nodes. Retry it inside a stub object and keep the cleanest parse.
const wrappers = [
  ['', ''],
  ['codeunit 0 _ {\n', '\n}'],
  // the empty statement closes a snippet that ends on a dangling `then` or `else`
  ['codeunit 0 _ {\nprocedure _()\nbegin\n', '\n;\nend;\n}'],
  ['codeunit 0 _ {\n', '\nbegin\nend;\n}'],
]
// fewest characters inside ERROR nodes wins, then fewest error and missing nodes
const errors = (node, acc = { chars: 0, nodes: 0 }) => {
  if (node.type === 'ERROR' || node.isMissing) {
    acc.chars += node.endIndex - node.startIndex
    acc.nodes++
  } else for (const child of node.children) errors(child, acc)
  return acc
}
const worse = (a, b) => a.chars - b.chars || a.nodes - b.nodes
let best
for (const [pre, post] of wrappers) {
  const tree = parser.parse(pre + src + post)
  const parse = { tree, offset: pre.length, errors: errors(tree.rootNode) }
  if (!best || worse(parse.errors, best.errors) < 0) best = parse
  if (parse.errors.nodes === 0) break
}

// character index -> capture; later captures are more specific and win
const cap = new Array(src.length).fill(null)
for (const { name, node } of query.captures(best.tree.rootNode)) {
  if (name.startsWith('_') || name === 'spell' || name === 'none' || name === 'error') continue
  const from = Math.max(node.startIndex - best.offset, 0)
  const to = Math.min(node.endIndex - best.offset, src.length)
  for (let i = from; i < to; i++) cap[i] = name
}
const spans = []
for (let i = 0; i < src.length; ) {
  let j = i
  while (j < src.length && cap[j] === cap[i]) j++
  spans.push([src.slice(i, j), cap[i]])
  i = j
}
process.stdout.write(JSON.stringify(spans))
