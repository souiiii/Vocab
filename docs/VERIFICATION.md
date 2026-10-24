# Verification record

The final local verification used Node.js 22.23.3 on macOS, real PostgreSQL via PGlite, the production Next.js build, and installed Google Chrome. Test databases are isolated from the personal workspace.

| Check                          | Result                                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`            | Passed                                                                                                                                               |
| `npm test`                     | 63 tests passed across 4 files                                                                                                                       |
| `npm run build`                | Passed with webpack                                                                                                                                  |
| `npm run test:e2e`             | All 4 Chrome workflows passed                                                                                                                        |
| `npm run db:generate`          | No pending schema changes                                                                                                                            |
| `npm audit`                    | 0 vulnerabilities, including development dependencies                                                                                                |
| Documented development startup | Started on temporary loopback port 3002; page HTTP 200 and database API verified                                                                     |
| Separate-process restart check | Entry, recalled answer, review history, interval and due date survived restarting Node                                                               |
| Live URL extraction            | Project Gutenberg's public-domain _A Modest Proposal_: title, source, all 19,292 characters and 33 paragraphs extracted; no executable HTML included |

The Chrome workflows cover:

1. Importing text, highlighting a passage, adding a note, reloading both, collecting vocabulary, completing a grammar topic, answering comprehension with source evidence, creating a question, completing a review, exporting JSON and restoring it.
2. Mobile navigation, absence of horizontal overflow, dark theme and preference persistence after reload.
3. Manual sentence analysis, saving a construction and its follow-up cards, recording a subjective writing reflection, resolving it and finding it again.
4. A recoverable database error state and a restricted URL import with the paste-text fallback still available.

Database tests use actual constraints and transactions. They cover duplicate protection, invalid quote anchors, objective versus subjective mistake records, lesson completion requirements, evidence validation, concurrent review submission, merging review histories, complete export/restore, rollback on broken references and simulated connection failure.

The OAuth and inference tests use mocked OpenAI endpoints and locally signed test JWTs. They verify explicit consent, PKCE, stable host identity, one-time state, nonce/signature validation, missing plan scopes, declined consent, returning registrations, account-specific model choices, serialized token refresh, a completed inference contract, plan-usage attribution, unavailable models and rejected invented evidence. Stream tests cover completion, truncation and usage-limit errors. No live ChatGPT credentials were read, created or reused by the development agent.

The production dependency tree is audited clean. A pinned esbuild override replaces the vulnerable transitive version in Drizzle's legacy development loader; migration generation was checked after applying it.

Not verified against external accounts: live Neon connectivity, a PostgreSQL dump/restore on the user's Neon database, and live ChatGPT OAuth/inference eligibility. Those require the user's own connection configuration or explicit in-app authorization. The README provides their setup and recovery procedures. A local test does not establish an external account's availability or admission policy.

Ignored screenshot artifacts are available in `.local/qa/` (desktop dashboard, mobile dashboard and mobile dark collection). Temporary preview servers were stopped after verification. No site was published.
