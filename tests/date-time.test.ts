import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatVienna,
  fromViennaDatetimeLocal,
  toViennaDatetimeLocal,
  viennaMonthKey,
} from '../lib/date-time.ts'

test('formats winter and summer UTC timestamps in Vienna time', () => {
  assert.equal(formatVienna('2026-01-15T17:00:00Z', 'HH:mm'), '18:00')
  assert.equal(formatVienna('2026-07-15T16:00:00Z', 'HH:mm'), '18:00')
})

test('converts Vienna datetime-local values to UTC', () => {
  assert.equal(fromViennaDatetimeLocal('2026-01-15T18:00'), '2026-01-15T17:00:00.000Z')
  assert.equal(fromViennaDatetimeLocal('2026-07-15T18:00'), '2026-07-15T16:00:00.000Z')
})

test('round-trips editor values and groups by Vienna month', () => {
  assert.equal(toViennaDatetimeLocal('2026-07-15T16:00:00Z'), '2026-07-15T18:00')
  assert.equal(viennaMonthKey('2026-06-30T22:30:00Z'), '2026-07')
})

test('rejects invalid and nonexistent Vienna local times', () => {
  assert.throws(() => fromViennaDatetimeLocal('not-a-date'))
  assert.throws(() => fromViennaDatetimeLocal('2026-03-29T02:30'))
})
