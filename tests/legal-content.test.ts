import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { LEGAL_ADDRESS, legalContactEmail } from '../lib/legal.ts'

test('uses the requested legal street address', () => {
  assert.equal(LEGAL_ADDRESS.street, 'Großambergstraße 31a')
  assert.equal(LEGAL_ADDRESS.postalCode, '4048')
  assert.equal(LEGAL_ADDRESS.city, 'Puchenau')
})

test('uses the configured SOUS SOL contact email', () => {
  assert.equal(legalContactEmail({ contact_email: '  hello@soussol.example  ' }), 'hello@soussol.example')
  assert.equal(legalContactEmail({ contact_email: '' }), null)
  assert.equal(legalContactEmail({}), null)
})

test('legal pages contain no former private contact details', () => {
  const legalSource = [
    readFileSync(new URL('../app/impressum/page.tsx', import.meta.url), 'utf8'),
    readFileSync(new URL('../app/datenschutz/page.tsx', import.meta.url), 'utf8'),
  ].join('\n')
  assert.doesNotMatch(legalSource, /tim\.tobs24@gmail\.com/i)
  assert.doesNotMatch(legalSource, /Mittelpromende/i)
})
