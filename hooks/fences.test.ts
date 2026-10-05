import { expect, test } from 'claude-code/testing'

import { hasAl, split } from './fences'

test('splits prose and closed al fences, any case, CRLF too', () => {
  const parts = split('Intro\r\n```AL\r\ncodeunit 1 X {}\r\n```\r\nAfter\n```ts\nconst x = 1\n```')
  expect(parts).toEqual([
    { kind: 'md', text: 'Intro' },
    { kind: 'al', code: 'codeunit 1 X {}' },
    { kind: 'md', text: 'After\n```ts\nconst x = 1\n```' },
  ])
  expect(hasAl(parts)).toBe(true)
})

test('an unclosed fence, a reply still streaming, stays prose', () => {
  const parts = split('Here:\n```al\ncodeunit 1 X')
  expect(parts).toEqual([{ kind: 'md', text: 'Here:\n```al\ncodeunit 1 X' }])
  expect(hasAl(parts)).toBe(false)
})

test('a tilde fence closes only on tildes', () => {
  expect(split('~~~al\na\n```\nb\n~~~')).toEqual([{ kind: 'al', code: 'a\n```\nb' }])
})
