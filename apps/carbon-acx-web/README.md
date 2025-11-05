# Carbon ACX Web - Next.js 15 Frontend

Modern frontend for Carbon ACX built with Next.js 15, React 19, and TypeScript.

## Stack

- **Framework:** Next.js 15 (App Router)
- **React:** 19.0
- **TypeScript:** 5.7+
- **Styling:** Tailwind CSS 4
- **State Management:** TanStack Query v5 + Zustand 5
- **UI Components:** Radix UI
- **3D Visualization:** Three.js + React Three Fiber

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## Architecture

This is a complete rebuild following ACX093 Strategic Frontend Rebuild Specification.

**Key Principles:**
1. **Manifest-First UI** - Every data point shows provenance
2. **Server Components** - Fetch manifest data server-side
3. **Progressive Enhancement** - Works without JavaScript
4. **Test-Driven** - 80%+ test coverage minimum

## Phase 1: Foundation (Current)

- [x] Next.js 15 scaffold
- [ ] Core dependencies installed
- [ ] Cloudflare Pages configuration
- [ ] Manifest data layer
- [ ] API routes
- [ ] Basic layout

**Ref:** ACX093 Strategic Frontend Rebuild Specification

## Legacy Frontend

The previous Vite + React frontend has been archived to `apps/carbon-acx-web-legacy` and will be removed after successful migration.

## License

MIT
