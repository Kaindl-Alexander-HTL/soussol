import assert from 'node:assert/strict'
import test from 'node:test'
import { findRegistrationByEmail, registrationSchema } from '../lib/registration.ts'

const EVENT_ID = '7b2c1d4e-8f9a-4b3c-9d2e-1f0a6b5c4d3e'

test('a member sign-up needs nothing but the event', () => {
  const parsed = registrationSchema.safeParse({ event_id: EVENT_ID, as_member: true })
  assert.equal(parsed.success, true)
  assert.equal(parsed.success && 'as_member' in parsed.data, true)
})

test('a member sign-up cannot smuggle in its own name or email', () => {
  const parsed = registrationSchema.safeParse({
    event_id: EVENT_ID, as_member: true, guest_name: 'Someone else', email: 'x@example.com',
  })
  assert.equal(parsed.success, false)
})

test('a guest sign-up still needs a name and one contact method', () => {
  assert.equal(registrationSchema.safeParse({ event_id: EVENT_ID, guest_name: 'Ana' }).success, false)
  const parsed = registrationSchema.safeParse({ event_id: EVENT_ID, guest_name: 'Ana', instagram_handle: '@ana' })
  assert.equal(parsed.success, true)
  assert.equal(parsed.success && !('as_member' in parsed.data) && parsed.data.instagram_handle, 'ana')
})

test('finds an existing registration by email regardless of case and spaces', () => {
  const regs = [
    { email: null, is_waitlist: false },
    { email: ' Tim@Example.com ', is_waitlist: true },
  ]
  assert.deepEqual(findRegistrationByEmail(regs, 'tim@example.com'), regs[1])
  assert.equal(findRegistrationByEmail(regs, 'other@example.com'), undefined)
})
