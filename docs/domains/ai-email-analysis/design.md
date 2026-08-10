# BYOK AI email analysis — design

Status: **planned** · Product: [[product]] · Eng: [[engineering]]

Adapted for **my-task** (React + Tailwind dashboard), not Actofy Flutter.

## 1. Scope & non-goals

| In | Out |
|----|-----|
| Modules screen: AI key field + status | Redesign Modules chrome |
| Masked key input, Save / Clear | Chat / prompt playground |
| Clear empty / error / success copy | New dashboard tab |

## 2. Design context sources

| Path | Use |
|------|-----|
| `src/features/applications/ApplicationsPage.jsx` (Modules-only mode) | Layout pattern |
| `src/features/applications/GmailPanel.jsx` | Card / connect pattern to mirror |
| Existing slate/indigo Tailwind cards | Tokens via utility classes already in app |

## 3. Screen → visual map

| # | Screen | Layout | Reuse | New |
|---|--------|--------|-------|-----|
| 1 | Modules → AI analysis card | Below Google sync; same rounded-xl border as GmailPanel | GmailPanel spacing | Key input + status chip |
| 2 | Empty (no key) | Muted helper: “Optional. Improves sync classification.” Primary: Save disabled until input | — | — |
| 3 | Saved | Chip “AI on” emerald; input shows `••••` + last 4 if we store hint | — | Never echo full key back |
| 4 | Error | Rose banner: “Couldn’t save key” + Retry | GmailPanel error style | — |

## 4. Component & state specs

| Control | Spec |
|---------|------|
| API key input | `type="password"`; autocomplete off; paste allowed |
| Base URL (optional advanced) | Collapsed “Advanced”; placeholder `https://api.openai.com/v1` |
| Model (optional) | Text input default `gpt-4o-mini` |
| Save | Indigo primary; disabled when empty |
| Clear | Secondary + confirm “Remove AI key?” |
| Status chip | Off (slate) / On (emerald) / Error (rose) |

## 5. Isolated preview

N/A for Flutter. Manual review: Modules tab with mock states (off / on / error). Optional later: Story-less static HTML in `exports/` screenshots only.

## 6. Review checklist

- [ ] Key never visible in Network tab to Supabase as plaintext in browser storage
- [ ] Contrast on error/success banners
- [ ] Keyboard: tab to Save/Clear; confirm on Clear
- [ ] Mobile: card stacks; no overflow

## 7. Open questions

- Show last-4 hint after save? (ASSUMED: yes, from server `key_hint` only)
- Advanced base URL in v1? (ASSUMED: yes, collapsed)
