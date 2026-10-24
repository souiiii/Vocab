# Margin

Exposure → understanding → collection → practice → retention.

Next.js App Router serves a responsive React workspace and same-origin Node API. The browser receives learning data, never database credentials or OAuth tokens. Zod validates every mutation. Imported HTML becomes plain text; canonical article text is immutable so character offsets plus quote anchors survive reopening.

PostgreSQL is the system of record: articles → annotations, learning entries → cards → reviews, questions → attempts → mistakes; lessons and settings have separate tables. Foreign keys, uniqueness constraints and transactions enforce integrity. Drizzle defines the relational schema and generates migrations. The same SQL migrations run on Neon (node-postgres) or durable local PGlite. A configured database failure never silently falls back to a different store.

Boundaries: `db.ts` owns connection/migration/transaction mechanics; `service.ts` owns learning operations; `validation.ts` owns contracts; `srs.ts` owns pure SM-2 scheduling; `importer.ts` owns restricted public URL extraction; `ai.ts` owns protected OAuth credentials and account-specific inference. UI components call a typed HTTP helper. Manual study works independently of AI.

Implementation sequence: foundations/schema → reading and anchors → collection → lessons and evidence-based comprehension → review/mistakes/analytics → explicit AI consent → exports and recovery → integration and browser verification.

Single-user, one Node process, loopback by default. Host and Origin checks protect the local API against cross-site writes and DNS rebinding. Remote hosting requires a real authentication/session layer before opening access. Neon uses certificate-validated TLS from the connection string. Local PostgreSQL and OAuth files belong to the OS user. Portable exports exclude credentials and include every learning table. Restore replaces data only after explicit confirmation, validates the entire document first, and runs transactionally.
