# BYOK AI email analysis — engineering

Status: **Phase 2 shipped (code)** · Product: [[product]] · Design: [[design]]

## Call

Store the user’s LLM key **server-side only** (encrypted); Edge Function decrypts at sync time and classifies mail; no key in `meta` / localStorage.

## Why

- Browser storage of API keys leaks via XSS and extensions.
- Sync already runs in Edge Functions with Gmail tokens.
- Heuristic fallback keeps sync working if AI fails or key missing.

## Risk

- Wrong decrypt / lost `AI_KEY_ENCRYPTION_SECRET` → all keys unreadable (Clear + re-paste).
- LLM cost billed to user; rate limits → fall back to heuristics, surface sync warning.
- Prompt injection via email body → constrain JSON schema output; never execute tool calls.

## Privacy contract (tested)

| Fact | Guarantee |
|------|-----------|
| API key in browser after Save | No — only `key_hint`; field cleared; no `localStorage` |
| `user_ai_settings.ciphertext` via PostgREST | No — RLS on, zero policies for `authenticated` |
| Sync / status JSON | No `apiKey` / `ciphertext` / Gmail tokens (`src/aiPrivacy.test.js`) |
| What goes to LLM | **Only** `subject`, `snippet`, `from` to the **user’s** `base_url` (BYOK). Not full MIME, not OAuth tokens, not a hosted my-task model |
| Data loss on AI fail | Sync skips that message / falls back to rules; does not delete applications |

## Data

### `public.user_ai_settings` (service_role write for ciphertext; user select status only)

| Column | Type | Notes |
|--------|------|--------|
| user_id | uuid PK | auth.users |
| ciphertext | text | encrypted API key |
| key_hint | text | last 4 chars only |
| base_url | text | default OpenAI |
| model | text | default gpt-4o-mini |
| enabled | bool | default true when key set |
| updated_at | timestamptz | |

RLS: user can `select` `key_hint, base_url, model, enabled, updated_at` only — **not** ciphertext. Inserts/updates via Edge Functions with service role after verifying JWT.

## Functions

| Fn | Role |
|----|------|
| `ai-key-save` | JWT → encrypt → upsert |
| `ai-key-clear` | JWT → delete row |
| `ai-key-status` | JWT → hint + enabled (no secret) |
| `gmail-sync` | Heuristic first; if miss + key present → LLM JSON (max 15/sync); 401/403/429 disables AI for rest of run |

### LLM classify (`_shared/llmClassify.js`)

- Decrypt via `AI_KEY_ENCRYPTION_SECRET`
- `POST {base_url}/chat/completions` with `response_format: json_object`
- Kinds: `new_application` \| `status_update` \| `interview_event` \| `needs_reply` \| `ignore`
- Statuses include `offer`
- Parse mirrored in `src/lib/llmClassifyParse.js` (unit tests)

### Sync summary extras

`ai_enabled`, `ai_calls`, `ai_hits`, `ai_errors`, `offers`

## Client

| Path | Change |
|------|--------|
| `AiKeyPanel` | Modules UI |
| `GmailPanel` | Shows AI hit/error counts in sync message |
| `src/lib/aiKey.js` | invoke save/clear/status |

## Env (Edge secrets)

```text
AI_KEY_ENCRYPTION_SECRET=...
```

User’s OpenAI key is **not** a project secret.

## Slice order

1. Schema + save/clear/status — **done**
2. Sync optional LLM classify when key present — **done**
3. UI polish + costs/rate-limit copy — light copy in Phase 2; expand in Phase 3
