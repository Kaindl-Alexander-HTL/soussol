import test from 'node:test'
import assert from 'node:assert/strict'

import { publicSiteUrl } from '../lib/public-site-url.ts'

test('uses and normalizes the configured production origin', () => {
  assert.equal(
    publicSiteUrl('https://www.soussol-archive.com/', 'http://localhost:3000'),
    'https://www.soussol-archive.com',
  )
})

test('falls back to the browser origin when configuration is missing', () => {
  assert.equal(publicSiteUrl(undefined, 'http://localhost:3000/'), 'http://localhost:3000')
})

test('rejects unsafe configured protocols and invalid URLs', () => {
  assert.equal(publicSiteUrl('javascript:alert(1)', 'http://localhost:3000'), 'http://localhost:3000')
  assert.equal(publicSiteUrl('not a url', 'http://localhost:3000'), 'http://localhost:3000')
})
