import { expect, test } from 'claude-code/testing'

import { lines, style } from './theme'

test('captures fall back to their parent name, unknown ones stay plain', () => {
  expect(style('keyword.control')).toEqual({ color: '#ff7b72' })
  expect(style('function.definition')).toEqual({ color: '#d2a8ff' })
  expect(style('variable')).toEqual({})
  expect(style(null)).toEqual({})
})

test('spans split into lines, newlines inside a span included', () => {
  const out = lines([['begin', 'keyword.control'], ['\n  x', null], ['/*a\nb*/', 'comment.block'], ['\n', null]])
  expect(out.map(l => l.map(s => s.text).join(''))).toEqual(['begin', '  x/*a', 'b*/'])
  expect(out[2]?.[0]).toEqual({ text: 'b*/', color: '#8b949e', italic: true })
})
