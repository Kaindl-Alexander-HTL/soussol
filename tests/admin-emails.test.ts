import assert from 'node:assert/strict'
import test from 'node:test'
import { adminEmails } from '../lib/admin-emails.ts'

test('combines the main admin and the extra admins, main admin first', () => {
  assert.deepEqual(adminEmails('tim@example.com', 'alex@example.com, ana@example.com'), [
    'tim@example.com', 'alex@example.com', 'ana@example.com',
  ])
})

test('drops blanks and duplicates regardless of case', () => {
  assert.deepEqual(adminEmails(' Tim@Example.com ', 'tim@example.com,, ALEX@example.com '), [
    'tim@example.com', 'alex@example.com',
  ])
})

test('returns nothing when neither variable is set', () => {
  assert.deepEqual(adminEmails(undefined, undefined), [])
})
