import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./highlight.mjs', import.meta.url))
const highlight = (src) => JSON.parse(execFileSync(process.execPath, [script], { input: src }))
const captureOf = (spans, text) => spans.find(([t]) => t.trim() === text)?.[1]

const snippets = {
  object: 'codeunit 1 X { }',
  statements: 'if not Confirm(Question, true) then exit;\nRec.Send();',
  member: 'trigger OnInsert()\nvar\n    Q: Record "Queue Entry";\nbegin\n    Q.FindLast();\nend;',
  signature: 'internal procedure Drain(var TempEntry: Record "Queue Entry" temporary)',
}

for (const [kind, src] of Object.entries(snippets)) {
  test(`${kind} round-trips and has no error captures`, () => {
    const spans = highlight(src)
    assert.equal(spans.map(([t]) => t).join(''), src)
    assert.ok(!spans.some(([, c]) => c === 'error'))
  })
}

test('statement fragments get keyword and call captures', () => {
  const spans = highlight(snippets.statements)
  assert.equal(captureOf(spans, 'if'), 'keyword.control')
  assert.equal(captureOf(spans, 'Confirm'), 'function.call')
})

test('a bare procedure signature is highlighted', () => {
  const spans = highlight(snippets.signature)
  assert.equal(captureOf(spans, 'Drain'), 'function.definition')
  assert.equal(captureOf(spans, 'Record'), 'type.builtin')
})
