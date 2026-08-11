# Application pipeline — design

Status: **shipped (code)** · Product: [[product]] · Eng: [[engineering]]

Adapted for **my-task** (React + Tailwind), not Actofy Flutter.

## 1. Scope & non-goals

| In | Out |
|----|-----|
| Status chip for `opportunity` | New tab / kanban board |
| Filter “Active” includes opportunity | Redesign Applications chrome |
| Amber action cue when needs reply + open mail | Separate “Opportunities” product area |
| KPI In pipeline includes opportunity | New dashboard page |

## 2. Design context sources

| Path | Use |
|------|-----|
| `ApplicationsPage.jsx` STATUS_STYLES + filters | Extend |
| `NeedsReplyNotice` / Reply chip | Action required pattern |
| Job KPI row in `App.jsx` | In pipeline count |
| Existing slate/indigo/sky badges | Match |

## 3. Screen → visual map

| # | Surface | Empty | Loading | Error | Success |
|---|---------|-------|---------|-------|---------|
| 1 | Applications table status chip | — | — | — | `Opportunity` = violet/sky distinct from Applied |
| 2 | Status filter | — | — | — | Active = opportunity + applied + interviewing (+ later stages) |
| 3 | Row + open needs-reply | — | — | — | Small amber “Reply” cue next to company or status |
| 4 | KPI In pipeline | 0 | — | — | Counts opportunity + applied + interviewing + offer |
| 4b | KPI Opportunity | 0 | — | — | Dedicated violet card; Applied today = `status=applied` only |
| 5 | Manual add/edit status select | — | — | — | Opportunity option listed first among open stages |

## 4. Component & state specs

| Control | Spec |
|---------|------|
| Opportunity chip | e.g. `bg-violet-50 text-violet-800 border-violet-200`; label “Opportunity” |
| Applied chip | Keep sky |
| Action required | Reuse needs-reply amber; do not change status color to “Needs reply” |
| Filter Active | Include `opportunity` |

Phase B chips (screening, assessment, …): same size/type scale; distinct hues — deferred.

## 5. Isolated preview

N/A — ship in live Modules/Applications; no Flutter preview route.

## 6. Review checklist

- [ ] Opportunity ≠ Applied visually at a glance  
- [ ] Reply action visible without looking like a status  
- [ ] Mobile: chips wrap; filter still usable  

## 7. Open questions

| ID | Note |
|----|------|
| D1 | Exact violet vs teal for Opportunity — pick one and stick |
