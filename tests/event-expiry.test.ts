import assert from 'node:assert/strict'
import test from 'node:test'
import { isEventOver } from '../lib/event-expiry.ts'

test('an event with an end time is over once the end time has passed', () => {
  const event = { starts_at: '2026-10-17T12:00:00Z', ends_at: '2026-10-17T14:00:00Z' }
  assert.equal(isEventOver(event, new Date('2026-10-17T13:59:00Z')), false)
  assert.equal(isEventOver(event, new Date('2026-10-17T14:00:00Z')), true)
})

test('an event without an end time stays up until the end of its Vienna day', () => {
  // 14:00 Vienna (CEST) on 17 Oct; the Vienna day ends at 22:00 UTC.
  const event = { starts_at: '2026-10-17T12:00:00Z', ends_at: null }
  assert.equal(isEventOver(event, new Date('2026-10-17T21:59:00Z')), false)
  assert.equal(isEventOver(event, new Date('2026-10-17T22:00:00Z')), true)
})

test('uses the Vienna day, not the UTC day, in winter time', () => {
  // 00:30 Vienna (CET) on 16 Jan is still 15 Jan in UTC; the Vienna day ends at 23:00 UTC on 16 Jan.
  const event = { starts_at: '2026-01-15T23:30:00Z', ends_at: null }
  assert.equal(isEventOver(event, new Date('2026-01-16T22:59:00Z')), false)
  assert.equal(isEventOver(event, new Date('2026-01-16T23:00:00Z')), true)
})
