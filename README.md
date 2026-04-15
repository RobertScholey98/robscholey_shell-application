# robscholey_shell-application

Shell application for [robscholey.com](https://robscholey.com). A Next.js frontend that serves as the unified entry point for all sub-applications.

## Local Development

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Runs on [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_AUTH_URL` | Auth service URL | `http://localhost:3001` |
| `NEXT_PUBLIC_SHELL_ORIGIN` | Shell origin for postMessage | `http://localhost:3000` |
