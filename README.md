# Margin

A personal English immersion workspace built around **exposure → understanding → collection → practice → retention**. Next.js, strict TypeScript, Tailwind, PostgreSQL, Drizzle migrations and Zod. Runs on your Mac, bound to `127.0.0.1`. Core learning requires no AI account or paid API.

## Run locally

Requires Node.js 22.13+ (verified with 22.23.3) and npm.

```sh
cd /Users/shahid/Documents/code/repos/Vocab
npm ci
cp .env.example .env.local
npm run dev
```

Open **http://127.0.0.1:3000**. Development and production servers bind to loopback. The default database is real PostgreSQL via PGlite, persisted in `.local/postgres`. It is automatically migrated and seeded on first use. No database credentials are necessary to start.

For daily use, production mode is faster:

```sh
npm run build
npm start
```

Stop the development server before starting production on the same port. Run one application process per local database directory. This checkout uses the supported webpack compiler because Turbopack's compiler subprocess could not bind its internal port in the development sandbox.

## What is implemented

- A responsive, typography-led dashboard, reading room and collection; light, sepia and dark preferences persist.
- Text import and restricted public URL extraction with a preview before saving. Metadata, categories, progress and finished status. Reader size, width, line spacing and font controls.
- Passage highlights, notes and vocabulary saved from selections. Article text is immutable after import; UTF-16 character offsets and exact quotations anchor highlights even when text repeats or selections overlap. Reopening and reloading preserve them.
- Vocabulary, multiword expressions, grammar rules and constructions, including source/context, meaning, register, pronunciation notes, collocations, related forms, personal examples, synonyms/antonyms and tags. Search, filter, edit, duplicate prevention, merging and deletion. Merging preserves review history.
- Twelve substantive grammar topics, original examples and 24 scored exercises. Completion requires answering each exercise correctly. Progress and mistakes persist.
- A sentence laboratory with six structured manual analysis fields. Save named constructions to generate identification and rewriting review cards.
- Seven starter comprehension questions linked to the original attention essay, covering factual understanding, main idea, inference, tone, assumptions, reasoning and summary. Create your own questions with answer keys, explanations and exact source evidence. Written responses use explicit self-assessment; they are not included in objective accuracy.
- Unified spaced review across four entry kinds and six recall formats. Word/meaning, reverse recall, contextual cloze and original sentences; grammar identification and rewriting. Due, overdue, upcoming and difficult cards; saved response history and optimistic concurrency protection.
- A mistake notebook separating objectively incorrect responses from subjective writing improvements, with topic counts and revisit status. Writing reflections can also be entered manually.
- Actual learning metrics: finished reading, collection size, grammar completion, comprehension accuracy by question type, review success and history. Starter material creates no fabricated performance history.
- Portable JSON export/transactional restore, PostgreSQL migrations and documented independent backups.
- An opt-in official Sign in with ChatGPT backend, account-specific model discovery and streamed Responses inference. Vocabulary suggestions, comparisons, sentence analysis, explanations, question drafts, feedback and practice are available after eligible authorization. All remain optional.

The three reading essays and all lesson/exercise material are original starter content. _1984_ is not bundled; paste passages from your own permitted copy.

## Connect Neon

1. Create your own Neon project on the Free plan. Do not enable a paid upgrade for this app.
2. In the Neon console choose **Connect**, select your database/role, and copy the PostgreSQL connection string. Use a pooled connection for the app. Keep TLS parameters provided by Neon.
3. Before switching an existing local workspace, export it from **Settings → Export all learning data**.
4. Put the connection string into `.env.local` (never a `NEXT_PUBLIC_` variable):

   ```dotenv
   DATABASE_URL=postgresql://YOUR_ROLE:YOUR_PASSWORD@YOUR_POOLED_HOST/YOUR_DATABASE?sslmode=require
   ```

5. Stop the app, run `npm run db:migrate`, and restart. The application applies outstanding migrations itself as well. Your first visit seeds the empty database.
6. Restore the exported JSON from Settings if moving existing learning history. Verify counts and a recent review before deleting the local copy.

