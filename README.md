# robscholey_shell-application

The shell front-end for [robscholey.com](https://robscholey.com). Acts as an authenticated launcher that embeds independent sub-applications in iframes and manages a bidirectional postMessage bridge via `@robscholey/shell-kit`.

## Stack

- **Next.js 16** (App Router, Webpack mode)
- **Tailwind CSS v4** with custom theme tokens
- **Vaul** for mobile-friendly bottom sheet drawers
- **Sonner** for toast notifications
- **Vitest** + jsdom for tests

## Getting started

```bash
# Install dependencies
pnpm install

# Start auth service + shell in dev mode (from workspace root)
./scripts/dev.sh

# Or start in production mode (for mobile testing)
./scripts/start.sh
```

The shell runs on `http://localhost:3000` and expects the auth microservice on `http://localhost:3001`.

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_AUTH_URL` | Auth service URL | `http://localhost:3001` |
| `NEXT_PUBLIC_SHELL_ORIGIN` | Shell origin for postMessage | `http://localhost:3000` |

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start dev server on port 3000 |
| `pnpm build` | Production build (uses `--webpack` flag) |
| `pnpm start` | Serve production build |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Lint with ESLint |
| `pnpm format` | Format with Prettier |

## Architecture

```
src/
  app/
    page.tsx              # Homepage: lock screen (unauth) / app launcher (auth)
    [...slug]/            # Catch-all route for sub-app iframe pages
      page.tsx            # Parses slug + sub-path, renders AppFrame
      layout.tsx          # Server-side per-app metadata (title, OG tags)
    layout.tsx            # Root layout: fonts, PWA config, Providers wrapper
  components/
    AppFrame.tsx          # Full-viewport iframe + postMessage bridge
    AppNav.tsx            # Tappable app list for authenticated users
    CodeInput.tsx         # Access code entry form
    OwnerLogin.tsx        # Secret owner login drawer
    Providers.tsx         # SessionProvider + Toaster
    icons.tsx             # GitHub/LinkedIn SVG icons
  contexts/
    SessionContext.tsx     # Auth state: session token, JWT, user, apps
  lib/
    authClient.ts         # HTTP client for the auth microservice
    types.ts              # Shared TypeScript interfaces
  content/
    homepage.ts           # Separated content for the homepage
  middleware.ts           # Edge middleware: route protection + intended destination
```

## Key concepts

- **Session management**: Session token stored in a cookie (`rs_session`), JWT held in memory only. JWT auto-refreshes 5 minutes before expiry.
- **PostMessage bridge**: Shell sends `shell-context` (user, JWT, theme, sub-path) to iframe on load. Listens for `navigate-to-shell`, `request-jwt-refresh`, `route-change`, and `theme-change` from child apps.
- **Route sync**: Sub-app route changes are mirrored in the shell URL via `pushState`. Browser back/forward sends `navigate-to-path` to the iframe.
- **Middleware**: Checks session cookie existence server-side to prevent flash of content on protected routes. Preserves intended destination via `?next=` param.
- **Shell-kit dependency**: Linked locally via `pnpm link`. The shell transpiles it via `transpilePackages` since shell-kit exports raw TypeScript source.
