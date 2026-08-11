/**
 * /__architecture — developer-only Code Navigator.
 *
 * Mounted in App.tsx ONLY inside an `import.meta.env.DEV` guard, so Vite's
 * dead-code elimination drops both the route and this chunk from production
 * builds. The data it renders comes from a `apply: 'serve'` dev-server endpoint
 * that likewise cannot exist in a build. See
 * `src/features/dev-architecture/` and `docs/dev-architecture/README.md`.
 *
 * Not linked from any product navigation — reach it by URL.
 */
import { ArchitectureExplorer } from '@/features/dev-architecture/ui/ArchitectureExplorer';

export default function ArchitecturePage() {
  return <ArchitectureExplorer />;
}
