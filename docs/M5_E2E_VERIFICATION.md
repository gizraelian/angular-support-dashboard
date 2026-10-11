# M5 E2E verification and presentation

## Scope and baseline

2026-10-11: backend baseline 956b47d; frontend baseline 19d9469. M5 adds one browser framework, Playwright, alongside existing Vitest unit tests. Tests drive real Chromium and Angular HTTP against a fresh isolated Spring Boot/PostgreSQL Compose environment; no mocked Angular responses replace acceptance.

## Reproduce safely

Requires Java 21, supported Node (24 in CI), pnpm 11.19.0, Docker with Compose >=2.24.4, and free loopback ports 8080/4200. No operator .env file is read by the browser harness. Backend and frontend may be sibling checkouts; otherwise set M5_BACKEND_REPO to the reviewed backend directory.

```powershell
# Backend repository
.\mvnw.cmd clean verify
# Frontend repository
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test --watch=false
pnpm build
node scripts/verify_release.mjs
$env:M5_BACKEND_REPO = 'C:\Coding\Codex\Spring Work Order API'
pnpm e2e
```

On Linux CI, use `pnpm exec playwright install --with-deps chromium`; local Windows installation uses only Chromium, without a system-wide toolchain change. Official [Playwright web-server configuration](https://playwright.dev/docs/test-webserver) supports the Angular process lifecycle. Existing servers are never reused. The harness refuses occupied ports, creates a random project and passwords in process environment, builds a uniquely tagged local image and checks loopback API/unpublished DB bindings before browser tests.

It starts a fresh database with seed off and a 1-minute inactivity session. It stops/removes only its own containers/network and **preserves all volumes**. The printed `workorder-m5-…_postgres-data` name identifies a retained fictional fixture volume; review it before any separately authorized cleanup. It never deletes unrelated containers or existing volumes. Images are retained locally. The Angular child server is stopped by Playwright at suite exit. Do not enable DEBUG/PWDEBUG, traces, HAR, videos, storage-state export or automatic failure screenshots for authentication tests.

Curated PNGs mask username/password controls and contain only fictional records and session-state messages. No request headers, cookies, CSRF values or passwords are saved. The reporter prints test names/outcomes and redacts fixture credentials in assertion errors. The harness also scrubs generated text error-context files and rejects unexpected binary artifacts. `test-results` and Playwright reports are ignored. Inspect curated artifacts before committing.

## Acceptance coverage

| Browser behavior | Evidence |
| --- | --- |
| Fresh empty state / anonymous write | UI empty state; browser POST 401; SQL count unchanged |
| Login | Real form submit and signed-in indicator |
| Backend validation error | U+001C title accepted by existing JS whitespace validator but rejected by Java Bean Validation; actual HTTP 400; associated inline field error |
| Valid create / retrieval | Actual HTTP 201; routed detail GET |
| Status update | Actual PATCH 200; success message |
| Full reload and persistence | Session-restored message; saved fields; independent PostgreSQL row |
| Expiration | 130 seconds without session requests; PATCH 401; one attempt; SQL status unchanged |
| Re-login / logout | Actual logout 204; empty password control; disabled UI; anonymous browser PATCH 401 |
| Independent anonymous browser | New cookie-free context POST 401 |
| Existing support tickets | Search, note, status change and in-memory reset on reload |
| Mobile / keyboard | 390px list/detail/form without overflow; Tab moves title to description |

The unusual validation fixture checks the server independently without disabling client validators or mocking HTTP. It is not visible in curated valid-form screenshots. Browser tests do not log credentials or cookie values. M4C's separate HTTP security harness covers additional missing/invalid CSRF, cross-origin and session replay cases against real containers.

## Results

Final local verification on 2026-10-11:

- **2/2 Playwright real Chromium E2E tests passed**, no retries. Named [browser evidence](M5_BROWSER_EVIDENCE.json) records the real integration workflow; the second test verifies existing ticket search/notes/status/reset behavior.
- **45/45 backend Maven tests passed**, 0 failures/errors/skips, including Testcontainers PostgreSQL and security/profile regressions.
- **75/75 Angular tests passed**, production build passed (338.57 kB initial raw bundle) and release artifact gate scan passed.
- **Actual release browser at the same 127.0.0.1:4200 origin passed**: no login/password/create controls, direct create route has no form, no local-auth, mutation or external requests. [Release evidence](M5_RELEASE_EVIDENCE.json).
- Original default Basic-mode Compose harness passed credential guards, loopback/non-root startup, Flyway V1, unauthorized/invalid writes, create/status/filter contracts and SQL/API persistence across restart and container recreation.
- Source/release candidates were compared against actual ignored local passwords without printing values; token/private-key/encoding scans and diff whitespace checks passed. All 11 curated PNGs were visually reviewed and show only fictional values. Trace/video/network-storage artifacts were not created.
- Final passing browser project: `workorder-m5-bdeb3a32c182`. Its containers/network were removed; its fictional PostgreSQL volume was retained. Existing M4C and unrelated volumes were preserved.

Early harness runs found selector/response-body navigation issues; the selectors and routed-ID extraction were corrected without weakening application validation, security or acceptance assertions. The final run also asserts that a stale validation summary clears when the user corrects the form. Browser screenshots demonstrate the new compact session presentation, inline field errors, status/priority badges and mobile spacing.

The existing real-session/CSRF harness also passed with real inactivity expiry: missing/invalid login and write CSRF, incorrect credentials, session/CSRF rotation, cross-origin and Basic rejection, logout CSRF/invalidation, old-session replay rejection and SQL persistence. No-deployment-trigger review passed: both personal repository hooks are empty, workflows only verify, and the frontend Netlify build settings have null repo_url/repo_path/repo_branch/provider. Published deploy 6a9ee86155a9fc78573ababa remained unchanged.

GitHub checkpoint/CI outcomes are available in repository Actions and the final M5 completion report; pushes are permitted only after the no-deployment-trigger check.

## Presentation assets

- [Work-order list](screenshots/01-work-order-list.png)
- [Work-order details](screenshots/02-work-order-details.png)
- [Create form](screenshots/03-create-form.png)
- [Successful authenticated local workflow](screenshots/04-authenticated-workflow.png)
- [Technical architecture](screenshots/05-architecture.png)
- [Mobile list](screenshots/06-mobile-list.png), [detail](screenshots/07-mobile-details.png), [form](screenshots/08-mobile-form.png)
- [Expired session](screenshots/09-expired-session.png), [logout](screenshots/10-logout.png)

Use [the case study](PORTFOLIO_CASE_STUDY.md) for the interview narrative, website card proposal and separately gated public routing recommendation. Architecture/security live in the backend docs to avoid unnecessary duplication.

## Boundaries and stop

Resume/interview readiness is assessed separately from public production deployment. No public session deployment, production database/service testing, Netlify/DigitalOcean deployment, portfolio publication or Flyway adoption occurred. Antigravity: **0 CLI invocations, 0 model calls, 0 results**; its blocked safety wrapper was not probed or bypassed. M5 is the final planned milestone; stop afterward.

## Acceptance decision

**M5 functionality, local security verification and presentation acceptance: YES.** Ready for resume and interview presentation as an independent technical demonstration. GitHub CI is the final checkpoint verification, tracked by its exact commit in Actions. **Public authenticated production deployment readiness: NO**; the local session design is deliberately scoped to development and the production adoption/deployment gates remain closed.
