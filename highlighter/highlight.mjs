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
const tree = parser.parse(src)
const query = new Query(lang, readFileSync(here('./grammar/highlights.scm'), 'utf8'))

// character index -> capture; later captures are more specific and win
const cap = new Array(src.length).fill(null)
for (const { name, node } of query.captures(tree.rootNode)) {
  if (name.startsWith('_') || name === 'spell' || name === 'none') continue
  for (let i = node.startIndex; i < node.endIndex; i++) cap[i] = name
}
const spans = []
for (let i = 0; i < src.length; ) {
  let j = i
  while (j < src.length && cap[j] === cap[i]) j++
  spans.push([src.slice(i, j), cap[i]])
  i = j
}
process.stdout.write(JSON.stringify(spans))
