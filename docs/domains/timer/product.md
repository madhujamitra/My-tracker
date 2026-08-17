# Timer & study sessions

## Task / habit timers

The Timer tab logs time against sheet items via `useDayTimers` (one running timer at a time).

## Study timer

Separate countdown for focus blocks (not tied to a task row):

1. Choose duration (presets or custom 1–240 min) → **Start study timer**
2. Full-viewport clock (browser fullscreen when allowed); Esc or **End session** leaves
3. Screen Wake Lock keeps the display awake while the session is open (best-effort; unsupported browsers show a calm notice)

Proof: countdown helpers in `focus-countdown.test.js`; manually start a short session and confirm clock + wake status.
