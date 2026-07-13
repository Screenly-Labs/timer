// Browser entry. esbuild bundles this (inlining ./timer) into a self-contained
// classic script with no exports, so it loads from a plain <script>. Keep it
// export-free and free of top-level await.

// Side-effect import: installs the replaceChildren shim for the older-browser
// degraded mode. Must stay first so the shim is in place before any render.
import './polyfills'

import { computeState, pad2, parseTarget } from './timer'

// Shown when the page is opened with no settings (e.g. the store preview or a
// bare visit), so the clock is never blank and demonstrates the format. Real
// deployments carry the target in the launch URL's query string.
const EXAMPLE = 'title=New+Year&target=2027-01-01T00:00:00&tz=UTC&message=Happy+New+Year!'

const text = (id: string, value: string): void => {
  const el = document.getElementById(id)
  if (el) el.textContent = value
}

// Reveal an element only when it has content; otherwise take it out of the flow.
const setLine = (id: string, value: string): void => {
  const el = document.getElementById(id)
  if (!el) return
  el.textContent = value
  el.hidden = value.length === 0
}

// Human-readable target datetime for the sub-line, rendered in the chosen zone.
const formatTarget = (targetMs: number, tz: string): string => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: tz || undefined
    }).format(new Date(targetMs))
  } catch {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short' }).format(
      new Date(targetMs)
    )
  }
}

const params = new URLSearchParams(window.location.search || `?${EXAMPLE}`)
const title = params.get('title')?.trim() || 'Countdown'
const tz = params.get('tz')?.trim() || ''
const message = params.get('message')?.trim() || ''
const targetMs = parseTarget(params.get('target') ?? '', tz)
// The formatted target is constant; only its "Until / Since" prefix changes when
// the clock crosses zero, so format it once and re-prefix each tick.
const targetLabel = targetMs === null ? '' : formatTarget(targetMs, tz)

document.title = title === 'Countdown' ? 'Timer' : `${title} | Timer`

// Paint one frame from the current clock. Returns nothing — it's called on a
// timer. When the target can't be parsed we show a dashed placeholder and stop.
const paint = (): void => {
  if (targetMs === null) {
    for (const id of ['days', 'hours', 'minutes', 'seconds']) text(id, '--')
    return
  }
  const { direction, parts, reached } = computeState(targetMs, Date.now())
  text('days', String(parts.days))
  text('hours', pad2(parts.hours))
  text('minutes', pad2(parts.minutes))
  text('seconds', pad2(parts.seconds))
  document.documentElement.dataset.direction = direction
  // The "days" field drops its label plural for exactly one day.
  text('days-label', parts.days === 1 ? 'Day' : 'Days')
  // Re-prefix the target line for the current direction.
  setLine('target-line', reached ? `Since ${targetLabel}` : `Until ${targetLabel}`)
  // Message only appears once the target has been reached (count-up).
  setLine('message', reached ? message : '')
}

// Align ticks to the wall-clock second so the seconds field flips crisply rather
// than drifting a few hundred ms after each interval.
const scheduleTick = (): void => {
  paint()
  const delay = 1000 - (Date.now() % 1000)
  window.setTimeout(scheduleTick, delay)
}

const render = (): void => {
  text('title', title)
  document.documentElement.dataset.state = targetMs === null ? 'invalid' : 'ready'
  if (targetMs === null) {
    setLine('target-line', 'Set a target date to start the timer.')
  }
  setLine('message', '')
  // paint() fills the target line and digits for a valid target and keeps them
  // ticking; for an invalid one it just shows the dashed placeholder.
  scheduleTick()
}

// On a Screenly player the viewer is already a Screenly customer, so the
// promotional Screenly badge is removed. The 'screenly-viewer' token in the user
// agent marks these devices; every other browser keeps the badge.
const removeScreenlyBranding = (): void => {
  if (navigator.userAgent.includes('screenly-viewer')) {
    document.querySelector('.brand')?.remove()
  }
}

const init = (): void => {
  removeScreenlyBranding()
  render()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
