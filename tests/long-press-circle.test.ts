import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const component = readFileSync(new URL('../components/LongPressCircle.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

test('long-press control prevents mobile selection and callouts', () => {
  assert.match(component, /aria-label="Hold to apply"/)
  assert.match(component, /no-touch-selection/)
  assert.match(component, /onContextMenu=/)
  assert.match(component, /touchAction:\s*'none'/)
  assert.match(styles, /user-select:\s*none/)
  assert.match(styles, /-webkit-user-select:\s*none/)
  assert.match(styles, /-webkit-touch-callout:\s*none/)
})

test('long-press control remains pointer interactive', () => {
  const button = component.slice(component.indexOf('<button'), component.indexOf('</button>'))
  assert.doesNotMatch(button, /pointer-events-none/)
  assert.match(button, /onPointerDown=/)
  assert.match(button, /onPointerCancel=/)
})
