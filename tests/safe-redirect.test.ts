import assert from 'node:assert/strict'
import test from 'node:test'
import { safeAppRedirect } from '../lib/safe-redirect.ts'

test('allows only intended application destinations', () => {
  assert.equal(safeAppRedirect('/archive'), '/archive')
  assert.equal(safeAppRedirect('/archive/123?view=grid#photo'), '/archive/123?view=grid#photo')
  assert.equal(safeAppRedirect('/event/community-run'), '/event/community-run')
  assert.equal(safeAppRedirect('/galerie/123'), '/galerie/123')
  assert.equal(safeAppRedirect('/upcoming'), '/upcoming')
})

test('rejects external, encoded and misleading destinations', () => {
  for (const value of [
    undefined,
    'https://evil.example',
    '//evil.example/path',
    '/%2f%2fevil.example',
    '/archive\\@evil.example',
    '/admin',
    '/eventual',
  ]) {
    assert.equal(safeAppRedirect(value), '/archive')
  }
})
