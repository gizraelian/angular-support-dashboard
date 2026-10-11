# Full-stack Support Operations — portfolio case study

An independently developed technical demonstration, separate from employer/client experience. Positioning: **full-stack enterprise application engineering using Angular, Java/Spring Boot, PostgreSQL, security, testing, CI/CD and containerized development**. CI verification is implemented; automated public delivery of this authenticated workflow is not.

## Problem

Demonstrate a maintainable operations workflow across browser, API and database, with honest security and deployment boundaries. A fictional support-ticket interface alone does not demonstrate persistent integration or server-side authorization.

## Design

Retain fictional in-memory support tickets and add distinct API-backed fictional work orders. Angular standalone components, typed HttpClient services and reactive forms communicate through a same-origin proxy to Spring Security, Spring Boot validation/services, JPA and PostgreSQL. Small focused components and restrained SCSS avoid a framework rewrite. [Architecture](https://github.com/gizraelian/spring-work-order-api/blob/main/docs/ARCHITECTURE.md).

## Implementation

Work-order list/filter/detail, create and status update use real HTTP and PostgreSQL. Flyway owns the managed development schema. Docker Compose runs an isolated API/database; Testcontainers verifies database integration and schema lifecycle. GitHub Actions runs tests and release checks. Playwright adds reproducible real-browser acceptance using generated local-only credentials, a fresh project/database and independent PostgreSQL assertions.

## Challenges

Browser Basic authentication did not fit controlled login/logout or remove CSRF concerns. An explicitly guarded local session mode adds HttpOnly Strict cookies, fixation protection, cookie/header CSRF, token refresh, inactivity expiration and logout invalidation while preserving default Basic behavior. Tomcat inactivity expiry is minute-granularity; the E2E test waits without session traffic and checks a real 401, not a mocked clock. Mutation failures are not retried because a failed response can hide a completed server write.

## Verification and results

Read [M5 verification](M5_E2E_VERIFICATION.md) for actual run results, images and reproduction. Browser acceptance covers login, real backend validation, create, retrieval, status update, page reload/session restoration, PostgreSQL persistence, expiry, logout, blocked anonymous writes and support-ticket regression. Unit/integration security tests and release checks complement the browser suite. The project demonstrates scoped engineering judgment as well as functionality; no commercial volume or large-scale architecture is claimed.

## Reproducible interview walkthrough

1. Follow the M5 setup steps; no production configuration or operator credentials are needed. Use the generated fixture test flow to show the application.
2. Open the list screenshot: explain filters, statuses and the fictional-data boundary. Contrast tickets (in memory) with work orders (PostgreSQL).
3. Show the create form and backend field-validation result. Angular validates for usability; Spring validates independently for integrity.
4. Show detail/status success and reload. HTTP flows through the loopback proxy and Spring Security into JPA; SQL confirmation proves persistence separately from the UI.
5. Show expiry and logout: the backend rejects unauthorized writes; the UI does not auto-retry. Use the architecture image to explain orchestration, schema ownership and CI.
6. State clearly: these authenticated writes run only in an isolated local demonstration. The public dashboard/API links represent the previously published read-only components, with their own routing requirements.

## Portfolio card recommendations — proposal only

Reviewed [georgeizraelian.com](https://www.georgeizraelian.com/) on 2026-10-11. Existing cards describe Work Order API (Basic-protected API writes/live server) and Support Operations Dashboard (Angular UI) separately. Preserve their distinction from Selected Client Work, but connect them as one engineering project.

Suggested title: **Support Operations — Angular + Spring Boot**.

Suggested copy: “Independent full-stack demonstration connecting Angular reactive forms to a Java/Spring Boot API and PostgreSQL. Includes validation, filtering, local session authentication with CSRF protection, Flyway, Docker Compose, Testcontainers, Playwright browser acceptance and GitHub Actions verification.”

Suggested badges: Angular · Java 21 · Spring Boot · PostgreSQL · Spring Security · Playwright · Docker · GitHub Actions. Use the list screenshot as the card image with alt text describing fictional work orders. Add links to both source repositories, the case study, architecture and walkthrough. Label links **Public ticket demo**, **Public read-only API**, and **Local authenticated walkthrough**. Do not advertise public session login or deployment of the new backend.

## Separate public read-only deployment recommendation

The frontend calls relative `/api/work-orders`. Angular's development proxy is not included in a static release; the current Netlify configuration has only a catch-all SPA rewrite. To make the public work-order section function, separately approve a same-origin HTTPS proxy for `/api/work-orders` and `/api/work-orders/*` to the existing approved read API, placed before the SPA fallback. Alternatively, explicitly configure an HTTPS API base URL and exact read-only CORS policy; this is a larger cross-origin change. Prefer a same-origin route for this small demo.

A rewrite alone does not guarantee read-only behavior: verify allowed GET/HEAD routing and block unsafe verbs at an approved proxy/security layer. Do not proxy local-auth endpoints, propagate browser Basic credentials or expose server credentials in bundles. Review fictional-data exposure (including requesterEmail), TLS, errors, nested-route refresh and cache policy before release. Verify the actual public browser list/detail behavior after any separately approved deployment. A local success is not evidence of public routing success.

The new backend JAR must not be deployed to DigitalOcean as part of M5. Existing production Flyway adoption remains separately gated. No portfolio source change/publication, Netlify deployment, identity change or production migration is part of this milestone.

## Known limitations

Single development user; no production roles, rate limiting or identity lifecycle; local HTTP exception; process-local sessions; no idempotency keys; no commercial traffic/scale evidence; timestamps lack timezone. Chromium desktop and 390px responsive emulation cover the M5 browser demo, not a full Safari/Firefox/assistive-technology audit. Public read-only routing still requires separate approval and verification.
