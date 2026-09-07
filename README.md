# Support Operations Dashboard

A compact production-style Angular application created to demonstrate frontend architecture, typed service integration, reactive forms, validation, error handling, and maintainable component design.

This is a **portfolio/demo application**, not commercial or client work. Its in-memory data is fictional and resets when the browser reloads.

## Features

- Search tickets by ID, title, customer, or assignee
- Filter by status and priority, with date and priority sorting
- Paginated ticket table with loading, empty, and error states
- Routed ticket detail view
- Status updates and internal notes with confirmation messaging
- Reactive form validation and responsive desktop-first styling

## Technical stack

- Angular 22 with standalone, lazy-loaded components
- TypeScript 6, Angular Router, and Reactive Forms
- RxJS for asynchronous service operations and form event handling
- SCSS with no UI framework dependency
- Vitest through the Angular test builder
- Netlify configuration with SPA route fallback

## Architecture

The application is intentionally small. `TicketList` owns queue presentation and filter state, while `TicketDetail` owns the update forms. `TicketService` provides a typed asynchronous boundary around an in-memory data source. Its observable methods mirror the shape of REST operations, so a real `HttpClient` implementation can replace it without changing the components.

Filtering and sorting live in a pure utility, keeping the component readable and the business behavior easy to test.

## Run locally

Requires Node.js 22.22.3 or newer.

```bash
corepack enable
pnpm install
pnpm start
```

Open `http://localhost:4200`.

## Tests and production build

```bash
pnpm test --watch=false
pnpm build
```

The focused test suite covers search/filter behavior, a service update, reactive form validation, and component update behavior.

## Implementation decisions

- Standalone components and route-level lazy loading keep the structure current without adding layers.
- A service abstraction keeps network latency and error handling at the same boundary a REST API would use.
- Local in-memory updates make the demo self-contained; persistence and authentication are deliberately out of scope.
- Native form controls and restrained SCSS keep the interface accessible, fast, and easy to maintain.
- Netlify rewrites nested routes to `index.html`, so refreshing a ticket detail URL works correctly.

## What this demonstrates

Practical Angular and TypeScript work: typed domain models, feature routing, reactive forms, asynchronous state handling, derived list behavior, component-level responsive design, and focused automated tests. The scope is deliberately representative of a weekend-sized portfolio project rather than a full support platform.
