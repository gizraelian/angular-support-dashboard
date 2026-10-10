# M4A: read-only real work orders

**Follow-up:** successful real local integration is now verified in [the checkpoint report](CHECKPOINT_LIVE_VERIFICATION.md). The initial availability findings below describe the earlier M4A implementation run.

Verified on 2026-10-10. M4A source and tests are complete; successful live backend integration remains unverified because the personal Compose application is not configured/running. No backend changes, migrations, authenticated browser writes, branch creation, commits, pushes, deployment, production operations, or unrelated dependency upgrades were performed. No directory under C:\Coding\LLM was used.

## Contracts confirmed from actual backend source

Sources: WorkOrderController, WorkOrderResponse, ApiError, GlobalExceptionHandler, SecurityConfig, WorkOrderApplication and the request DTOs in the Spring Work Order API repository.

- GET `/api/work-orders`: optional `status` and `priority`, Spring Pageable `page` (zero-based), `size` (default 20). The UI explicitly requests size 10. No client filtering/pagination of downloaded records.
- GET `/api/work-orders/{id}`: Java Long ID, WorkOrderResponse; missing record returns HTTP 404 ApiError. The UI accepts positive JavaScript-safe integer IDs.
- Status: `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. Priority: `LOW`, `MEDIUM`, `HIGH`.
- WorkOrderResponse: `id`, `title`, nullable `description`, `status`, `priority`, `requesterEmail`, nullable `dueDate`, `createdAt`, `updatedAt`.
- `dueDate` is LocalDate; timestamps are LocalDateTime ISO strings without timezone. Contracts preserve strings; presentation does not append a fabricated UTC offset.
- WorkOrderApplication explicitly selects `VIA_DTO` serialization: `{ content: WorkOrderResponse[], page: { size, number, totalElements, totalPages } }`. The frontend does not depend on legacy PageImpl fields such as `first`, `last` or `pageable`.
- ApiError: `timestamp`, numeric `status`, `error`, `message`, `path`, `validationErrors` (field-to-message map). UI renders API messages as escaped text and handles empty/non-JSON proxy/security error bodies.
- Read endpoints permit anonymous GETs. Existing write endpoints require authentication. SecurityConfig is unchanged.
- Write DTOs were inspected only: Create/Update contain title (required, max 120), optional description (max 2000), required priority, required requesterEmail (email, max 254), optional dueDate; UpdateStatus contains required status. No Angular write contracts or operations were introduced.

## Architecture

Separate WorkOrderService, work-order model file, standalone list/detail components, and lazy routes `/work-orders` and `/work-orders/:id`. Existing TicketService, fixtures, ticket models, filters and feature components are unchanged. App navigation and footer explicitly distinguish fictional support tickets from API work orders.

Signals and reactive forms follow existing conventions. No NgRx, additional UI library, new dependencies or new global state abstraction. Obsolete requests are canceled when filters/route IDs change; requests are disposed when components are destroyed. Server page metadata controls navigation. Empty results retain pagination so out-of-range pages can return to earlier pages.

Loading/status and alert regions, labeled selects, native buttons, keyboard focus styles, semantic detail lists and responsive layout are included. Read failures have a manual Retry button. Automatic retry is limited to two retries for network errors (status 0), 502, 503 and 504, with 300/600 ms delay. It does not retry permanent client errors or HTTP 500 automatically. The service exposes only GET methods.

## Local integration and live verification limit

Actual compose.yaml fixes API database connectivity to `jdbc:postgresql://db:5432/workorder` with profile `dev`; PostgreSQL publishes no host port. API mapping defaults to `127.0.0.1:8080:8080`, optionally overridden by LOCAL_API_PORT. No service or networking configuration was changed.

Preflight: `docker ps`, `docker ps --all`, and `docker compose ls --all` returned no containers/projects. The personal `.env.compose.local` does not exist. An anonymous, proxy-bypassed GET to `http://127.0.0.1:8080/api/work-orders?page=0&size=1` was actively refused. No credentials were read or generated; no backend was started, seeded or modified. The prior M3 verification report is historical evidence, not a current M4A live result.

`proxy.conf.json` forwards only the work-order API path and descendants to `http://127.0.0.1:8080`. Angular serve uses the proxy and binds to `127.0.0.1`. It contains no authorization header, secret or password. If the personal Compose configuration uses a different LOCAL_API_PORT, update only the local proxy target after verifying that port.

Browser smoke checks used the actual Angular dev server: desktop/mobile (375 px) list loading and unavailable-API states, ticket navigation displaying all 12 fictional records, and direct detail-route loading/error state. Dev-server logs confirmed work-order requests were proxied to the missing backend and failed with ECONNREFUSED. These checks do not establish successful Spring/PostgreSQL integration. Successful list/detail data, filtering and pagination were tested with HttpTestingController fixtures.

To finish live read verification, manually configure/start the existing personal Compose app according to the backend `docs/DOCKER_DEVELOPMENT.md`, then:

