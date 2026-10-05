import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const ran = (stdout: string, exitCode = 0, stderr = '') => ({
  value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false } as never,
})

const reply = ($: Engine, text: string) =>
  $.ui.mount({ plugin: 'al-syntax', surface: 'terminal', component: 'AssistantMessage', props: { text, isFirstOfReply: true } })

test('an al fence is drawn with tree-sitter colours, prose around it as Markdown', async ($, on) => {
  on('process.run', () => ran(JSON.stringify([['codeunit', 'keyword.type'], [' 1 ', null], ['"X"', 'type.definition'], ['\n', null]])))
  const ui = await reply($, 'Look:\n```al\ncodeunit 1 "X"\n```\nDone.')
  expect((await ui.find({ type: 'Text', text: /^codeunit$/ }))?.props.color).toBe('#ff7b72')
  expect((await ui.find({ type: 'Text', text: /^"X"$/ }))?.props.color).toBe('#ffa657')
  expect(await ui.find({ type: 'Markdown', text: 'Look:' })).toBeDefined()
  expect(await ui.find({ type: 'Markdown', text: 'Done.' })).toBeDefined()
  await ui.unmount()
})

test('without node the block falls back to plain Code', async ($, on) => {
  on('process.run', () => ran('', 1, "'node' is not recognized"))
  const ui = await reply($, '```al\ncodeunit 1 "X"\n```')
  expect((await ui.find({ type: 'Code' }))?.props).toEqual({ source: 'codeunit 1 "X"', language: 'al' })
  await ui.unmount()
})

test('a reply with no al fence is left to the engine', async ($, on) => {
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine'] }) as never)
  const ui = await reply($, 'Just text\n```ts\nx\n```')
  expect(await ui.find({ type: 'Text', text: 'engine' })).toBeDefined()
  await ui.unmount()
})

