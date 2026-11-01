# RAG Web

A lightweight RAG administration frontend built with Vue 3, TypeScript, Vite, Pinia, and Ant Design Vue.

## Development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3100` in a browser. In development, requests under `/api` are proxied to `http://localhost:8080`. Change the target in `.env.development` when needed.

## Production build

```bash
pnpm build
pnpm preview
```

## Project structure

- `src/api`: Backend API definitions
- `src/router`: Route configuration
- `src/stores`: Pinia state stores
- `src/utils`: Shared utilities, including the HTTP client
- `src/views`: Application pages