A configured database failure displays an error; the app never silently switches to local storage. Removing `DATABASE_URL` and restarting selects the separate local database again. No Neon project or credentials were provisioned during implementation, so live Neon access still needs your own configuration and verification. See [Neon's connection guide](https://neon.com/docs/connect/connect-from-any-app).

Environment variables (all backend only):

| Variable         | Default           | Purpose                                                                        |
| ---------------- | ----------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`   | unset             | Neon or another PostgreSQL connection string. Unset selects durable PGlite.    |
| `LOCAL_DATA_DIR` | `.local/postgres` | Local PostgreSQL directory, used only when no database URL is configured.      |
| `AI_DATA_DIR`    | `.local/ai`       | Protected OAuth registrations, host ID, credentials and operational usage log. |

## Optional ChatGPT Plus connection

Current official documentation describes ChatGPT-plan usage for eligible open-source/local applications. It is distinct from ordinary identity-only website sign-in. Eligibility, workspace policy, model availability and app usage limits are enforced by OpenAI; a Plus subscription by itself is not a guarantee that an individual request is admitted.

1. Use **http://127.0.0.1:3000**, rather than `localhost`, to satisfy the documented loopback callback contract.
2. Open **Settings & connections**, read the explanation, and check the explicit authorization checkbox.
3. Select **Continue with ChatGPT**. The backend starts a fresh PKCE/OIDC flow and redirects you to OpenAI to approve the permissions.
4. After the callback, check the selected account and plan permission. AI panels load only the models returned for that account. Choose a model and explicitly initiate a request.
5. To reconnect an existing registration use **Reauthorize**. Add another account with **Continue with ChatGPT**. Settings lets you choose among connected registrations.
6. Disconnect in Settings to attempt refresh-token revocation and erase local tokens. If remote revocation cannot be confirmed, disconnect Margin in ChatGPT Settings too.

There is no client secret or partner API key in the documented local dynamic-registration flow. The backend persists a per-host opaque ID, checks one-time browser-bound state and PKCE, verifies the ID-token signature/issuer/audience/expiry/nonce with `jose`, checks granted plan scopes, and serializes refreshes of rotating tokens. Credential files are written atomically with owner-only `0600` permissions in an owner-only directory, excluded from Git and learning exports. They are protected by OS permissions rather than application-layer encryption; use FileVault for protection at rest.

Inference uses only `https://api.openai.com/v1/responses`, with `store:false`, `stream:true` and models from the account's catalog. Completion is accepted only after `response.completed`. Question outputs are validated with Zod; answer options/keys and exact source quotations must pass validation before they can be saved. AI grammar and writing interpretations are explicitly fallible. Saving suggestions requires user review. The usage log labels completed calls `chatgpt-plan`. No API-key billing fallback exists, and no account was connected on your behalf.

Live OAuth and inference have **not** been verified with your account. Connection is intentionally disabled until you give consent. Expired/revoked sessions, declined consent, missing scopes, interrupted streams and usage-limit responses are surfaced as errors while manual learning continues.

Official references checked for this implementation:

- [Quickstart](https://developers.openai.com/siwc/quickstart)
- [Local/open-source plan usage](https://developers.openai.com/siwc/token-sharing-open-source)
- [Registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
- [Accounts, refresh and revocation](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)
- [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [Errors and recovery](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery)

## A daily workflow

Import something interesting in the reading room. Select a word or sentence and choose **Highlight**, **Collect** or **Analyse**. Add your own meaning and an example worth using. Try a grammar topic or a source-linked comprehension question. Return to **Daily review** when the material is due. Use the mistake notebook to notice recurring patterns without turning writing preferences into objective errors.

Keyboard: **⌘/Ctrl K** focuses collection search; Enter opens the search results. In review, **Space** reveals a card and **1–4** grade Again/Hard/Good/Easy when focus is outside a text field. **Escape** closes dialogs, with focus trapped inside and returned when closed. Select reader text with the mouse or keyboard to show the selection toolbar.

### Scheduling

`src/lib/srs.ts` implements the [published SuperMemo SM-2 interval and ease recurrence](https://www.super-memory.com/english/ol/sm2.htm), with explicit product choices: initial ease 2.5, minimum 1.3; quality 0–5 accepted; first two successful intervals 1 and 6 days, later intervals rounded upward from previous interval × previous ease. Quality below 3 resets consecutive successes and schedules one day later; ease is adjusted using the quality formula on each recorded rating. The UI maps Again/Hard/Good/Easy to 1/3/4/5. This is the daily scheduling portion of SM-2, without its original same-session drill-until-correct loop. All due times are ISO UTC instants, advanced by elapsed 24-hour days. Session display dates use your device locale/timezone. Retention is recorded recall success, not an estimate of your whole vocabulary.

## Backup and recovery

Export JSON regularly from Settings; retain at least one encrypted/off-device copy. This includes all eleven learning tables and excludes database passwords, OAuth credentials and operational AI logs. Each export is versioned. Restore validates the entire payload and quote anchors, then replaces learning tables in one database transaction. A failed restore rolls back. Export before restoring; the UI requires typing `REPLACE`.

For a local-only installation, an additional filesystem backup is possible: stop the app, copy `.local/postgres` to your backup medium, and restart. Restore a directory copy only while the app is stopped. Never run two processes against the same PGlite directory. Use JSON export to move between PGlite and Neon.

### Independent PostgreSQL backup

Install PostgreSQL client tools compatible with your database version. Obtain a **direct, unpooled** connection from Neon for administrative backups. Use a private `~/.pg_service.conf` service named `margin_backup` and a `0600` `~/.pgpass` file (or a password prompt); do not put a password in a shell command or commit either file. The service should specify host, database, user and TLS parameters from Neon.

```sh
umask 077
mkdir -p backups
pg_dump --dbname='service=margin_backup' --format=custom --no-owner --no-acl --file="backups/margin-$(date +%Y-%m-%d).dump"
pg_restore --list backups/margin-YYYY-MM-DD.dump
```

Copy the dump to encrypted/off-device storage. A successful command is only a first check; periodically test restoration into a **separate empty database**. Configure another private service named `margin_restore_test` pointing to that isolated database:

```sh
pg_restore --dbname='service=margin_restore_test' --no-owner --no-acl --exit-on-error --single-transaction backups/margin-YYYY-MM-DD.dump
psql --dbname='service=margin_restore_test' --command='SELECT count(*) FROM entries; SELECT count(*) FROM reviews; SELECT count(*) FROM annotations;'
```

Connect a separate app process to the restored database and check article highlights, a completed lesson and review history. For actual recovery, stop the app, restore into a new empty database, verify it, then change `DATABASE_URL` and restart. Keep the original database until recovery is confirmed. These commands have not been run against your Neon account. [Neon's pg_dump guidance](https://neon.com/docs/manage/backup-pg-dump) explains backup considerations.

## Validation

Verified locally: **63 unit/integration tests, 4 Chrome end-to-end workflows, strict type checking, production build, development startup and persistence across Node process restarts**. A live public-domain URL import also passed. `npm audit` reports zero vulnerabilities. See [the verification record](docs/VERIFICATION.md) for the evidence and external-account boundaries.

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Unit and integration tests use an isolated in-memory PostgreSQL instance. Browser tests use installed Google Chrome and a separate durable database in `.local/e2e-postgres`, serving the production build on `127.0.0.1:3001`; they never use `DATABASE_URL`. Install Chrome or change Playwright's channel to an installed Chromium. Test artifacts and screenshots live in ignored `test-results` and `.local/qa` directories.

Coverage includes import, quote anchors, duplicates, grammar completion, comprehension evidence, subjective feedback, concurrent reviews, preserved review history, merges, foreign keys, complete export/restore, rollback, database failure, local request boundaries, AI-disconnected state and stream completion/limit errors. Browser tests traverse the actual UI, reload highlights/notes, exercise lessons, create comprehension questions, complete review, export/restore, and check mobile/dark preference persistence.

## Boundaries and operational notes

- Single-user, one local Node process. Loopback binding plus strict Host/Origin checks protect the local API. There is no multi-user login, remote access or tenant isolation. Add an authenticated session and appropriate authorization, HTTPS and secret storage before remotely hosting. Local ChatGPT callback handling also requires a deliberate remote-host adaptation.
- No bypass of paywalls or access controls. URL import checks public DNS addresses, pins DNS resolution for each connection, rechecks redirects, honours conservative robots restrictions, limits time/size, rejects likely paywalls and renders extracted plain text. Restricted/JavaScript-only/unsupported pages require permitted text input. Automated checks cannot establish every publisher's licence; import material you are entitled to use.
- Article contents cannot currently be edited after import, so highlight offsets stay reliable. Reimport as a new article if the underlying text changes. Metadata is set at import. Reading progress is saved after a short scroll debounce; use Mark as finished to explicitly complete a piece.
- No built-in dictionary/audio service: pronunciation is a user-editable field or a fallible AI suggestion. No microphone/speaking assessment or timed testing is included.
- Comprehension MCQ accuracy compares the chosen key; source evidence is checked for exact membership, not automatically judged for logical sufficiency. Written work uses self-assessment. Custom question editing/deletion is not yet exposed; recreate questions or restore a corrected export when necessary.
- Snapshot APIs return the personal workspace as a whole. This suits personal use; pagination and narrower APIs are future work for very large multi-year collections. Portable restore currently accepts up to 30 MB.
- Migration filenames and application versions must be retained with backups. Committed migrations are applied once using `margin_migrations`; use `npm run db:generate` after changing `src/lib/schema.ts` and review the generated SQL before use. No destructive reset command is provided.

See [the architecture notes](docs/ARCHITECTURE.md) for boundaries and design decisions.