1. Confirm its API port and loopback binding; leave the database unpublished.
2. Run Angular using a supported Node runtime and `pnpm start`.
3. Open `/work-orders`, change both filters, and navigate pages against whatever records already exist.
4. Open an existing work-order ID and verify response fields; if there are no records, only empty-list and missing-detail behavior can be checked without writing data.
5. Do not use a DigitalOcean/production endpoint, write test, or browser Basic credentials.

The development proxy is not bundled into the production build. A future deployed version needs an explicitly approved API routing/origin strategy; no hosting changes were made.

## Validation

| Check | Result |
| --- | --- |
| Full Angular test suite | PASS: 33 tests, 8 files, including unchanged ticket tests |
| Production build | PASS: initial raw bundle 280.42 kB, within configured budgets |
| Browser smoke check | PASS for desktop/mobile layout, navigation and unavailable-backend handling |
| Successful current local API GET | UNVERIFIED: personal Compose app unavailable; loopback connection refused |
| Backend preservation | PASS: status plus SHA-256 hashes of all non-ignored Git-listed files unchanged |

The initial pnpm test/build invocation selected system Node v20.11.0 and failed the CLI version gate. Tests/build passed using the already-bundled Node v24.19.0 directly. No installation or dependency change was made. With the normal shell, this repository still requires a supported Node version as described in README.

Commands used successfully (PowerShell, frontend repository):

```powershell
$nodeRuntime = 'C:\Users\abana\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $nodeRuntime node_modules/@angular/cli/bin/ng.js test --watch=false
& $nodeRuntime node_modules/@angular/cli/bin/ng.js build
& $nodeRuntime node_modules/@angular/cli/bin/ng.js serve --port 4200
```

Tests cover typed list/detail responses, nullable fields, actual VIA_DTO page structure, pagination and combined enum filters, empty response, API error DTO and non-DTO errors, bounded GET retry/success/cancellation, manual retries, stale request cancellation, invalid IDs, feature routes, and fictional ticket functionality. Mocked HTTP checks are not live API verification.

## Pre-existing backend changes (preserved)

The Angular tree was clean at preflight. The backend already had the following accumulated uncommitted changes, which remain unchanged:

```text
 M .github/workflows/test.yml
 M .gitignore
 M README.md
 M pom.xml
 M src/main/java/com/georgeizraelian/workorder/config/DemoDataConfig.java
 M src/main/resources/application.properties
?? .dockerignore
?? .env.compose.example
?? Dockerfile
?? compose.yaml
?? docs/
?? scripts/
?? src/main/java/com/georgeizraelian/workorder/config/EnvironmentSafetyConfig.java
?? src/main/resources/application-dev.properties
?? src/main/resources/application-migrated.properties
?? src/main/resources/db/
?? src/test/java/com/georgeizraelian/workorder/config/
?? src/test/java/com/georgeizraelian/workorder/integration/
?? src/test/resources/application-postgres-integration.properties
```

`m4a-backend-baseline.json` records the preflight inventory and file hashes. The hashes exclude ignored files, including local credentials and build artifacts.

## Changed Angular files

- `README.md`
- `angular.json`
- `docs/M4A_READ_ONLY_WORK_ORDERS.md`
- `docs/m4a-backend-baseline.json`
- `proxy.conf.json`
- `src/app/app.config.ts`
- `src/app/app.html`
- `src/app/app.routes.ts`
- `src/app/app.scss`
- `src/app/app.ts`
- `src/app/features/work-order-detail/work-order-detail.html`
- `src/app/features/work-order-detail/work-order-detail.spec.ts`
- `src/app/features/work-order-detail/work-order-detail.ts`
- `src/app/features/work-order-list/work-order-list.html`
- `src/app/features/work-order-list/work-order-list.spec.ts`
- `src/app/features/work-order-list/work-order-list.ts`
- `src/app/features/work-orders.scss`
- `src/app/models/work-order.ts`
- `src/app/services/work-order.service.spec.ts`
- `src/app/services/work-order.service.ts`
- `src/app/testing/work-order-fixtures.ts`
- `src/app/work-order-routing.spec.ts`

## M4B and security considerations

Remaining M4B: explicitly approved create/update/status-write UI and services, write validation/error tests, and an agreed browser authentication/authorization design. Deployment requires separate authorization.

No browser secrets, Basic authorization, bundled environment credentials, interceptors for authentication, or `withCredentials` were introduced. Existing backend Basic auth, stateless sessions, CSRF configuration and public GET policy were not altered. Before authenticated browser writes, review HTTPS, authorization scope, session/credential handling, CSRF for the chosen browser mechanism, and same-origin/CORS design. Never ship the development Basic password in static assets. The current public GET API can expose requester emails to any caller with API access; its existing policy needs deliberate review before future public exposure.

Antigravity: zero invocations and zero delegated tasks. The consultation wrapper remains blocked and was not probed or bypassed. No token-savings estimate is claimed.

Stopped at M4A. Await explicit approval for write operations or deployment.
